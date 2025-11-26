const db = require('../config/database');
const logger = require('../utils/logger');
const evolutionClient = require('./evolution/client');
const TemplateEngine = require('./templateEngine');
const WarmupStrategy = require('./warmup/strategy');

/**
 * Campaign Executor Service
 * Handles automatic campaign execution and message sending
 */

class CampaignExecutor {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.processingCampaigns = new Set();
  }

  /**
   * Start the campaign executor
   */
  start() {
    if (this.isRunning) {
      logger.warn('[CampaignExecutor] Already running');
      return;
    }

    logger.info('[CampaignExecutor] Starting campaign executor...');
    this.isRunning = true;

    // Check for active campaigns every 30 seconds
    this.intervalId = setInterval(() => {
      this.processActiveCampaigns().catch(err => {
        logger.error(`[CampaignExecutor] Error in main loop: ${err.message}`);
      });
    }, 30000);

    // Run immediately on start
    this.processActiveCampaigns().catch(err => {
      logger.error(`[CampaignExecutor] Error in initial run: ${err.message}`);
    });

    logger.info('[CampaignExecutor] Campaign executor started');
  }

  /**
   * Stop the campaign executor
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('[CampaignExecutor] Stopping campaign executor...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('[CampaignExecutor] Campaign executor stopped');
  }

  /**
   * Process all active campaigns
   */
  async processActiveCampaigns() {
    try {
      // Get all running campaigns with active consultants
      const query = `
        SELECT
          c.id, c.consultant_id, c.name, c.message_template,
          c.template_id, c.total_recipients, c.sent_count,
          cons.instance_name, cons.status as consultant_status,
          cons.connected_at, cons.daily_limit
        FROM campaigns c
        INNER JOIN consultants cons ON c.consultant_id = cons.id
        WHERE c.status = 'running'
          AND cons.status = 'active'
        ORDER BY c.started_at ASC
      `;

      const result = await db.query(query);

      if (result.rows.length === 0) {
        return;
      }

      logger.info(`[CampaignExecutor] Found ${result.rows.length} active campaigns`);

      for (const campaign of result.rows) {
        // Skip if already processing this campaign
        if (this.processingCampaigns.has(campaign.id)) {
          continue;
        }

        // Process campaign in background
        this.processCampaign(campaign).catch(err => {
          logger.error(`[CampaignExecutor] Error processing campaign ${campaign.id}: ${err.message}`);
          this.processingCampaigns.delete(campaign.id);
        });
      }
    } catch (error) {
      logger.error(`[CampaignExecutor] Error in processActiveCampaigns: ${error.message}`);
    }
  }

  /**
   * Process a single campaign
   */
  async processCampaign(campaign) {
    this.processingCampaigns.add(campaign.id);

    try {
      logger.info(`[CampaignExecutor] Processing campaign ${campaign.id}: ${campaign.name}`);

      // Check warmup limits
      const warmupStatus = WarmupStrategy.getWarmupStatus(
        campaign.connected_at,
        campaign.sent_count || 0,
        campaign.daily_limit
      );

      if (warmupStatus.remaining <= 0) {
        logger.warn(`[CampaignExecutor] Campaign ${campaign.id} reached daily limit (${warmupStatus.limit})`);
        this.processingCampaigns.delete(campaign.id);
        return;
      }

      // Get pending recipients
      const recipientsQuery = `
        SELECT
          cr.id as recipient_id,
          cr.contact_id,
          c.name as contact_name,
          c.number as contact_number,
          c.segment
        FROM campaign_recipients cr
        INNER JOIN contacts c ON cr.contact_id = c.id
        WHERE cr.campaign_id = $1
          AND cr.status = 'pending'
        ORDER BY cr.created_at ASC
        LIMIT $2
      `;

      const recipientsResult = await db.query(recipientsQuery, [
        campaign.id,
        Math.min(warmupStatus.remaining, 10) // Process max 10 at a time
      ]);

      if (recipientsResult.rows.length === 0) {
        logger.info(`[CampaignExecutor] No pending recipients for campaign ${campaign.id}`);

        // Check if campaign is complete
        await this.checkCampaignCompletion(campaign.id);
        this.processingCampaigns.delete(campaign.id);
        return;
      }

      logger.info(`[CampaignExecutor] Processing ${recipientsResult.rows.length} recipients for campaign ${campaign.id}`);

      // Process each recipient
      for (const recipient of recipientsResult.rows) {
        try {
          await this.sendCampaignMessage(campaign, recipient);

          // Add delay between messages (20-40 seconds)
          const delay = Math.floor(Math.random() * (40000 - 20000 + 1)) + 20000;
          await new Promise(resolve => setTimeout(resolve, delay));
        } catch (error) {
          logger.error(`[CampaignExecutor] Error sending to recipient ${recipient.contact_id}: ${error.message}`);
        }
      }

    } finally {
      this.processingCampaigns.delete(campaign.id);
    }
  }

  /**
   * Send message to a campaign recipient
   */
  async sendCampaignMessage(campaign, recipient) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Render message with template engine
      let messageText = campaign.message_template;

      if (campaign.template_id) {
        try {
          messageText = TemplateEngine.render(campaign.message_template, {
            name: recipient.contact_name,
            segment: recipient.segment,
            date: new Date().toLocaleDateString('tr-TR')
          });
        } catch (renderError) {
          logger.warn(`[CampaignExecutor] Template render failed: ${renderError.message}`);
        }
      }

      // Create message record
      const insertQuery = `
        INSERT INTO messages (campaign_id, contact_id, message_text, status)
        VALUES ($1, $2, $3, 'pending')
        RETURNING id
      `;

      const messageResult = await client.query(insertQuery, [
        campaign.id,
        recipient.contact_id,
        messageText
      ]);

      const messageId = messageResult.rows[0].id;

      // Send via Evolution API
      try {
        // Send typing indicator
        await evolutionClient.sendTyping(campaign.instance_name, recipient.contact_number, 3000);

        // Wait for typing to finish
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Send actual message
        const sendResult = await evolutionClient.sendTextMessage(
          campaign.instance_name,
          recipient.contact_number,
          messageText
        );

        // Update message status
        await client.query(`
          UPDATE messages
          SET status = 'sent', sent_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [messageId]);

        // Update recipient status
        await client.query(`
          UPDATE campaign_recipients
          SET status = 'sent', sent_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [recipient.recipient_id]);

        // Update campaign counters
        await client.query(`
          UPDATE campaigns
          SET sent_count = sent_count + 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [campaign.id]);

        await client.query('COMMIT');

        logger.info(`[CampaignExecutor] Message sent successfully: Campaign ${campaign.id} -> Contact ${recipient.contact_id}`);

      } catch (sendError) {
        // Update message with error
        await client.query(`
          UPDATE messages
          SET status = 'failed', error_message = $1
          WHERE id = $2
        `, [sendError.message, messageId]);

        // Update recipient status
        await client.query(`
          UPDATE campaign_recipients
          SET status = 'failed', error_message = $1
          WHERE id = $2
        `, [sendError.message, recipient.recipient_id]);

        // Update campaign failed count
        await client.query(`
          UPDATE campaigns
          SET failed_count = failed_count + 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [campaign.id]);

        await client.query('COMMIT');

        throw sendError;
      }

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if campaign is completed
   */
  async checkCampaignCompletion(campaignId) {
    try {
      const query = `
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
          COUNT(*) as total_count
        FROM campaign_recipients
        WHERE campaign_id = $1
      `;

      const result = await db.query(query, [campaignId]);
      const { pending_count, total_count } = result.rows[0];

      if (parseInt(pending_count) === 0 && parseInt(total_count) > 0) {
        await db.query(`
          UPDATE campaigns
          SET status = 'completed', completed_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [campaignId]);

        logger.info(`[CampaignExecutor] Campaign ${campaignId} completed`);
      }
    } catch (error) {
      logger.error(`[CampaignExecutor] Error checking campaign completion: ${error.message}`);
    }
  }
}

// Create singleton instance
const campaignExecutor = new CampaignExecutor();

module.exports = campaignExecutor;

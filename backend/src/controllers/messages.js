const db = require('../config/database');
const evolutionClient = require('../services/evolution/client');
const logger = require('../utils/logger');
const TemplateEngine = require('../services/templateEngine');
const WarmupStrategy = require('../services/warmup/strategy');
const duplicateDetector = require('../services/duplicateDetector');
const contentAnalyzer = require('../services/contentAnalyzer');

/**
 * Messages Controller
 * Handles all business logic for message management with anti-spam protection
 */

// ==========================================
// ANTI-SPAM CONSTANTS
// ==========================================

const ANTI_SPAM_RULES = {
  MAX_DAILY_MESSAGES: parseInt(process.env.DAILY_MESSAGE_LIMIT) || 200,
  MIN_DELAY_SECONDS: parseInt(process.env.MIN_MESSAGE_DELAY) / 1000 || 20,
  MAX_DELAY_SECONDS: parseInt(process.env.MAX_MESSAGE_DELAY) / 1000 || 40,
  ALLOWED_START_HOUR: parseInt(process.env.WORKING_HOURS_START) || 9,
  ALLOWED_END_HOUR: parseInt(process.env.WORKING_HOURS_END) || 20,
  COOLDOWN_HOURS: parseInt(process.env.MESSAGE_COOLDOWN_HOURS) || 24,
  MAX_SPAM_SCORE: 70
};

// Allowed sort columns for SQL injection prevention
const ALLOWED_SORT_COLUMNS = ['id', 'status', 'created_at', 'sent_at', 'delivered_at', 'read_at'];
const ALLOWED_ORDER_VALUES = ['asc', 'desc'];

function validateSortParams(sort, order) {
  const safeSort = ALLOWED_SORT_COLUMNS.includes(sort) ? sort : 'created_at';
  const safeOrder = ALLOWED_ORDER_VALUES.includes(order?.toLowerCase()) ? order.toLowerCase() : 'desc';
  return { safeSort, safeOrder };
}

// ==========================================
// GET ALL MESSAGES
// ==========================================

/**
 * Get all messages with pagination and filtering
 * @route GET /api/messages
 */
async function getAllMessages(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      campaignId,
      contactId,
      status,
      dateFrom,
      dateTo,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const safePage = Math.max(1, parseInt(page) || 1);
    const offset = (safePage - 1) * safeLimit;
    const { safeSort, safeOrder } = validateSortParams(sort, order);

    // Build query
    let whereClause = [];
    let params = [];
    let paramCount = 1;

    if (campaignId) {
      whereClause.push(`m.campaign_id = $${paramCount}`);
      params.push(campaignId);
      paramCount++;
    }

    if (contactId) {
      whereClause.push(`m.contact_id = $${paramCount}`);
      params.push(contactId);
      paramCount++;
    }

    if (status) {
      whereClause.push(`m.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (dateFrom) {
      whereClause.push(`m.created_at >= $${paramCount}`);
      params.push(dateFrom);
      paramCount++;
    }

    if (dateTo) {
      whereClause.push(`m.created_at <= $${paramCount}`);
      params.push(dateTo);
      paramCount++;
    }

    const whereSQL = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM messages m ${whereSQL}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get messages
    const dataQuery = `
      SELECT
        m.id, m.message_text, m.status, m.sent_at, m.delivered_at, m.error_message,
        m.created_at,
        c.id as campaign_id, c.name as campaign_name,
        co.id as contact_id, co.name as contact_name, co.number as contact_number
      FROM messages m
      INNER JOIN campaigns c ON m.campaign_id = c.id
      INNER JOIN contacts co ON m.contact_id = co.id
      ${whereSQL}
      ORDER BY m.${safeSort} ${safeOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(safeLimit, offset);

    const result = await db.query(dataQuery, params);

    const messages = result.rows.map(row => ({
      id: row.id,
      messageText: row.message_text,
      status: row.status,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      errorMessage: row.error_message,
      campaign: {
        id: row.campaign_id,
        name: row.campaign_name
      },
      contact: {
        id: row.contact_id,
        name: row.contact_name,
        number: row.contact_number
      },
      createdAt: row.created_at
    }));

    logger.info(`[Messages] Fetched ${messages.length} messages (page ${page})`);

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error(`[Messages] Error fetching messages: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages',
      message: error.message
    });
  }
}

// ==========================================
// GET SINGLE MESSAGE
// ==========================================

/**
 * Get message by ID
 * @route GET /api/messages/:id
 */
async function getMessageById(req, res) {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        m.id, m.message_text, m.status, m.sent_at, m.delivered_at,
        m.read_at, m.error_message, m.created_at,
        c.id as campaign_id, c.name as campaign_name,
        co.id as contact_id, co.name as contact_name, co.number as contact_number,
        cons.id as consultant_id, cons.name as consultant_name, cons.instance_name
      FROM messages m
      INNER JOIN campaigns c ON m.campaign_id = c.id
      INNER JOIN contacts co ON m.contact_id = co.id
      INNER JOIN consultants cons ON c.consultant_id = cons.id
      WHERE m.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    const row = result.rows[0];

    const message = {
      id: row.id,
      messageText: row.message_text,
      status: row.status,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      readAt: row.read_at,
      errorMessage: row.error_message,
      campaign: {
        id: row.campaign_id,
        name: row.campaign_name
      },
      contact: {
        id: row.contact_id,
        name: row.contact_name,
        number: row.contact_number
      },
      consultant: {
        id: row.consultant_id,
        name: row.consultant_name,
        instanceName: row.instance_name
      },
      createdAt: row.created_at
    };

    logger.info(`[Messages] Fetched message ${id}`);

    res.json({
      success: true,
      data: message
    });

  } catch (error) {
    logger.error(`[Messages] Error fetching message: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch message',
      message: error.message
    });
  }
}

// ==========================================
// SEND MESSAGE (WITH ANTI-SPAM)
// ==========================================

/**
 * Send message with full anti-spam protection
 * @route POST /api/messages/send
 */
async function sendMessage(req, res) {
  const client = await db.pool.connect();

  try {
    const {
      campaignId,
      contactId,
      messageText,
      templateId,
      customVariables,
      scheduledFor
    } = req.body;

    await client.query('BEGIN');

    // Get campaign and consultant info
    const campaignQuery = `
      SELECT
        c.id, c.name as campaign_name, c.status, c.consultant_id,
        cons.id as consultant_id, cons.name as consultant_name, cons.instance_name,
        cons.status as consultant_status, cons.daily_limit, cons.spam_risk_score
      FROM campaigns c
      INNER JOIN consultants cons ON c.consultant_id = cons.id
      WHERE c.id = $1
    `;

    const campaignResult = await client.query(campaignQuery, [campaignId]);

    if (campaignResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const campaign = campaignResult.rows[0];

    // Validate campaign is running
    if (campaign.status !== 'running' && campaign.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Campaign is not running (current status: ${campaign.status})`
      });
    }

    // Validate consultant is active
    if (campaign.consultant_status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Consultant is not active'
      });
    }

    // Get contact info
    const contactQuery = `
      SELECT id, name, number, segment, last_message_from_us
      FROM contacts
      WHERE id = $1 AND consultant_id = $2
    `;

    const contactResult = await client.query(contactQuery, [contactId, campaign.consultant_id]);

    if (contactResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Contact not found or does not belong to this consultant'
      });
    }

    const contact = contactResult.rows[0];

    // TEMPLATE RENDERING: If templateId provided, render template with variables
    let finalMessageText = messageText;

    if (templateId) {
      try {
        // Fetch template
        const templateQuery = `
          SELECT id, content, variables
          FROM message_templates
          WHERE id = $1 AND consultant_id = $2 AND is_active = true
        `;
        const templateResult = await client.query(templateQuery, [templateId, campaign.consultant_id]);

        if (templateResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({
            success: false,
            error: 'Template not found or inactive'
          });
        }

        const template = templateResult.rows[0];

        // Build variables object from contact, consultant, and campaign data
        const variables = {
          // Contact variables
          contact_name: contact.name,
          name: contact.name, // alias
          contact_number: contact.number,
          number: contact.number, // alias
          contact_segment: contact.segment,
          segment: contact.segment, // alias

          // Consultant variables
          consultant_name: campaign.consultant_name,
          consultant_instance: campaign.instance_name,

          // Campaign variables
          campaign_name: campaign.campaign_name,

          // Merge custom variables if provided
          ...(customVariables || {})
        };

        // Render template
        finalMessageText = TemplateEngine.render(template.content, variables);

        // Update template usage count
        await client.query(
          'UPDATE message_templates SET usage_count = usage_count + 1 WHERE id = $1',
          [templateId]
        );

        logger.info(`[Messages] Rendered template ${templateId} for contact ${contactId}`);

      } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`[Messages] Template rendering error: ${error.message}`);
        return res.status(400).json({
          success: false,
          error: 'Failed to render template',
          message: error.message
        });
      }
    }

    // Validate final message text
    if (!finalMessageText || finalMessageText.trim().length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Message text or templateId is required'
      });
    }

    // ANTI-SPAM CHECK 0a: Content Analysis
    const contentCheck = contentAnalyzer.analyzeContent(finalMessageText);
    if (contentCheck.isSpam) {
      await client.query('ROLLBACK');
      await logSpamEvent(campaign.consultant_id, 'SPAM_CONTENT', {
        spam_score: contentCheck.score,
        details: contentCheck.details,
        campaignId
      });

      return res.status(400).json({
        success: false,
        error: 'Mesaj spam içeriği tespit edildi',
        spamAnalysis: {
          score: contentCheck.score,
          riskLevel: contentCheck.riskLevel,
          details: contentCheck.details,
          recommendation: contentCheck.recommendation
        }
      });
    }

    // ANTI-SPAM CHECK 0b: Duplicate Message Detection
    const duplicateCheck = await duplicateDetector.checkDuplicate(campaign.consultant_id, finalMessageText);
    if (duplicateCheck.isDuplicate) {
      await client.query('ROLLBACK');
      await logSpamEvent(campaign.consultant_id, 'DUPLICATE_MESSAGE', {
        message_hash: duplicateCheck.messageHash,
        count: duplicateCheck.count,
        limit: duplicateCheck.limit,
        campaignId
      });

      return res.status(429).json({
        success: false,
        error: duplicateCheck.reason,
        duplicateInfo: {
          count: duplicateCheck.count,
          limit: duplicateCheck.limit
        }
      });
    }

    // ANTI-SPAM CHECK 1: Check spam risk score
    if (campaign.spam_risk_score >= ANTI_SPAM_RULES.MAX_SPAM_SCORE) {
      await client.query('ROLLBACK');
      await logSpamEvent(campaign.consultant_id, 'HIGH_SPAM_SCORE', {
        spam_score: campaign.spam_risk_score,
        campaignId
      });

      return res.status(429).json({
        success: false,
        error: 'Spam risk score too high. Account suspended.',
        spam_score: campaign.spam_risk_score
      });
    }

    // ANTI-SPAM CHECK 2: Check daily limit (with warm-up strategy)
    const todayMessagesQuery = `
      SELECT COUNT(*) as count
      FROM messages
      WHERE campaign_id IN (SELECT id FROM campaigns WHERE consultant_id = $1)
        AND DATE(created_at) = CURRENT_DATE
        AND status != 'failed'
    `;

    const todayResult = await client.query(todayMessagesQuery, [campaign.consultant_id]);
    const todayCount = parseInt(todayResult.rows[0].count);

    // Get consultant's connected_at for warm-up calculation
    const consultantQuery = `
      SELECT connected_at
      FROM consultants
      WHERE id = $1
    `;
    const consultantResult = await client.query(consultantQuery, [campaign.consultant_id]);
    const connectedAt = consultantResult.rows[0]?.connected_at;

    // Calculate warm-up limit using WarmupStrategy service
    let effectiveDailyLimit;
    let warmupInfo;

    if (connectedAt) {
      // Use warm-up strategy
      const limitInfo = WarmupStrategy.getDailyLimitForConsultant(connectedAt, campaign.daily_limit);
      effectiveDailyLimit = limitInfo.limit;
      warmupInfo = WarmupStrategy.getWarmupStatus(connectedAt, todayCount, campaign.daily_limit);

      logger.info(`[Messages] Warm-up limit applied: ${effectiveDailyLimit} (Phase: ${limitInfo.phase}, Week: ${limitInfo.weeksSinceConnection})`);
    } else {
      // Consultant not connected yet, use default limit or 0
      effectiveDailyLimit = 0;
      warmupInfo = {
        status: 'NOT_CONNECTED',
        message: 'Consultant not connected to WhatsApp yet'
      };

      logger.warn(`[Messages] Consultant ${campaign.consultant_id} not connected, limit set to 0`);
    }

    if (todayCount >= effectiveDailyLimit) {
      await client.query('ROLLBACK');
      await logSpamEvent(campaign.consultant_id, 'DAILY_LIMIT', {
        daily_limit: effectiveDailyLimit,
        custom_daily_limit: campaign.daily_limit,
        today_count: todayCount,
        campaignId,
        warmup_info: warmupInfo
      });

      return res.status(429).json({
        success: false,
        error: connectedAt
          ? `Daily message limit reached (Warm-up ${warmupInfo.statusName})`
          : 'Consultant not connected to WhatsApp yet',
        dailyLimit: effectiveDailyLimit,
        customDailyLimit: campaign.daily_limit,
        sentToday: todayCount,
        remaining: Math.max(effectiveDailyLimit - todayCount, 0),
        warmupInfo: connectedAt ? {
          status: warmupInfo.status,
          statusName: warmupInfo.statusName,
          weeksSinceConnection: warmupInfo.weeksSinceConnection,
          isWarmupComplete: warmupInfo.isWarmupComplete,
          percentageUsed: warmupInfo.percentageUsed
        } : null
      });
    }

    // Log warm-up status for monitoring
    logger.info(`[Messages] Warm-up status - Sent today: ${todayCount}/${effectiveDailyLimit} (${warmupInfo.percentageUsed}% used)`);
    if (warmupInfo.remaining < 10 && warmupInfo.remaining > 0) {
      logger.warn(`[Messages] ⚠️ Warm-up limit almost reached: ${warmupInfo.remaining} messages remaining`);
    }

    // ANTI-SPAM CHECK 3: Check time window (09:00 - 20:00)
    // Skip time window check in test environment
    if (process.env.NODE_ENV !== 'test') {
      const currentHour = new Date().getHours();
      if (currentHour < ANTI_SPAM_RULES.ALLOWED_START_HOUR || currentHour >= ANTI_SPAM_RULES.ALLOWED_END_HOUR) {
        await client.query('ROLLBACK');
        await logSpamEvent(campaign.consultant_id, 'OUTSIDE_HOURS', {
          current_hour: currentHour,
          allowed_hours: `${ANTI_SPAM_RULES.ALLOWED_START_HOUR}:00 - ${ANTI_SPAM_RULES.ALLOWED_END_HOUR}:00`,
          campaignId
        });

        return res.status(400).json({
          success: false,
          error: 'Messages can only be sent between 09:00 and 20:00',
          currentHour: currentHour
        });
      }
    }

    // ANTI-SPAM CHECK 4: Check 24-hour cooldown per contact
    if (contact.last_message_from_us) {
      const hoursSinceLastMessage = (Date.now() - new Date(contact.last_message_from_us).getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastMessage < ANTI_SPAM_RULES.COOLDOWN_HOURS) {
        await client.query('ROLLBACK');
        await logSpamEvent(campaign.consultant_id, 'COOLDOWN_VIOLATION', {
          contactId,
          hours_since_last: hoursSinceLastMessage.toFixed(2),
          cooldown_required: ANTI_SPAM_RULES.COOLDOWN_HOURS,
          campaignId
        });

        return res.status(429).json({
          success: false,
          error: '24-hour cooldown period not met for this contact',
          hoursSinceLastMessage: hoursSinceLastMessage.toFixed(2),
          cooldownHours: ANTI_SPAM_RULES.COOLDOWN_HOURS
        });
      }
    }

    // Generate message hash for duplicate tracking
    const messageHash = duplicateDetector.generateMessageHash(finalMessageText);

    // Insert message record
    const insertQuery = `
      INSERT INTO messages (campaign_id, contact_id, message_text, status, message_hash, content_spam_score)
      VALUES ($1, $2, $3, 'pending', $4, $5)
      RETURNING id, created_at
    `;

    const insertResult = await client.query(insertQuery, [
      campaignId,
      contactId,
      finalMessageText,
      messageHash,
      contentCheck.score
    ]);
    const messageId = insertResult.rows[0].id;

    await client.query('COMMIT');

    logger.info(`[Messages] Message ${messageId} created, preparing to send`);

    // Send message via Evolution API (async)
    sendMessageViaEvolutionAPI(
      messageId,
      campaign.instance_name,
      contact.number,
      finalMessageText,
      campaign.consultant_id
    ).catch(err => {
      logger.error(`[Messages] Failed to send message ${messageId}: ${err.message}`);
    });

    res.status(202).json({
      success: true,
      data: {
        messageId: messageId,
        status: 'pending',
        createdAt: insertResult.rows[0].created_at
      },
      message: 'Message queued for sending'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`[Messages] Error sending message: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      message: error.message
    });
  } finally {
    client.release();
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Send message via Evolution API and update status
 * @private
 */
async function sendMessageViaEvolutionAPI(messageId, instanceName, phoneNumber, messageText, consultantId) {
  try {
    // Random delay (20-40 seconds) for anti-spam
    const delaySeconds = Math.floor(
      Math.random() * (ANTI_SPAM_RULES.MAX_DELAY_SECONDS - ANTI_SPAM_RULES.MIN_DELAY_SECONDS + 1) +
      ANTI_SPAM_RULES.MIN_DELAY_SECONDS
    );

    logger.info(`[Messages] Waiting ${delaySeconds}s before sending message ${messageId}`);
    await sleep(delaySeconds * 1000);

    // Send typing indicator
    await evolutionClient.sendTyping(instanceName, phoneNumber, 3000);

    // Wait 3 seconds for typing indicator
    await sleep(3000);

    // Send message
    const result = await evolutionClient.sendTextMessage(instanceName, phoneNumber, messageText);

    // Update message status to sent
    await db.query(
      'UPDATE messages SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['sent', messageId]
    );

    // Update contact's last_message_from_us
    await db.query(
      'UPDATE contacts SET last_message_from_us = CURRENT_TIMESTAMP WHERE number = $1',
      [phoneNumber]
    );

    // Update campaign stats
    await db.query(
      'UPDATE campaigns SET sent_count = sent_count + 1 WHERE id = (SELECT campaign_id FROM messages WHERE id = $1)',
      [messageId]
    );

    // Update daily stats
    await updateDailyStats(consultantId, 'sent');

    logger.info(`[Messages] Message ${messageId} sent successfully`);

    return result;

  } catch (error) {
    logger.error(`[Messages] Error sending message ${messageId} via Evolution API: ${error.message}`);

    // Update message status to failed
    await db.query(
      'UPDATE messages SET status = $1, error_message = $2 WHERE id = $3',
      ['failed', error.message, messageId]
    );

    // Update campaign stats
    await db.query(
      'UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = (SELECT campaign_id FROM messages WHERE id = $1)',
      [messageId]
    );

    // Update daily stats
    await updateDailyStats(consultantId, 'failed');

    // Increase spam risk score
    await db.query(
      'UPDATE consultants SET spam_risk_score = spam_risk_score + 5 WHERE id = $1',
      [consultantId]
    );

    throw error;
  }
}

/**
 * Log spam event
 * @private
 */
async function logSpamEvent(consultantId, eventType, metadata) {
  try {
    const query = `
      INSERT INTO spam_logs (consultant_id, event_type, metadata)
      VALUES ($1, $2, $3)
    `;

    await db.query(query, [consultantId, eventType, JSON.stringify(metadata)]);

    // Increase spam risk score
    const scoreIncrease = getSpamScoreIncrease(eventType);
    await db.query(
      'UPDATE consultants SET spam_risk_score = spam_risk_score + $1 WHERE id = $2',
      [scoreIncrease, consultantId]
    );

    logger.warn(`[AntiSpam] Event logged: ${eventType} for consultant ${consultantId}`);

  } catch (error) {
    logger.error(`[AntiSpam] Failed to log spam event: ${error.message}`);
  }
}

/**
 * Get spam score increase based on event type
 * @private
 */
function getSpamScoreIncrease(eventType) {
  const scoreMap = {
    'HIGH_SPAM_SCORE': 0,
    'DAILY_LIMIT': 10,
    'OUTSIDE_HOURS': 5,
    'COOLDOWN_VIOLATION': 15,
    'MESSAGE_FAILED': 3
  };

  return scoreMap[eventType] || 5;
}

/**
 * Update daily stats
 * @private
 */
async function updateDailyStats(consultantId, messageStatus) {
  try {
    const query = `
      INSERT INTO daily_stats (consultant_id, date, messages_sent, messages_failed)
      VALUES ($1, CURRENT_DATE, $2, $3)
      ON CONFLICT (consultant_id, date)
      DO UPDATE SET
        messages_sent = daily_stats.messages_sent + EXCLUDED.messages_sent,
        messages_failed = daily_stats.messages_failed + EXCLUDED.messages_failed
    `;

    const sentCount = messageStatus === 'sent' ? 1 : 0;
    const failedCount = messageStatus === 'failed' ? 1 : 0;

    await db.query(query, [consultantId, sentCount, failedCount]);

  } catch (error) {
    logger.error(`[Messages] Failed to update daily stats: ${error.message}`);
  }
}

/**
 * Sleep helper
 * @private
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// GET MESSAGE STATS
// ==========================================

/**
 * Get message statistics
 * @route GET /api/messages/stats
 */
async function getMessageStats(req, res) {
  try {
    const { consultantId, campaignId, dateFrom, dateTo } = req.query;

    let whereClause = [];
    let params = [];
    let paramCount = 1;

    if (consultantId) {
      whereClause.push(`c.consultant_id = $${paramCount}`);
      params.push(consultantId);
      paramCount++;
    }

    if (campaignId) {
      whereClause.push(`m.campaign_id = $${paramCount}`);
      params.push(campaignId);
      paramCount++;
    }

    if (dateFrom) {
      whereClause.push(`m.created_at >= $${paramCount}`);
      params.push(dateFrom);
      paramCount++;
    }

    if (dateTo) {
      whereClause.push(`m.created_at <= $${paramCount}`);
      params.push(dateTo);
      paramCount++;
    }

    const whereSQL = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    const query = `
      SELECT
        COUNT(*) as total_messages,
        COUNT(*) FILTER (WHERE m.status = 'sent') as sent_messages,
        COUNT(*) FILTER (WHERE m.status = 'delivered') as delivered_messages,
        COUNT(*) FILTER (WHERE m.status = 'read') as read_messages,
        COUNT(*) FILTER (WHERE m.status = 'failed') as failed_messages,
        COUNT(*) FILTER (WHERE m.status = 'pending') as pending_messages
      FROM messages m
      INNER JOIN campaigns c ON m.campaign_id = c.id
      ${whereSQL}
    `;

    const result = await db.query(query, params);

    logger.info('[Messages] Fetched message stats');

    res.json({
      success: true,
      data: {
        total: parseInt(result.rows[0].total_messages),
        sent: parseInt(result.rows[0].sent_messages),
        delivered: parseInt(result.rows[0].delivered_messages),
        read: parseInt(result.rows[0].read_messages),
        failed: parseInt(result.rows[0].failed_messages),
        pending: parseInt(result.rows[0].pending_messages)
      }
    });

  } catch (error) {
    logger.error(`[Messages] Error fetching stats: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch message stats',
      message: error.message
    });
  }
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  getAllMessages,
  getMessageById,
  sendMessage,
  getMessageStats,
  ANTI_SPAM_RULES
};

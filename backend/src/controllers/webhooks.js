const db = require('../config/database');
const logger = require('../utils/logger');
const { syncContacts } = require('../services/contactSync');
const engagementTracker = require('../services/engagementTracker');
const blockDetector = require('../services/blockDetector');

/**
 * Webhook Controller
 * Handles webhooks from Evolution API
 */

/**
 * Handle Evolution API webhook events
 * POST /api/webhooks/evolution
 * Public endpoint (no auth) - Evolution API calls this
 */
async function handleEvolutionWebhook(req, res) {
  try {
    const event = req.body;

    logger.info('[Webhook] Received event:', {
      event: event.event,
      instance: event.instance,
      data: event.data
    });

    // Quick response to Evolution API
    res.status(200).json({ success: true, received: true });

    // Process event asynchronously
    processEvent(event).catch(error => {
      logger.error('[Webhook] Error processing event:', error);
    });
  } catch (error) {
    logger.error('[Webhook] Error handling webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed'
    });
  }
}

/**
 * Process webhook event
 */
async function processEvent(event) {
  const eventType = event.event;
  const instanceName = event.instance;

  logger.info(`[Webhook] Processing ${eventType} for ${instanceName}`);

  // Normalize event type to lowercase and handle both formats
  // Evolution API may send: QRCODE_UPDATED or qrcode.updated
  const normalizedEvent = eventType.toLowerCase().replace(/_/g, '.');

  switch (normalizedEvent) {
    case 'qrcode.updated':
      await handleQRCodeUpdated(event);
      break;

    case 'connection.update':
      await handleConnectionUpdate(event);
      break;

    case 'messages.upsert':
      await handleMessageUpsert(event);
      break;

    default:
      logger.debug(`[Webhook] Unhandled event type: ${eventType} (normalized: ${normalizedEvent})`);
  }
}

/**
 * Handle QR code updated event
 */
async function handleQRCodeUpdated(event) {
  const instanceName = event.instance;
  const qrcode = event.data?.qrcode;

  logger.info(`[Webhook] QR code updated for ${instanceName}`);

  // Could store QR code in database or cache here if needed
  // For now, just log it
  if (qrcode) {
    logger.debug(`[Webhook] New QR code available for ${instanceName}`);
  }
}

/**
 * Handle connection update event
 * This is the most important event - tells us when WhatsApp connects/disconnects
 */
async function handleConnectionUpdate(event) {
  const instanceName = event.instance;
  const state = event.data?.state;

  // Log full event data for debugging
  logger.info(`[Webhook] Connection update for ${instanceName}: state=${state}, full data:`, JSON.stringify(event.data));

  if (!instanceName) {
    logger.error('[Webhook] No instance name in connection update event');
    return;
  }

  // Find consultant by instance_name
  const consultantResult = await db.query(
    'SELECT id, name, instance_name FROM consultants WHERE instance_name = $1',
    [instanceName]
  );

  if (consultantResult.rows.length === 0) {
    logger.warn(`[Webhook] Consultant not found for instance ${instanceName}`);
    return;
  }

  const consultant = consultantResult.rows[0];

  if (state === 'open') {
    // WhatsApp connected!
    logger.info(`[Webhook] WhatsApp connected for consultant ${consultant.id} (${consultant.name})`);

    // Extract WhatsApp number - try multiple possible locations in event data
    let whatsappNumber = null;

    // Evolution API v2 may send number in different locations
    if (event.data?.instance?.owner) {
      whatsappNumber = event.data.instance.owner.replace('@s.whatsapp.net', '');
    } else if (event.data?.number) {
      whatsappNumber = event.data.number;
    } else if (event.data?.statusReason && typeof event.data.statusReason === 'string') {
      // Sometimes the number is in the status data (only if it's a string)
      const match = event.data.statusReason.match(/\d+/);
      if (match) whatsappNumber = match[0];
    }

    // If number not found in webhook event, fetch it from Evolution API
    if (!whatsappNumber) {
      try {
        const evolutionClient = require('../services/evolution/client');
        logger.info(`[Webhook] Fetching instance info from Evolution API for ${instanceName}`);

        // Use Evolution API client to get full instance info
        const response = await evolutionClient.client.get(`/instance/fetchInstances?instanceName=${instanceName}`);
        const instances = response.data;

        if (instances && instances.length > 0 && instances[0].ownerJid) {
          whatsappNumber = instances[0].ownerJid.replace('@s.whatsapp.net', '');
          logger.info(`[Webhook] Retrieved WhatsApp number from Evolution API: ${whatsappNumber}`);
        }
      } catch (fetchError) {
        logger.warn(`[Webhook] Failed to fetch instance info from Evolution API: ${fetchError.message}`);
      }
    }

    logger.info(`[Webhook] Extracted WhatsApp number: ${whatsappNumber || 'N/A'}`);

    // Update consultant status to active
    await db.query(`
      UPDATE consultants
      SET status = 'active',
          connected_at = CURRENT_TIMESTAMP,
          whatsapp_number = COALESCE($1, whatsapp_number)
      WHERE id = $2
    `, [whatsappNumber, consultant.id]);

    logger.info(`[Webhook] Consultant ${consultant.id} marked as active with number ${whatsappNumber || 'N/A'}`);

    // AUTO-SYNC CONTACTS (Checkpoint 5.3)
    try {
      logger.info(`[Webhook] Starting auto contact sync for consultant ${consultant.id}`);
      const syncResult = await syncContacts(consultant.id, instanceName);
      logger.info(`[Webhook] Auto-sync completed: ${JSON.stringify(syncResult)}`);
    } catch (syncError) {
      // Don't fail the webhook if sync fails, just log the error
      logger.error(`[Webhook] Auto-sync failed for consultant ${consultant.id}: ${syncError.message}`);
    }
  } else if (state === 'close') {
    // WhatsApp disconnected
    logger.info(`[Webhook] WhatsApp disconnected for consultant ${consultant.id} (${consultant.name})`);

    // Update consultant status to offline
    await db.query(`
      UPDATE consultants
      SET status = 'offline',
          connected_at = NULL
      WHERE id = $1
    `, [consultant.id]);

    logger.info(`[Webhook] Consultant ${consultant.id} marked as offline`);
  } else {
    logger.debug(`[Webhook] Connection state for ${instanceName}: ${state}, full event data: ${JSON.stringify(event.data)}`);
  }
}

/**
 * Handle message upsert event (new message received)
 * Updates contact's last_message_time when receiving messages
 */
async function handleMessageUpsert(event) {
  const instanceName = event.instance;

  // Evolution API v2 sends message data directly, not in an array
  // Check if event.data is an array or a single message object
  let messages = [];

  if (Array.isArray(event.data?.messages)) {
    // Format 1: { messages: [...] }
    messages = event.data.messages;
  } else if (event.data?.key) {
    // Format 2: Single message object directly
    messages = [event.data];
  } else if (Array.isArray(event.data)) {
    // Format 3: Array of messages directly
    messages = event.data;
  }

  logger.info(`[Webhook] Message upsert for ${instanceName}: ${messages.length} messages`);

  // Process each message
  for (const message of messages) {
    try {
      logger.info(`[Webhook] Processing message: ${JSON.stringify(message.key)}`);
      const messageKey = message.key;
      const fromMe = messageKey?.fromMe;
      const remoteJid = messageKey?.remoteJid;

      // Extract phone number from remoteJid (format: "905391234567@s.whatsapp.net")
      if (!remoteJid) {
        logger.warn('[Webhook] Message has no remoteJid, skipping');
        continue;
      }

      const phoneNumber = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');

      // Skip group messages (@g.us)
      if (remoteJid.includes('@g.us')) {
        logger.info(`[Webhook] Skipping group message from ${phoneNumber}`);
        continue;
      }

      logger.info(`[Webhook] Message ${fromMe ? 'to' : 'from'} ${phoneNumber}, fromMe: ${fromMe}`);

      // Update contact's last message time
      // If fromMe=true: update last_message_from_us
      // If fromMe=false: update last_message_time
      let updateQuery;
      if (fromMe) {
        updateQuery = `
          UPDATE contacts
          SET last_message_from_us = CURRENT_TIMESTAMP,
              message_count = COALESCE(message_count, 0) + 1
          WHERE number = $1
        `;
      } else {
        // Incoming message - this is a REPLY!
        updateQuery = `
          UPDATE contacts
          SET last_message_time = CURRENT_TIMESTAMP,
              message_count = COALESCE(message_count, 0) + 1
          WHERE number = $1
        `;

        // Process as reply for engagement tracking
        try {
          // Find consultant for this instance
          const consultantQuery = `
            SELECT c.id FROM consultants c
            WHERE c.instance_name = $1
          `;
          const consultantResult = await db.query(consultantQuery, [instanceName]);

          if (consultantResult.rows.length > 0) {
            const consultantId = consultantResult.rows[0].id;

            // Extract message text
            const messageText = message.message?.conversation ||
                               message.message?.extendedTextMessage?.text ||
                               '[Media/Other]';

            // Process reply with engagement tracker
            await engagementTracker.processReply(
              consultantId,
              phoneNumber,
              messageText,
              { instanceName, timestamp: new Date().toISOString() }
            );

            logger.info(`[Webhook] Reply processed for engagement tracking: ${phoneNumber}`);
          }
        } catch (engagementError) {
          logger.error(`[Webhook] Engagement tracking error: ${engagementError.message}`);
          // Continue even if engagement tracking fails
        }
      }

      const updateResult = await db.query(updateQuery, [phoneNumber]);

      if (updateResult.rowCount > 0) {
        logger.info(`[Webhook] ✅ Updated ${fromMe ? 'last_message_from_us' : 'last_message_time'} for contact ${phoneNumber}`);
      } else {
        logger.warn(`[Webhook] ⚠️ Contact ${phoneNumber} not found in database, skipping update`);
      }

    } catch (error) {
      logger.error(`[Webhook] Error processing message: ${error.message}`);
      // Continue processing other messages even if one fails
    }
  }
}

module.exports = {
  handleEvolutionWebhook
};

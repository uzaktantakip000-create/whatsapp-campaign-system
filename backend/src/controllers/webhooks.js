const db = require('../config/database');
const logger = require('../utils/logger');
const { syncContacts } = require('../services/contactSync');

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

  switch (eventType) {
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
      logger.debug(`[Webhook] Unhandled event type: ${eventType}`);
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

  logger.info(`[Webhook] Connection update for ${instanceName}: state=${state}`);

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

    // Extract WhatsApp number if available
    const whatsappNumber = event.data?.number || null;

    // Update consultant status to active
    await db.query(`
      UPDATE consultants
      SET status = 'active',
          connected_at = CURRENT_TIMESTAMP,
          whatsapp_number = COALESCE($1, whatsapp_number)
      WHERE id = $2
    `, [whatsappNumber, consultant.id]);

    logger.info(`[Webhook] Consultant ${consultant.id} marked as active`);

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
    logger.debug(`[Webhook] Connection state for ${instanceName}: ${state}`);
  }
}

/**
 * Handle message upsert event (new message received)
 * This will be used in Phase 4 for handling incoming messages
 */
async function handleMessageUpsert(event) {
  const instanceName = event.instance;
  const messages = event.data?.messages || [];

  logger.debug(`[Webhook] Message upsert for ${instanceName}: ${messages.length} messages`);

  // TODO: Implement in Phase 4 - handle incoming messages
  // For now, just log
  for (const message of messages) {
    logger.debug(`[Webhook] Message from ${message.key?.remoteJid}: ${message.message?.conversation}`);
  }
}

module.exports = {
  handleEvolutionWebhook
};

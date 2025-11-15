const db = require('../config/database');
const evolutionClient = require('../services/evolution/client');
const logger = require('../utils/logger');

/**
 * WhatsApp Connection Controller
 * Handles WhatsApp connection, QR code generation, and status checking
 */

/**
 * Connect to WhatsApp and get QR code
 * POST /api/whatsapp/connect
 * Protected route - requires authentication
 */
async function connect(req, res) {
  try {
    const consultantId = req.user.id;

    logger.info(`[WhatsApp] Connect request from consultant ${consultantId}`);

    // Get consultant info
    const consultantResult = await db.query(
      'SELECT * FROM consultants WHERE id = $1',
      [consultantId]
    );

    if (consultantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Consultant not found'
      });
    }

    const consultant = consultantResult.rows[0];

    // Check if already connected
    if (consultant.status === 'active' && consultant.connected_at) {
      logger.info(`[WhatsApp] Consultant ${consultantId} already connected`);
      return res.json({
        success: true,
        message: 'Already connected to WhatsApp',
        data: {
          status: 'active',
          connected_at: consultant.connected_at,
          instance_name: consultant.instance_name
        }
      });
    }

    const instanceName = consultant.instance_name;

    // Check if instance exists in Evolution API
    let qrcodeResult = null;
    try {
      const instanceInfo = await evolutionClient.getInstanceStatus(instanceName);
      // Instance exists - delete and recreate to get fresh QR code
      logger.info(`[WhatsApp] Instance ${instanceName} exists, deleting and recreating for fresh QR code`);
      try {
        await evolutionClient.deleteInstance(instanceName);
        logger.info(`[WhatsApp] Old instance deleted, waiting before recreating...`);
        // Wait 3 seconds for Evolution API to fully delete the instance
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (deleteError) {
        logger.warn(`[WhatsApp] Failed to delete old instance: ${deleteError.message}`);
      }
      logger.info(`[WhatsApp] Creating new instance: ${instanceName}`);
      qrcodeResult = await evolutionClient.createInstance(instanceName);
    } catch (error) {
      // Instance doesn't exist, create it (this will also return QR code)
      logger.info(`[WhatsApp] Instance ${instanceName} does not exist, creating`);
      qrcodeResult = await evolutionClient.createInstance(instanceName);
    }

    if (!qrcodeResult || !qrcodeResult.qrcode) {
      logger.error(`[WhatsApp] Failed to get QR code for ${instanceName}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate QR code',
        details: 'Please try again'
      });
    }

    // Configure webhook for this instance
    const webhookUrl = process.env.WEBHOOK_URL;
    if (webhookUrl) {
      try {
        logger.info(`[WhatsApp] Configuring webhook for ${instanceName}: ${webhookUrl}`);
        await evolutionClient.setWebhook(instanceName, webhookUrl, [
          'QRCODE_UPDATED',
          'CONNECTION_UPDATE',
          'MESSAGES_UPSERT'
        ]);
        logger.info(`[WhatsApp] Webhook configured successfully for ${instanceName}`);
      } catch (webhookError) {
        logger.warn(`[WhatsApp] Failed to set webhook for ${instanceName}: ${webhookError.message}`);
        // Continue anyway - QR code is already generated
      }
    } else {
      logger.warn('[WhatsApp] WEBHOOK_URL not configured in environment');
    }

    // Update consultant status to pending
    await db.query(
      'UPDATE consultants SET status = $1 WHERE id = $2',
      ['pending', consultantId]
    );

    logger.info(`[WhatsApp] QR code generated for consultant ${consultantId}`);

    res.json({
      success: true,
      data: {
        qrCode: qrcodeResult.qrcode.base64, // Frontend expects qrCode (camelCase) as string
        instance_name: instanceName,
        expires_in: 45 // QR code expires in 45 seconds
      }
    });
  } catch (error) {
    logger.error('[WhatsApp] Connect error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect to WhatsApp',
      details: error.message
    });
  }
}

/**
 * Get WhatsApp connection status
 * GET /api/whatsapp/status
 * Protected route - requires authentication
 */
async function getStatus(req, res) {
  try {
    const consultantId = req.user.id;

    logger.debug(`[WhatsApp] Status check for consultant ${consultantId}`);

    // Get consultant info
    const consultantResult = await db.query(
      'SELECT * FROM consultants WHERE id = $1',
      [consultantId]
    );

    if (consultantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Consultant not found'
      });
    }

    const consultant = consultantResult.rows[0];
    const instanceName = consultant.instance_name;

    // Check instance status in Evolution API
    let evolutionStatus = 'unknown';
    try {
      const instanceInfo = await evolutionClient.getInstanceStatus(instanceName);
      evolutionStatus = instanceInfo?.state || 'unknown';
      logger.debug(`[WhatsApp] Evolution API status for ${instanceName}: ${evolutionStatus}`);
    } catch (error) {
      logger.warn(`[WhatsApp] Could not fetch instance status: ${error.message}`);
    }

    // Determine status
    let status = consultant.status || 'offline';

    // Sync with Evolution API status
    if (evolutionStatus === 'open' && status !== 'active') {
      // Evolution says connected but DB says not - update DB
      await db.query(
        'UPDATE consultants SET status = $1, connected_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['active', consultantId]
      );
      status = 'active';
    } else if (evolutionStatus === 'close' && status === 'active') {
      // Evolution says disconnected but DB says connected - update DB
      await db.query(
        'UPDATE consultants SET status = $1, connected_at = NULL WHERE id = $2',
        ['offline', consultantId]
      );
      status = 'offline';
    }

    res.json({
      success: true,
      data: {
        status: status,
        connectedAt: consultant.connected_at,
        phoneNumber: consultant.whatsapp_number,
        instanceName: instanceName,
        evolutionState: evolutionStatus
      }
    });
  } catch (error) {
    logger.error('[WhatsApp] Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check WhatsApp status',
      details: error.message
    });
  }
}

/**
 * Disconnect from WhatsApp
 * POST /api/whatsapp/disconnect
 * Protected route - requires authentication
 */
async function disconnect(req, res) {
  try {
    const consultantId = req.user.id;

    logger.info(`[WhatsApp] Disconnect request from consultant ${consultantId}`);

    // Get consultant info
    const consultantResult = await db.query(
      'SELECT * FROM consultants WHERE id = $1',
      [consultantId]
    );

    if (consultantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Consultant not found'
      });
    }

    const consultant = consultantResult.rows[0];
    const instanceName = consultant.instance_name;

    // Logout from Evolution API
    try {
      await evolutionClient.logoutInstance(instanceName);
      logger.info(`[WhatsApp] Instance ${instanceName} logged out from Evolution API`);
    } catch (error) {
      logger.warn(`[WhatsApp] Failed to logout instance ${instanceName}:`, error.message);
      // Continue anyway to update database
    }

    // Update consultant status
    await db.query(
      'UPDATE consultants SET status = $1, connected_at = NULL WHERE id = $2',
      ['offline', consultantId]
    );

    logger.info(`[WhatsApp] Consultant ${consultantId} disconnected successfully`);

    res.json({
      success: true,
      message: 'WhatsApp disconnected successfully'
    });
  } catch (error) {
    logger.error('[WhatsApp] Disconnect error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect from WhatsApp',
      details: error.message
    });
  }
}

module.exports = {
  connect,
  getStatus,
  disconnect
};

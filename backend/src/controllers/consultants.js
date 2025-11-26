const db = require('../config/database');
const evolutionClient = require('../services/evolution/client');
const logger = require('../utils/logger');

/**
 * Consultants Controller
 * Handles all business logic for consultant management
 */

// Allowed sort columns for SQL injection prevention
const ALLOWED_SORT_COLUMNS = ['id', 'name', 'email', 'status', 'created_at', 'updated_at', 'daily_limit', 'spam_risk_score'];
const ALLOWED_ORDER_VALUES = ['asc', 'desc'];

function validateSortParams(sort, order) {
  const safeSort = ALLOWED_SORT_COLUMNS.includes(sort) ? sort : 'created_at';
  const safeOrder = ALLOWED_ORDER_VALUES.includes(order?.toLowerCase()) ? order.toLowerCase() : 'desc';
  return { safeSort, safeOrder };
}

// ==========================================
// GET ALL CONSULTANTS
// ==========================================

/**
 * Get all consultants with pagination and filtering
 * @route GET /api/consultants
 */
async function getAllConsultants(req, res) {
  try {
    const { page = 1, limit = 20, status, search, sort = 'created_at', order = 'desc' } = req.query;
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const safePage = Math.max(1, parseInt(page) || 1);
    const offset = (safePage - 1) * safeLimit;
    const { safeSort, safeOrder } = validateSortParams(sort, order);

    // Build query
    let whereClause = [];
    let params = [];
    let paramCount = 1;

    if (status) {
      whereClause.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (search) {
      whereClause.push(`(name ILIKE $${paramCount} OR email ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereSQL = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM consultants ${whereSQL}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get consultants
    const dataQuery = `
      SELECT
        id, name, email, instance_name, status,
        daily_limit, spam_risk_score, whatsapp_number,
        created_at, updated_at
      FROM consultants
      ${whereSQL}
      ORDER BY ${safeSort} ${safeOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(safeLimit, offset);

    const result = await db.query(dataQuery, params);

    // Transform snake_case to camelCase
    const consultants = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      instanceName: row.instance_name,
      status: row.status,
      dailyLimit: row.daily_limit,
      spamRiskScore: row.spam_risk_score,
      whatsappNumber: row.whatsapp_number,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    logger.info(`[Consultants] Fetched ${consultants.length} consultants (page ${page})`);

    res.json({
      success: true,
      data: consultants,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error(`[Consultants] Error fetching consultants: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consultants',
      message: error.message
    });
  }
}

// ==========================================
// GET SINGLE CONSULTANT
// ==========================================

/**
 * Get consultant by ID
 * @route GET /api/consultants/:id
 */
async function getConsultantById(req, res) {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        id, name, email, instance_name, status,
        daily_limit, spam_risk_score, whatsapp_number,
        created_at, updated_at
      FROM consultants
      WHERE id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Consultant not found'
      });
    }

    // Get consultant stats
    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM contacts WHERE consultant_id = $1) as total_contacts,
        (SELECT COUNT(*) FROM campaigns WHERE consultant_id = $1) as total_campaigns,
        (SELECT COUNT(*) FROM campaigns WHERE consultant_id = $1 AND status = 'active') as active_campaigns,
        (SELECT COUNT(*) FROM messages WHERE campaign_id IN (SELECT id FROM campaigns WHERE consultant_id = $1)) as total_messages,
        (SELECT COUNT(*) FROM messages WHERE campaign_id IN (SELECT id FROM campaigns WHERE consultant_id = $1) AND status = 'sent') as sent_messages
    `;

    const statsResult = await db.query(statsQuery, [id]);
    const consultantRow = result.rows[0];
    const statsRow = statsResult.rows[0];

    const consultant = {
      id: consultantRow.id,
      name: consultantRow.name,
      email: consultantRow.email,
      instanceName: consultantRow.instance_name,
      status: consultantRow.status,
      dailyLimit: consultantRow.daily_limit,
      spamRiskScore: consultantRow.spam_risk_score,
      whatsappNumber: consultantRow.whatsapp_number,
      createdAt: consultantRow.created_at,
      updatedAt: consultantRow.updated_at,
      stats: {
        totalContacts: parseInt(statsRow.total_contacts) || 0,
        totalCampaigns: parseInt(statsRow.total_campaigns) || 0,
        activeCampaigns: parseInt(statsRow.active_campaigns) || 0,
        totalMessages: parseInt(statsRow.total_messages) || 0,
        sentMessages: parseInt(statsRow.sent_messages) || 0
      }
    };

    logger.info(`[Consultants] Fetched consultant ${id}`);

    res.json({
      success: true,
      data: consultant
    });

  } catch (error) {
    logger.error(`[Consultants] Error fetching consultant: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consultant',
      message: error.message
    });
  }
}

// ==========================================
// CREATE CONSULTANT
// ==========================================

/**
 * Create new consultant and Evolution API instance
 * @route POST /api/consultants
 */
async function createConsultant(req, res) {
  const client = await db.pool.connect();

  try {
    const { name, email, instanceName, dailyLimit = 200, whatsappNumber } = req.body;

    await client.query('BEGIN');

    // Check if email already exists
    const emailCheck = await client.query(
      'SELECT id FROM consultants WHERE email = $1',
      [email]
    );

    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    }

    // Check if instance_name already exists
    const instanceCheck = await client.query(
      'SELECT id FROM consultants WHERE instance_name = $1',
      [instanceName]
    );

    if (instanceCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Instance name already exists'
      });
    }

    // Insert consultant
    const insertQuery = `
      INSERT INTO consultants (name, email, instance_name, daily_limit, whatsapp_number, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id, name, email, instance_name, status, daily_limit, created_at
    `;

    const result = await client.query(insertQuery, [
      name,
      email,
      instanceName,
      dailyLimit,
      whatsappNumber || null
    ]);

    await client.query('COMMIT');

    const consultant = result.rows[0];

    logger.info(`[Consultants] Created consultant ${consultant.id}: ${consultant.name}`);

    // Try to create Evolution API instance (async, don't wait)
    createEvolutionInstance(consultant.id, instanceName).catch(err => {
      logger.error(`[Consultants] Failed to create Evolution instance for ${consultant.id}: ${err.message}`);
    });

    res.status(201).json({
      success: true,
      data: consultant,
      message: 'Consultant created successfully. WhatsApp instance will be initialized shortly.'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`[Consultants] Error creating consultant: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to create consultant',
      message: error.message
    });
  } finally {
    client.release();
  }
}

// ==========================================
// UPDATE CONSULTANT
// ==========================================

/**
 * Update consultant
 * @route PUT /api/consultants/:id
 */
async function updateConsultant(req, res) {
  try {
    const { id } = req.params;
    const { name, email, dailyLimit, status, whatsappNumber } = req.body;

    // Check if consultant exists
    const checkQuery = 'SELECT id FROM consultants WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Consultant not found'
      });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      params.push(name);
      paramCount++;
    }

    if (email !== undefined) {
      updates.push(`email = $${paramCount}`);
      params.push(email);
      paramCount++;
    }

    if (dailyLimit !== undefined) {
      updates.push(`daily_limit = $${paramCount}`);
      params.push(dailyLimit);
      paramCount++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (whatsappNumber !== undefined) {
      updates.push(`whatsapp_number = $${paramCount}`);
      params.push(whatsappNumber || null);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    params.push(id);

    const updateQuery = `
      UPDATE consultants
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, name, email, instance_name, status, daily_limit, whatsapp_number, updated_at
    `;

    const result = await db.query(updateQuery, params);

    logger.info(`[Consultants] Updated consultant ${id}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Consultant updated successfully'
    });

  } catch (error) {
    logger.error(`[Consultants] Error updating consultant: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to update consultant',
      message: error.message
    });
  }
}

// ==========================================
// DELETE CONSULTANT
// ==========================================

/**
 * Delete consultant (will cascade delete campaigns, messages, etc.)
 * @route DELETE /api/consultants/:id
 */
async function deleteConsultant(req, res) {
  try {
    const { id } = req.params;

    // Get consultant data before deletion
    const getQuery = 'SELECT instance_name FROM consultants WHERE id = $1';
    const getResult = await db.query(getQuery, [id]);

    if (getResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Consultant not found'
      });
    }

    const { instance_name } = getResult.rows[0];

    // Delete consultant (will cascade)
    const deleteQuery = 'DELETE FROM consultants WHERE id = $1';
    await db.query(deleteQuery, [id]);

    logger.info(`[Consultants] Deleted consultant ${id}`);

    // Try to delete Evolution API instance (async, don't wait)
    if (instance_name) {
      evolutionClient.deleteInstance(instance_name).catch(err => {
        logger.error(`[Consultants] Failed to delete Evolution instance ${instance_name}: ${err.message}`);
      });
    }

    res.json({
      success: true,
      message: 'Consultant deleted successfully'
    });

  } catch (error) {
    logger.error(`[Consultants] Error deleting consultant: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to delete consultant',
      message: error.message
    });
  }
}

// ==========================================
// GET CONSULTANT QR CODE
// ==========================================

/**
 * Get WhatsApp QR code for consultant
 * @route GET /api/consultants/:id/qrcode
 */
async function getConsultantQRCode(req, res) {
  try {
    const { id } = req.params;

    // Get consultant instance name
    const query = 'SELECT instance_name, status FROM consultants WHERE id = $1';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Consultant not found'
      });
    }

    const { instance_name } = result.rows[0];

    // Get QR code from Evolution API
    const qrData = await evolutionClient.getQRCode(instance_name);

    logger.info(`[Consultants] Fetched QR code for consultant ${id}`);

    res.json({
      success: true,
      data: qrData
    });

  } catch (error) {
    logger.error(`[Consultants] Error fetching QR code: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch QR code',
      message: error.message
    });
  }
}

// ==========================================
// GET CONSULTANT STATUS
// ==========================================

/**
 * Get WhatsApp connection status for consultant
 * @route GET /api/consultants/:id/status
 */
async function getConsultantStatus(req, res) {
  try {
    const { id } = req.params;

    // Get consultant instance name
    const query = 'SELECT instance_name FROM consultants WHERE id = $1';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Consultant not found'
      });
    }

    const { instance_name } = result.rows[0];

    // Get status from Evolution API
    const statusData = await evolutionClient.getInstanceStatus(instance_name);

    // Update consultant status in database if connected
    if (statusData.state === 'open') {
      await db.query(
        'UPDATE consultants SET status = $1 WHERE id = $2',
        ['active', id]
      );
    }

    logger.info(`[Consultants] Fetched status for consultant ${id}: ${statusData.state}`);

    res.json({
      success: true,
      data: statusData
    });

  } catch (error) {
    logger.error(`[Consultants] Error fetching status: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch status',
      message: error.message
    });
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Create Evolution API instance for consultant
 * @private
 */
async function createEvolutionInstance(consultantId, instanceName) {
  try {
    logger.info(`[Consultants] Creating Evolution instance for consultant ${consultantId}`);

    await evolutionClient.createInstance(instanceName, true);

    // Update consultant status
    await db.query(
      'UPDATE consultants SET status = $1 WHERE id = $2',
      ['pending', consultantId]
    );

    logger.info(`[Consultants] Evolution instance created for consultant ${consultantId}`);

  } catch (error) {
    logger.error(`[Consultants] Failed to create Evolution instance: ${error.message}`);

    // Update consultant with error status
    await db.query(
      'UPDATE consultants SET status = $1 WHERE id = $2',
      ['inactive', consultantId]
    );

    throw error;
  }
}

// ==========================================
// WARM-UP MANAGEMENT
// ==========================================

/**
 * Get warm-up status for a consultant
 * @route GET /api/consultants/:id/warmup
 */
async function getWarmupStatus(req, res) {
  try {
    const { id } = req.params;
    const WarmupService = require('../services/warmup/warmupService');

    const warmupStatus = await WarmupService.getCurrentLimit(id);

    logger.info(`[Consultants] Retrieved warm-up status for consultant ${id}`);

    res.json({
      success: true,
      data: warmupStatus
    });

  } catch (error) {
    logger.error(`[Consultants] Error getting warmup status: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get warm-up status',
      message: error.message
    });
  }
}

/**
 * Get all consultants warm-up status
 * @route GET /api/consultants/warmup/all
 */
async function getAllWarmupStatus(req, res) {
  try {
    const WarmupService = require('../services/warmup/warmupService');

    const warmupStatuses = await WarmupService.getAllWarmupStatus();

    logger.info(`[Consultants] Retrieved warm-up status for ${warmupStatuses.length} consultants`);

    res.json({
      success: true,
      count: warmupStatuses.length,
      data: warmupStatuses
    });

  } catch (error) {
    logger.error(`[Consultants] Error getting all warmup status: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get warm-up status',
      message: error.message
    });
  }
}

/**
 * Toggle warm-up for a consultant
 * @route POST /api/consultants/:id/warmup/toggle
 */
async function toggleWarmup(req, res) {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    const WarmupService = require('../services/warmup/warmupService');

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'enabled field must be a boolean'
      });
    }

    const result = await WarmupService.setWarmupEnabled(id, enabled);

    logger.info(`[Consultants] Warm-up ${enabled ? 'enabled' : 'disabled'} for consultant ${id}`);

    res.json({
      success: true,
      message: `Warm-up ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: result
    });

  } catch (error) {
    logger.error(`[Consultants] Error toggling warmup: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle warm-up',
      message: error.message
    });
  }
}

/**
 * Reset warm-up start date for a consultant
 * @route POST /api/consultants/:id/warmup/reset
 */
async function resetWarmup(req, res) {
  try {
    const { id } = req.params;
    const { startDate } = req.body;
    const WarmupService = require('../services/warmup/warmupService');

    const result = await WarmupService.resetWarmupDate(id, startDate);

    logger.info(`[Consultants] Warm-up reset for consultant ${id}`);

    res.json({
      success: true,
      message: 'Warm-up date reset successfully',
      data: result
    });

  } catch (error) {
    logger.error(`[Consultants] Error resetting warmup: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to reset warm-up',
      message: error.message
    });
  }
}

/**
 * Get recommended sending schedule
 * @route POST /api/consultants/:id/warmup/schedule
 */
async function getWarmupSchedule(req, res) {
  try {
    const { id } = req.params;
    const { totalMessages } = req.body;
    const WarmupService = require('../services/warmup/warmupService');

    if (!totalMessages || totalMessages < 1) {
      return res.status(400).json({
        success: false,
        error: 'totalMessages must be a positive number'
      });
    }

    const schedule = await WarmupService.getRecommendedSchedule(id, totalMessages);

    logger.info(`[Consultants] Generated schedule for ${totalMessages} messages for consultant ${id}`);

    res.json({
      success: true,
      data: schedule
    });

  } catch (error) {
    logger.error(`[Consultants] Error getting warmup schedule: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommended schedule',
      message: error.message
    });
  }
}

// ==========================================
// CONSULTANT DASHBOARD
// ==========================================

/**
 * Get consultant dashboard with stats and recent activity
 * @route GET /api/consultants/dashboard
 * @protected - requires authentication
 */
async function getConsultantDashboard(req, res) {
  try {
    // Get consultant from auth middleware
    const consultant = req.consultant;

    if (!consultant) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Consultant not found'
      });
    }

    logger.info(`[Consultants] Fetching dashboard for consultant ${consultant.id}`);

    // Get stats
    const stats = await getDashboardStats(consultant.id);

    // Get recent campaigns
    const recentCampaigns = await getRecentCampaigns(consultant.id, 5);

    // Consultant info (exclude sensitive data)
    const consultantInfo = {
      id: consultant.id,
      name: consultant.name,
      email: consultant.email,
      phone: consultant.phone,
      status: consultant.status,
      instanceName: consultant.instance_name,
      whatsappNumber: consultant.whatsapp_number,
      connectedAt: consultant.connected_at,
      lastActiveAt: consultant.last_active_at
    };

    res.json({
      success: true,
      data: {
        consultant: consultantInfo,
        stats: {
          whatsappStatus: consultant.status,
          totalContacts: stats.contacts_count,
          totalCampaigns: stats.campaigns_count,
          messagesSentToday: stats.messages_sent_today,
          totalMessagesSent: stats.messages_sent_total,
          readRate: stats.read_rate,
          warmupStatus: stats.warmup_status
        },
        recentCampaigns: recentCampaigns
      }
    });

  } catch (error) {
    logger.error(`[Consultants] Error fetching dashboard: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard',
      message: error.message
    });
  }
}

/**
 * Calculate dashboard statistics for a consultant
 * @param {number} consultantId - Consultant ID
 * @returns {Promise<Object>} Dashboard stats
 */
async function getDashboardStats(consultantId) {
  const stats = {};

  try {
    // Contacts count
    const contactsResult = await db.query(
      'SELECT COUNT(*) FROM contacts WHERE consultant_id = $1',
      [consultantId]
    );
    stats.contacts_count = parseInt(contactsResult.rows[0].count);

    // Campaigns count
    const campaignsResult = await db.query(
      'SELECT COUNT(*) FROM campaigns WHERE consultant_id = $1',
      [consultantId]
    );
    stats.campaigns_count = parseInt(campaignsResult.rows[0].count);

    // Messages sent today
    const todayResult = await db.query(`
      SELECT COUNT(*) FROM messages m
      JOIN campaigns c ON m.campaign_id = c.id
      WHERE c.consultant_id = $1
        AND DATE(m.created_at) = CURRENT_DATE
        AND m.status IN ('sent', 'delivered', 'read')
    `, [consultantId]);
    stats.messages_sent_today = parseInt(todayResult.rows[0].count);

    // Total messages
    const totalResult = await db.query(`
      SELECT COUNT(*) FROM messages m
      JOIN campaigns c ON m.campaign_id = c.id
      WHERE c.consultant_id = $1
        AND m.status IN ('sent', 'delivered', 'read')
    `, [consultantId]);
    stats.messages_sent_total = parseInt(totalResult.rows[0].count);

    // Read rate
    const readResult = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE m.status = 'read') as read_count,
        COUNT(*) FILTER (WHERE m.status IN ('sent', 'delivered', 'read')) as total_count
      FROM messages m
      JOIN campaigns c ON m.campaign_id = c.id
      WHERE c.consultant_id = $1
    `, [consultantId]);

    const readData = readResult.rows[0];
    const totalSent = parseInt(readData.total_count) || 0;
    const readCount = parseInt(readData.read_count) || 0;
    stats.read_rate = totalSent > 0 ? ((readCount / totalSent) * 100).toFixed(1) : 0;

    // Warm-up status
    const consultantResult = await db.query(
      'SELECT connected_at, daily_limit FROM consultants WHERE id = $1',
      [consultantId]
    );

    const consultantData = consultantResult.rows[0];

    if (consultantData && consultantData.connected_at) {
      const WarmupService = require('../services/warmup/warmupService');
      const warmupStatus = await WarmupService.getCurrentLimit(consultantId);

      stats.warmup_status = {
        currentPhase: warmupStatus.phase,
        currentDailyLimit: warmupStatus.limit,
        messagesSentToday: stats.messages_sent_today,
        percentageUsed: warmupStatus.limit > 0
          ? ((stats.messages_sent_today / warmupStatus.limit) * 100).toFixed(1)
          : 0,
        messagesRemaining: Math.max(0, warmupStatus.limit - stats.messages_sent_today),
        isActive: true,
        daysInPhase: warmupStatus.daysInPhase || 0
      };
      stats.daily_limit = warmupStatus.limit;
    } else {
      stats.daily_limit = 0;
      stats.warmup_status = null;
    }

    logger.debug(`[Consultants] Dashboard stats calculated for consultant ${consultantId}`);
    return stats;

  } catch (error) {
    logger.error(`[Consultants] Error calculating dashboard stats: ${error.message}`);
    throw error;
  }
}

/**
 * Get recent campaigns for a consultant
 * @param {number} consultantId - Consultant ID
 * @param {number} limit - Number of campaigns to fetch
 * @returns {Promise<Array>} Recent campaigns
 */
async function getRecentCampaigns(consultantId, limit = 5) {
  try {
    const result = await db.query(`
      SELECT
        id, name, message_template, status,
        total_recipients, sent_count, delivered_count, read_count,
        reply_count, failed_count,
        started_at, completed_at, created_at
      FROM campaigns
      WHERE consultant_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [consultantId, limit]);

    return result.rows.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      totalRecipients: campaign.total_recipients || 0,
      messagesSent: campaign.sent_count || 0,
      messagesDelivered: campaign.delivered_count || 0,
      messagesRead: campaign.read_count || 0,
      repliesReceived: campaign.reply_count || 0,
      messagesFailed: campaign.failed_count || 0,
      progress: {
        total: campaign.total_recipients || 0,
        sent: campaign.sent_count || 0,
        delivered: campaign.delivered_count || 0,
        read: campaign.read_count || 0,
        replied: campaign.reply_count || 0,
        failed: campaign.failed_count || 0
      },
      startedAt: campaign.started_at,
      completedAt: campaign.completed_at,
      createdAt: campaign.created_at
    }));

  } catch (error) {
    logger.error(`[Consultants] Error fetching recent campaigns: ${error.message}`);
    return [];
  }
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  getAllConsultants,
  getConsultantById,
  createConsultant,
  updateConsultant,
  deleteConsultant,
  getConsultantQRCode,
  getConsultantStatus,
  // Warm-up endpoints
  getWarmupStatus,
  getAllWarmupStatus,
  toggleWarmup,
  resetWarmup,
  getWarmupSchedule,
  // Dashboard
  getConsultantDashboard
};

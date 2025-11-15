const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Admin Controller
 * Handles admin-only operations for managing consultants and system
 */

// ==========================================
// GET ALL CONSULTANTS (ADMIN VIEW)
// ==========================================

/**
 * Get all consultants with statistics (admin only)
 * @route GET /api/admin/consultants
 * @access Admin only
 */
async function getAllConsultantsAdmin(req, res) {
  try {
    logger.info('[Admin] Fetching all consultants with stats');

    const query = `
      SELECT
        c.id,
        c.name,
        c.email,
        c.phone,
        c.instance_name,
        c.whatsapp_number,
        c.status,
        c.daily_limit,
        c.spam_risk_score,
        c.connected_at,
        c.last_active_at,
        c.is_active,
        c.created_at,
        -- Contact count
        (SELECT COUNT(*) FROM contacts WHERE consultant_id = c.id) as contacts_count,
        -- Messages sent today
        (SELECT COUNT(*) FROM messages m
         JOIN campaigns cp ON m.campaign_id = cp.id
         WHERE cp.consultant_id = c.id
           AND DATE(m.created_at) = CURRENT_DATE
           AND m.status IN ('sent', 'delivered', 'read')
        ) as messages_sent_today,
        -- Total messages
        (SELECT COUNT(*) FROM messages m
         JOIN campaigns cp ON m.campaign_id = cp.id
         WHERE cp.consultant_id = c.id
           AND m.status IN ('sent', 'delivered', 'read')
        ) as total_messages,
        -- Campaign count
        (SELECT COUNT(*) FROM campaigns WHERE consultant_id = c.id) as campaigns_count
      FROM consultants c
      WHERE c.role = 'consultant'
      ORDER BY c.created_at DESC
    `;

    const result = await db.query(query);

    const consultants = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      instance_name: row.instance_name,
      whatsapp_number: row.whatsapp_number,
      status: row.status,
      is_active: row.is_active,
      daily_limit: row.daily_limit,
      spam_risk_score: row.spam_risk_score,
      connected_at: row.connected_at,
      last_active_at: row.last_active_at,
      created_at: row.created_at,
      stats: {
        contacts_count: parseInt(row.contacts_count) || 0,
        messages_sent_today: parseInt(row.messages_sent_today) || 0,
        total_messages: parseInt(row.total_messages) || 0,
        campaigns_count: parseInt(row.campaigns_count) || 0
      }
    }));

    res.json({
      success: true,
      count: consultants.length,
      data: consultants
    });

  } catch (error) {
    logger.error(`[Admin] Error fetching consultants: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consultants',
      message: error.message
    });
  }
}

// ==========================================
// SYSTEM STATISTICS
// ==========================================

/**
 * Get overall system statistics (admin only)
 * @route GET /api/admin/stats
 * @access Admin only
 */
async function getSystemStats(req, res) {
  try {
    logger.info('[Admin] Fetching system statistics');

    // Total consultants
    const consultantsResult = await db.query(
      "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active') as active FROM consultants WHERE role = 'consultant'"
    );

    // Total contacts
    const contactsResult = await db.query('SELECT COUNT(*) FROM contacts');

    // Total messages (today and all time)
    const messagesResult = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND status IN ('sent', 'delivered', 'read')) as today,
        COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'read')) as total
      FROM messages
    `);

    // Total campaigns
    const campaignsResult = await db.query("SELECT COUNT(*) FROM campaigns");

    // Average spam risk
    const spamRiskResult = await db.query(
      "SELECT AVG(spam_risk_score) as avg_risk FROM consultants WHERE role = 'consultant'"
    );

    const stats = {
      consultants: {
        total: parseInt(consultantsResult.rows[0].total) || 0,
        active: parseInt(consultantsResult.rows[0].active) || 0
      },
      contacts: {
        total: parseInt(contactsResult.rows[0].count) || 0
      },
      messages: {
        sent_today: parseInt(messagesResult.rows[0].today) || 0,
        sent_total: parseInt(messagesResult.rows[0].total) || 0
      },
      campaigns: {
        total: parseInt(campaignsResult.rows[0].count) || 0
      },
      spam_risk: {
        average: parseFloat(spamRiskResult.rows[0].avg_risk) || 0
      }
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error(`[Admin] Error fetching system stats: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system statistics',
      message: error.message
    });
  }
}

// ==========================================
// UPDATE CONSULTANT (ADMIN)
// ==========================================

/**
 * Update consultant settings (admin only)
 * @route PUT /api/admin/consultants/:id
 * @access Admin only
 */
async function updateConsultantAdmin(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    logger.info(`[Admin] Updating consultant ${id}`);

    // Allowed fields for admin update
    const allowedFields = ['is_active', 'daily_limit', 'spam_risk_score', 'status'];
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
        allowed_fields: allowedFields
      });
    }

    // Add updated_at
    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    // Add consultant ID
    values.push(id);

    const query = `
      UPDATE consultants
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND role = 'consultant'
      RETURNING id, name, email, status, is_active, daily_limit, spam_risk_score
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Consultant not found'
      });
    }

    logger.info(`[Admin] Consultant ${id} updated successfully`);

    res.json({
      success: true,
      message: 'Consultant updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error(`[Admin] Error updating consultant: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to update consultant',
      message: error.message
    });
  }
}

// ==========================================
// DEACTIVATE/ACTIVATE CONSULTANT
// ==========================================

/**
 * Deactivate or activate a consultant (admin only)
 * @route POST /api/admin/consultants/:id/toggle-active
 * @access Admin only
 */
async function toggleConsultantActive(req, res) {
  try {
    const { id } = req.params;

    logger.info(`[Admin] Toggling active status for consultant ${id}`);

    // Get current status
    const currentResult = await db.query(
      'SELECT is_active FROM consultants WHERE id = $1 AND role = $2',
      [id, 'consultant']
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Consultant not found'
      });
    }

    const currentStatus = currentResult.rows[0].is_active;
    const newStatus = !currentStatus;

    // Update status
    const updateResult = await db.query(
      `UPDATE consultants
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, name, email, is_active`,
      [newStatus, id]
    );

    logger.info(`[Admin] Consultant ${id} ${newStatus ? 'activated' : 'deactivated'}`);

    res.json({
      success: true,
      message: `Consultant ${newStatus ? 'activated' : 'deactivated'} successfully`,
      data: updateResult.rows[0]
    });

  } catch (error) {
    logger.error(`[Admin] Error toggling consultant status: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle consultant status',
      message: error.message
    });
  }
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  getAllConsultantsAdmin,
  getSystemStats,
  updateConsultantAdmin,
  toggleConsultantActive
};

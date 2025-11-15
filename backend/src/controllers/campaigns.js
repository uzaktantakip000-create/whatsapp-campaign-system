const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Campaigns Controller
 * Handles all business logic for campaign management
 */

// ==========================================
// GET ALL CAMPAIGNS
// ==========================================

/**
 * Get all campaigns with pagination and filtering
 * @route GET /api/campaigns
 */
async function getAllCampaigns(req, res) {
  try {
    const { page = 1, limit = 20, consultant_id, status, search, sort = 'created_at', order = 'desc' } = req.query;
    const offset = (page - 1) * limit;

    // Build query
    let whereClause = [];
    let params = [];
    let paramCount = 1;

    if (consultant_id) {
      whereClause.push(`consultant_id = $${paramCount}`);
      params.push(consultant_id);
      paramCount++;
    }

    if (status) {
      whereClause.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (search) {
      whereClause.push(`name ILIKE $${paramCount}`);
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereSQL = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM campaigns ${whereSQL}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get campaigns with consultant info
    const dataQuery = `
      SELECT
        c.id, c.name, c.message_template, c.status,
        c.total_recipients, c.sent_count, c.failed_count,
        c.delivered_count, c.read_count, c.reply_count,
        c.started_at, c.completed_at,
        c.created_at, c.updated_at,
        co.id as consultant_id, co.name as consultant_name, co.email as consultant_email
      FROM campaigns c
      INNER JOIN consultants co ON c.consultant_id = co.id
      ${whereSQL}
      ORDER BY c.${sort} ${order}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(limit, offset);

    const result = await db.query(dataQuery, params);

    // Format response
    const campaigns = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      message_template: row.message_template,
      status: row.status,
      started_at: row.started_at,
      completed_at: row.completed_at,
      stats: {
        total_recipients: row.total_recipients,
        sent_count: row.sent_count,
        delivered_count: row.delivered_count,
        read_count: row.read_count,
        reply_count: row.reply_count,
        failed_count: row.failed_count
      },
      consultant: {
        id: row.consultant_id,
        name: row.consultant_name,
        email: row.consultant_email
      },
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    logger.info(`[Campaigns] Fetched ${campaigns.length} campaigns (page ${page})`);

    res.json({
      success: true,
      data: campaigns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error(`[Campaigns] Error fetching campaigns: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns',
      message: error.message
    });
  }
}

// ==========================================
// GET SINGLE CAMPAIGN
// ==========================================

/**
 * Get campaign by ID
 * @route GET /api/campaigns/:id
 */
async function getCampaignById(req, res) {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        c.id, c.name, c.message_template, c.status,
        c.total_recipients, c.sent_count, c.failed_count,
        c.delivered_count, c.read_count, c.reply_count,
        c.started_at, c.completed_at,
        c.created_at, c.updated_at,
        co.id as consultant_id, co.name as consultant_name,
        co.email as consultant_email, co.instance_name
      FROM campaigns c
      INNER JOIN consultants co ON c.consultant_id = co.id
      WHERE c.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const row = result.rows[0];

    // Get message stats
    const statsQuery = `
      SELECT
        status,
        COUNT(*) as count
      FROM messages
      WHERE campaign_id = $1
      GROUP BY status
    `;

    const statsResult = await db.query(statsQuery, [id]);

    const messageStats = statsResult.rows.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count);
      return acc;
    }, {});

    const campaign = {
      id: row.id,
      name: row.name,
      message_template: row.message_template,
      status: row.status,
      started_at: row.started_at,
      completed_at: row.completed_at,
      stats: {
        total_recipients: row.total_recipients,
        sent_count: row.sent_count,
        delivered_count: row.delivered_count,
        read_count: row.read_count,
        reply_count: row.reply_count,
        failed_count: row.failed_count,
        by_status: messageStats
      },
      consultant: {
        id: row.consultant_id,
        name: row.consultant_name,
        email: row.consultant_email,
        instance_name: row.instance_name
      },
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    logger.info(`[Campaigns] Fetched campaign ${id}`);

    res.json({
      success: true,
      data: campaign
    });

  } catch (error) {
    logger.error(`[Campaigns] Error fetching campaign: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign',
      message: error.message
    });
  }
}

// ==========================================
// CREATE CAMPAIGN
// ==========================================

/**
 * Create new campaign
 * @route POST /api/campaigns
 */
async function createCampaign(req, res) {
  try {
    const {
      consultant_id,
      name,
      message_template
    } = req.body;

    // Check if consultant exists and is active
    const consultantCheck = await db.query(
      'SELECT id, status FROM consultants WHERE id = $1',
      [consultant_id]
    );

    if (consultantCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Consultant not found'
      });
    }

    if (consultantCheck.rows[0].status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Consultant must be active to create campaigns'
      });
    }

    // Insert campaign
    const insertQuery = `
      INSERT INTO campaigns (
        consultant_id, name, message_template, status
      )
      VALUES ($1, $2, $3, 'draft')
      RETURNING id, name, status, created_at
    `;

    const result = await db.query(insertQuery, [
      consultant_id,
      name,
      message_template
    ]);

    const campaign = result.rows[0];

    logger.info(`[Campaigns] Created campaign ${campaign.id}: ${campaign.name}`);

    res.status(201).json({
      success: true,
      data: campaign,
      message: 'Campaign created successfully'
    });

  } catch (error) {
    logger.error(`[Campaigns] Error creating campaign: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to create campaign',
      message: error.message
    });
  }
}

// ==========================================
// UPDATE CAMPAIGN
// ==========================================

/**
 * Update campaign
 * @route PUT /api/campaigns/:id
 */
async function updateCampaign(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      message_template,
      status
    } = req.body;

    // Check if campaign exists
    const checkQuery = 'SELECT id, status FROM campaigns WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const currentStatus = checkResult.rows[0].status;

    // Don't allow editing completed or cancelled campaigns
    if (['completed', 'cancelled'].includes(currentStatus)) {
      return res.status(400).json({
        success: false,
        error: `Cannot edit ${currentStatus} campaigns`
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

    if (message_template !== undefined) {
      updates.push(`message_template = $${paramCount}`);
      params.push(message_template);
      paramCount++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      params.push(status);
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
      UPDATE campaigns
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, name, status, message_template, updated_at
    `;

    const result = await db.query(updateQuery, params);

    logger.info(`[Campaigns] Updated campaign ${id}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Campaign updated successfully'
    });

  } catch (error) {
    logger.error(`[Campaigns] Error updating campaign: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign',
      message: error.message
    });
  }
}

// ==========================================
// DELETE CAMPAIGN
// ==========================================

/**
 * Delete campaign (will cascade delete messages)
 * @route DELETE /api/campaigns/:id
 */
async function deleteCampaign(req, res) {
  try {
    const { id } = req.params;

    // Check if campaign exists
    const checkQuery = 'SELECT id, status FROM campaigns WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const currentStatus = checkResult.rows[0].status;

    // Don't allow deleting running campaigns
    if (currentStatus === 'running') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete running campaigns. Please pause it first.'
      });
    }

    // Delete campaign (will cascade delete messages)
    const deleteQuery = 'DELETE FROM campaigns WHERE id = $1';
    await db.query(deleteQuery, [id]);

    logger.info(`[Campaigns] Deleted campaign ${id}`);

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });

  } catch (error) {
    logger.error(`[Campaigns] Error deleting campaign: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to delete campaign',
      message: error.message
    });
  }
}

// ==========================================
// START CAMPAIGN
// ==========================================

/**
 * Start/activate campaign
 * @route POST /api/campaigns/:id/start
 */
async function startCampaign(req, res) {
  try {
    const { id } = req.params;

    // Get campaign details
    const query = `
      SELECT c.id, c.status, c.consultant_id, co.status as consultant_status
      FROM campaigns c
      INNER JOIN consultants co ON c.consultant_id = co.id
      WHERE c.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const { status, consultant_status } = result.rows[0];

    // Validate campaign can be started
    if (status === 'running') {
      return res.status(400).json({
        success: false,
        error: 'Campaign is already running'
      });
    }

    if (['completed', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot start ${status} campaigns`
      });
    }

    if (consultant_status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Consultant must be active to start campaign'
      });
    }

    // Update campaign status to running
    const updateQuery = `
      UPDATE campaigns
      SET status = 'running', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, status, started_at, updated_at
    `;

    const updateResult = await db.query(updateQuery, [id]);

    logger.info(`[Campaigns] Started campaign ${id}`);

    res.json({
      success: true,
      data: updateResult.rows[0],
      message: 'Campaign started successfully'
    });

  } catch (error) {
    logger.error(`[Campaigns] Error starting campaign: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to start campaign',
      message: error.message
    });
  }
}

// ==========================================
// PAUSE CAMPAIGN
// ==========================================

/**
 * Pause campaign
 * @route POST /api/campaigns/:id/pause
 */
async function pauseCampaign(req, res) {
  try {
    const { id } = req.params;

    // Check if campaign exists and is active
    const checkQuery = 'SELECT id, status FROM campaigns WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const currentStatus = checkResult.rows[0].status;

    if (currentStatus !== 'running') {
      return res.status(400).json({
        success: false,
        error: 'Only running campaigns can be paused'
      });
    }

    // Update campaign status to paused
    const updateQuery = `
      UPDATE campaigns
      SET status = 'paused', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, status, updated_at
    `;

    const updateResult = await db.query(updateQuery, [id]);

    logger.info(`[Campaigns] Paused campaign ${id}`);

    res.json({
      success: true,
      data: updateResult.rows[0],
      message: 'Campaign paused successfully'
    });

  } catch (error) {
    logger.error(`[Campaigns] Error pausing campaign: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to pause campaign',
      message: error.message
    });
  }
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  getAllCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  startCampaign,
  pauseCampaign
};

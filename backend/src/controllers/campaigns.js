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
    const { page = 1, limit = 20, consultantId, status, search, sort = 'created_at', order = 'desc' } = req.query;
    const offset = (page - 1) * limit;

    // Build query
    let whereClause = [];
    let params = [];
    let paramCount = 1;

    if (consultantId) {
      whereClause.push(`c.consultant_id = $${paramCount}`);
      params.push(consultantId);
      paramCount++;
    }

    if (status) {
      whereClause.push(`c.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (search) {
      whereClause.push(`c.name ILIKE $${paramCount}`);
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereSQL = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM campaigns c ${whereSQL}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get campaigns with consultant info
    const dataQuery = `
      SELECT
        c.id, c.name, c.message_template, c.template_id, c.segment_filter, c.use_ai_variations, c.status,
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

    // Format response (camelCase for frontend)
    const campaigns = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      messageTemplate: row.message_template,
      templateId: row.template_id,
      segmentFilter: row.segment_filter,
      useAiVariations: row.use_ai_variations,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      totalRecipients: row.total_recipients,
      messagesSent: row.sent_count,
      messagesDelivered: row.delivered_count,
      messagesRead: row.read_count,
      repliesReceived: row.reply_count,
      messagesFailed: row.failed_count,
      consultant: {
        id: row.consultant_id,
        name: row.consultant_name,
        email: row.consultant_email
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at
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
        c.id, c.name, c.message_template, c.template_id, c.segment_filter, c.use_ai_variations, c.status,
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
      messageTemplate: row.message_template,
      templateId: row.template_id,
      segmentFilter: row.segment_filter,
      useAiVariations: row.use_ai_variations,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      stats: {
        totalRecipients: row.total_recipients,
        sentCount: row.sent_count,
        deliveredCount: row.delivered_count,
        readCount: row.read_count,
        replyCount: row.reply_count,
        failedCount: row.failed_count,
        byStatus: messageStats
      },
      consultant: {
        id: row.consultant_id,
        name: row.consultant_name,
        email: row.consultant_email,
        instanceName: row.instance_name
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at
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
      message_template,
      template_id,
      use_ai_variations,
      segment_filter
    } = req.body;

    // Check if consultant exists
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

    // Note: We allow campaign creation even if consultant is not active
    // They will need to be active to START the campaign, but can create drafts

    // If template_id provided, validate it belongs to consultant
    if (template_id) {
      const templateCheck = await db.query(
        'SELECT id, content FROM message_templates WHERE id = $1 AND consultant_id = $2',
        [template_id, consultant_id]
      );

      if (templateCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Template not found or does not belong to this consultant'
        });
      }

      // If message_template not provided, use template content
      if (!message_template) {
        req.body.message_template = templateCheck.rows[0].content;
      }
    }

    // Insert campaign
    const insertQuery = `
      INSERT INTO campaigns (
        consultant_id, name, message_template, template_id, use_ai_variations, segment_filter, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'draft')
      RETURNING id, name, message_template, template_id, status, created_at
    `;

    const result = await db.query(insertQuery, [
      consultant_id,
      name,
      message_template || req.body.message_template,
      template_id || null,
      use_ai_variations || false,
      segment_filter || null
    ]);

    const campaign = result.rows[0];

    logger.info(`[Campaigns] Created campaign ${campaign.id}: ${campaign.name}`);

    res.status(201).json({
      success: true,
      data: {
        id: campaign.id,
        name: campaign.name,
        messageTemplate: campaign.message_template,
        templateId: campaign.template_id,
        status: campaign.status,
        createdAt: campaign.created_at
      },
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
      messageTemplate,
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

    if (messageTemplate !== undefined) {
      updates.push(`message_template = $${paramCount}`);
      params.push(messageTemplate);
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
// ADD RECIPIENTS TO CAMPAIGN
// ==========================================

/**
 * Add recipients to campaign (bulk or single)
 * @route POST /api/campaigns/:id/recipients
 */
async function addRecipients(req, res) {
  try {
    const { id } = req.params;
    const { contactIds, segmentFilter } = req.body;

    // Check if campaign exists and is in draft status
    const campaignCheck = await db.query(
      'SELECT id, status, consultant_id FROM campaigns WHERE id = $1',
      [id]
    );

    if (campaignCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const campaign = campaignCheck.rows[0];

    if (campaign.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Can only add recipients to draft campaigns'
      });
    }

    let recipientsToAdd = [];

    // If specific contactIds provided, use those
    if (contactIds && contactIds.length > 0) {
      // Validate that all contacts belong to the consultant
      const contactsQuery = `
        SELECT id FROM contacts
        WHERE id = ANY($1) AND consultant_id = $2
      `;
      const contactsResult = await db.query(contactsQuery, [contactIds, campaign.consultant_id]);

      if (contactsResult.rows.length !== contactIds.length) {
        return res.status(400).json({
          success: false,
          error: 'Some contacts do not belong to this consultant'
        });
      }

      recipientsToAdd = contactIds;
    }
    // If segmentFilter provided, get all contacts from that segment
    else if (segmentFilter) {
      const segments = segmentFilter.split(',').map(s => s.trim());
      const segmentQuery = `
        SELECT id FROM contacts
        WHERE consultant_id = $1 AND segment = ANY($2)
      `;
      const segmentResult = await db.query(segmentQuery, [campaign.consultant_id, segments]);
      recipientsToAdd = segmentResult.rows.map(r => r.id);
    }
    // If neither provided, add all contacts
    else {
      const allContactsQuery = `
        SELECT id FROM contacts WHERE consultant_id = $1
      `;
      const allContactsResult = await db.query(allContactsQuery, [campaign.consultant_id]);
      recipientsToAdd = allContactsResult.rows.map(r => r.id);
    }

    if (recipientsToAdd.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No contacts found to add'
      });
    }

    // Insert recipients (ON CONFLICT DO NOTHING to avoid duplicates)
    const insertValues = recipientsToAdd.map((contactId, i) =>
      `($1, $${i + 2})`
    ).join(',');

    const insertQuery = `
      INSERT INTO campaign_recipients (campaign_id, contact_id)
      VALUES ${insertValues}
      ON CONFLICT (campaign_id, contact_id) DO NOTHING
    `;

    await db.query(insertQuery, [id, ...recipientsToAdd]);

    // Get updated recipient count
    const countQuery = `
      SELECT COUNT(*) as total FROM campaign_recipients WHERE campaign_id = $1
    `;
    const countResult = await db.query(countQuery, [id]);
    const total = parseInt(countResult.rows[0].total);

    logger.info(`[Campaigns] Added ${recipientsToAdd.length} recipients to campaign ${id}`);

    res.json({
      success: true,
      data: {
        added: recipientsToAdd.length,
        total: total
      },
      message: `Added ${recipientsToAdd.length} recipients to campaign`
    });

  } catch (error) {
    logger.error(`[Campaigns] Error adding recipients: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to add recipients',
      message: error.message
    });
  }
}

// ==========================================
// REMOVE RECIPIENT FROM CAMPAIGN
// ==========================================

/**
 * Remove recipient from campaign
 * @route DELETE /api/campaigns/:id/recipients/:contactId
 */
async function removeRecipient(req, res) {
  try {
    const { id, contactId } = req.params;

    // Check if campaign exists and is in draft status
    const campaignCheck = await db.query(
      'SELECT id, status FROM campaigns WHERE id = $1',
      [id]
    );

    if (campaignCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    if (campaignCheck.rows[0].status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Can only remove recipients from draft campaigns'
      });
    }

    // Delete recipient
    const deleteQuery = `
      DELETE FROM campaign_recipients
      WHERE campaign_id = $1 AND contact_id = $2
    `;

    const result = await db.query(deleteQuery, [id, contactId]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recipient not found in this campaign'
      });
    }

    logger.info(`[Campaigns] Removed recipient ${contactId} from campaign ${id}`);

    res.json({
      success: true,
      message: 'Recipient removed from campaign'
    });

  } catch (error) {
    logger.error(`[Campaigns] Error removing recipient: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to remove recipient',
      message: error.message
    });
  }
}

// ==========================================
// GET CAMPAIGN RECIPIENTS
// ==========================================

/**
 * Get all recipients for a campaign
 * @route GET /api/campaigns/:id/recipients
 */
async function getCampaignRecipients(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    // Check if campaign exists
    const campaignCheck = await db.query('SELECT id FROM campaigns WHERE id = $1', [id]);

    if (campaignCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Build query
    let whereClause = 'WHERE cr.campaign_id = $1';
    const params = [id];
    let paramCount = 2;

    if (status) {
      whereClause += ` AND cr.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) FROM campaign_recipients cr ${whereClause}
    `;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get recipients
    params.push(limit, offset);
    const dataQuery = `
      SELECT
        cr.id, cr.contact_id, cr.status, cr.sent_at, cr.delivered_at, cr.read_at, cr.error_message,
        c.name, c.number, c.segment
      FROM campaign_recipients cr
      INNER JOIN contacts c ON cr.contact_id = c.id
      ${whereClause}
      ORDER BY cr.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await db.query(dataQuery, params);

    const recipients = result.rows.map(row => ({
      id: row.id,
      contactId: row.contact_id,
      name: row.name,
      number: row.number,
      segment: row.segment,
      status: row.status,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      readAt: row.read_at,
      errorMessage: row.error_message
    }));

    res.json({
      success: true,
      data: recipients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error(`[Campaigns] Error fetching recipients: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recipients',
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
  pauseCampaign,
  addRecipients,
  removeRecipient,
  getCampaignRecipients
};

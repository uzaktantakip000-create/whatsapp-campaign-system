const db = require('../config/database');
const logger = require('../utils/logger');
const TemplateEngine = require('../services/templateEngine');

/**
 * Templates Controller
 * Handles all business logic for message template management
 */

// Allowed sort columns for SQL injection prevention
const ALLOWED_SORT_COLUMNS = ['id', 'name', 'category', 'created_at', 'updated_at', 'usage_count', 'is_active'];
const ALLOWED_ORDER_VALUES = ['asc', 'desc'];

function validateSortParams(sort, order) {
  const safeSort = ALLOWED_SORT_COLUMNS.includes(sort) ? sort : 'created_at';
  const safeOrder = ALLOWED_ORDER_VALUES.includes(order?.toLowerCase()) ? order.toLowerCase() : 'desc';
  return { safeSort, safeOrder };
}

// ==========================================
// GET ALL TEMPLATES
// ==========================================

/**
 * Get all templates with pagination and filtering
 * @route GET /api/templates
 */
async function getAllTemplates(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      consultantId,
      category,
      isActive,
      search,
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

    if (consultantId) {
      whereClause.push(`consultant_id = $${paramCount}`);
      params.push(consultantId);
      paramCount++;
    }

    if (category) {
      whereClause.push(`category = $${paramCount}`);
      params.push(category);
      paramCount++;
    }

    if (isActive !== undefined) {
      whereClause.push(`is_active = $${paramCount}`);
      params.push(isActive === 'true' || isActive === true);
      paramCount++;
    }

    if (search) {
      whereClause.push(`(name ILIKE $${paramCount} OR content ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereSQL = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM message_templates ${whereSQL}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get templates
    const dataQuery = `
      SELECT
        id, consultant_id, name, content, category,
        variables, is_active, usage_count, created_at, updated_at
      FROM message_templates
      ${whereSQL}
      ORDER BY ${safeSort} ${safeOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(safeLimit, offset);

    const result = await db.query(dataQuery, params);

    // Transform to camelCase
    const templates = result.rows.map(template => ({
      id: template.id,
      consultantId: template.consultant_id,
      name: template.name,
      content: template.content,
      category: template.category,
      variables: typeof template.variables === 'string' ? JSON.parse(template.variables) : template.variables,
      isActive: template.is_active,
      usageCount: template.usage_count,
      createdAt: template.created_at,
      updatedAt: template.updated_at
    }));

    logger.info(`[Templates] Fetched ${templates.length} templates (page ${page})`);

    res.json({
      success: true,
      data: templates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error(`[Templates] Error fetching templates: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
      message: error.message
    });
  }
}

// ==========================================
// GET SINGLE TEMPLATE
// ==========================================

/**
 * Get template by ID
 * @route GET /api/templates/:id
 */
async function getTemplateById(req, res) {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        id, consultant_id, name, content, category,
        variables, is_active, usage_count, created_at, updated_at
      FROM message_templates
      WHERE id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const template = result.rows[0];

    // Parse JSONB field
    if (typeof template.variables === 'string') {
      template.variables = JSON.parse(template.variables);
    }

    logger.info(`[Templates] Fetched template ${id}`);

    res.json({
      success: true,
      data: template
    });

  } catch (error) {
    logger.error(`[Templates] Error fetching template: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template',
      message: error.message
    });
  }
}

// ==========================================
// CREATE TEMPLATE
// ==========================================

/**
 * Create new template
 * @route POST /api/templates
 */
async function createTemplate(req, res) {
  try {
    const {
      consultantId,
      name,
      content,
      category,
      isActive = true
    } = req.body;

    // Validate template content
    const validation = TemplateEngine.validate(content);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template content',
        details: validation.errors
      });
    }

    // Extract variables
    const variables = validation.variables;

    // Check if consultant exists
    const consultantCheck = await db.query(
      'SELECT id FROM consultants WHERE id = $1',
      [consultantId]
    );

    if (consultantCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Consultant not found'
      });
    }

    // Check for duplicate name
    const duplicateCheck = await db.query(
      'SELECT id FROM message_templates WHERE consultant_id = $1 AND name = $2',
      [consultantId, name]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Template with this name already exists for this consultant'
      });
    }

    // Insert template
    const insertQuery = `
      INSERT INTO message_templates (
        consultant_id, name, content, category, variables, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, consultant_id, name, content, category, variables, is_active, created_at
    `;

    const result = await db.query(insertQuery, [
      consultantId,
      name,
      content,
      category,
      JSON.stringify(variables),
      isActive
    ]);

    const template = result.rows[0];
    // Parse JSONB field
    if (typeof template.variables === 'string') {
      template.variables = JSON.parse(template.variables);
    }

    logger.info(`[Templates] Created template ${template.id}: ${template.name}`);

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully'
    });

  } catch (error) {
    logger.error(`[Templates] Error creating template: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to create template',
      message: error.message
    });
  }
}

// ==========================================
// UPDATE TEMPLATE
// ==========================================

/**
 * Update template
 * @route PUT /api/templates/:id
 */
async function updateTemplate(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      content,
      category,
      isActive
    } = req.body;

    // Check if template exists
    const checkQuery = 'SELECT id, consultant_id FROM message_templates WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Validate content if provided
    let variables = null;
    if (content) {
      const validation = TemplateEngine.validate(content);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid template content',
          details: validation.errors
        });
      }
      variables = validation.variables;
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

    if (content !== undefined) {
      updates.push(`content = $${paramCount}`);
      params.push(content);
      paramCount++;

      updates.push(`variables = $${paramCount}`);
      params.push(JSON.stringify(variables));
      paramCount++;
    }

    if (category !== undefined) {
      updates.push(`category = $${paramCount}`);
      params.push(category);
      paramCount++;
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      params.push(isActive);
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
      UPDATE message_templates
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, consultant_id, name, content, category, variables, is_active, updated_at
    `;

    const result = await db.query(updateQuery, params);

    const updatedTemplate = result.rows[0];

    // Parse JSONB field
    if (typeof updatedTemplate.variables === 'string') {
      updatedTemplate.variables = JSON.parse(updatedTemplate.variables);
    }

    logger.info(`[Templates] Updated template ${id}`);

    res.json({
      success: true,
      data: updatedTemplate,
      message: 'Template updated successfully'
    });

  } catch (error) {
    logger.error(`[Templates] Error updating template: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to update template',
      message: error.message
    });
  }
}

// ==========================================
// DELETE TEMPLATE
// ==========================================

/**
 * Delete template
 * @route DELETE /api/templates/:id
 */
async function deleteTemplate(req, res) {
  try {
    const { id } = req.params;

    // Check if template exists
    const checkQuery = 'SELECT id, name FROM message_templates WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Delete template
    const deleteQuery = 'DELETE FROM message_templates WHERE id = $1';
    await db.query(deleteQuery, [id]);

    logger.info(`[Templates] Deleted template ${id}: ${checkResult.rows[0].name}`);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    logger.error(`[Templates] Error deleting template: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template',
      message: error.message
    });
  }
}

// ==========================================
// PREVIEW TEMPLATE
// ==========================================

/**
 * Preview template with sample data
 * @route POST /api/templates/:id/preview
 */
async function previewTemplate(req, res) {
  try {
    const { id } = req.params;
    const { variables } = req.body;

    // Get template
    const query = 'SELECT id, content FROM message_templates WHERE id = $1';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const template = result.rows[0];

    // Generate preview
    const preview = TemplateEngine.preview(template.content, variables || {});

    logger.info(`[Templates] Generated preview for template ${id}`);

    res.json({
      success: true,
      data: {
        templateId: id,
        original: template.content,
        preview: preview,
        variablesUsed: TemplateEngine.extractVariables(template.content)
      }
    });

  } catch (error) {
    logger.error(`[Templates] Error previewing template: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to preview template',
      message: error.message
    });
  }
}

// ==========================================
// RENDER TEMPLATE
// ==========================================

/**
 * Render template with actual variables
 * @route POST /api/templates/:id/render
 */
async function renderTemplate(req, res) {
  try {
    const { id } = req.params;
    const { variables } = req.body;

    if (!variables || typeof variables !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Variables object is required'
      });
    }

    // Get template
    const query = 'SELECT id, content, usage_count FROM message_templates WHERE id = $1 AND is_active = true';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found or inactive'
      });
    }

    const template = result.rows[0];

    // Render template
    const rendered = TemplateEngine.render(template.content, variables);

    // Increment usage count
    await db.query(
      'UPDATE message_templates SET usage_count = usage_count + 1 WHERE id = $1',
      [id]
    );

    logger.info(`[Templates] Rendered template ${id} (usage: ${template.usage_count + 1})`);

    res.json({
      success: true,
      data: {
        templateId: id,
        rendered: rendered
      }
    });

  } catch (error) {
    logger.error(`[Templates] Error rendering template: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to render template',
      message: error.message
    });
  }
}

// ==========================================
// GENERATE VARIATIONS (OpenAI)
// ==========================================

/**
 * Generate variations using OpenAI
 * @route POST /api/templates/:id/generate-variations
 */
async function generateVariations(req, res) {
  try {
    const { id } = req.params;
    const {
      count = 3,
      tone = 'professional',
      context = '',
      variables = {}
    } = req.body;

    // Import OpenAI client here to avoid circular dependency
    const openaiClient = require('../services/openai/client');

    // Check if OpenAI is enabled
    if (!openaiClient.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'OpenAI service is not enabled. Please configure OPENAI_API_KEY.'
      });
    }

    // Get template
    const query = 'SELECT id, content, name FROM message_templates WHERE id = $1 AND is_active = true';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found or inactive'
      });
    }

    const template = result.rows[0];

    // Render template with variables first (if provided)
    let baseMessage = template.content;
    if (Object.keys(variables).length > 0) {
      try {
        baseMessage = TemplateEngine.render(template.content, variables);
      } catch (error) {
        logger.warn(`[Templates] Could not render template, using raw content: ${error.message}`);
      }
    }

    // Generate variations using OpenAI
    logger.info(`[Templates] Generating ${count} variations for template ${id}`);

    const variationResult = await openaiClient.generateMultipleVariations(
      baseMessage,
      count,
      {
        tone,
        context,
        preserveMeaning: true
      }
    );

    logger.info(`[Templates] Generated ${variationResult.variations.length} variations`);

    res.json({
      success: true,
      data: {
        templateId: id,
        templateName: template.name,
        baseMessage: baseMessage,
        variations: variationResult.variations,
        count: variationResult.variations.length,
        tone: tone,
        usage: variationResult.usage,
        cost: variationResult.cost
      }
    });

  } catch (error) {
    logger.error(`[Templates] Error generating variations: ${error.message}`);

    // Check if it's an OpenAI API error (401, 403, etc.)
    if (error.message && error.message.includes('401')) {
      return res.status(503).json({
        success: false,
        error: 'OpenAI service error - Invalid API key',
        message: 'Please configure a valid OPENAI_API_KEY in .env file'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate variations',
      message: error.message
    });
  }
}

// ==========================================
// IMPROVE TEMPLATE (OpenAI)
// ==========================================

/**
 * Improve template content using OpenAI
 * @route POST /api/templates/:id/improve
 */
async function improveTemplate(req, res) {
  try {
    const { id } = req.params;
    const {
      tone = 'professional',
      goal = 'increase engagement'
    } = req.body;

    // Import OpenAI client
    const openaiClient = require('../services/openai/client');

    // Check if OpenAI is enabled
    if (!openaiClient.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'OpenAI service is not enabled. Please configure OPENAI_API_KEY.'
      });
    }

    // Get template
    const query = 'SELECT id, content, name FROM message_templates WHERE id = $1';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const template = result.rows[0];

    // Improve template using OpenAI
    logger.info(`[Templates] Improving template ${id} (goal: ${goal})`);

    const improvementResult = await openaiClient.improveTemplate(
      template.content,
      { tone, goal }
    );

    logger.info(`[Templates] Template improved successfully`);

    res.json({
      success: true,
      data: {
        templateId: id,
        templateName: template.name,
        original: improvementResult.original,
        improved: improvementResult.improved,
        tone: tone,
        goal: goal,
        usage: improvementResult.usage,
        cost: improvementResult.cost
      }
    });

  } catch (error) {
    logger.error(`[Templates] Error improving template: ${error.message}`);

    // Check if it's an OpenAI API error (401, 403, etc.)
    if (error.message && error.message.includes('401')) {
      return res.status(503).json({
        success: false,
        error: 'OpenAI service error - Invalid API key',
        message: 'Please configure a valid OPENAI_API_KEY in .env file'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to improve template',
      message: error.message
    });
  }
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
  renderTemplate,
  generateVariations,
  improveTemplate
};

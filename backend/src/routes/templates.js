const express = require('express');
const router = express.Router();
const templatesController = require('../controllers/templates');
const {
  createTemplateSchema,
  updateTemplateSchema,
  templateQuerySchema,
  renderTemplateSchema,
  previewTemplateSchema,
  generateVariationsSchema,
  improveTemplateSchema
} = require('../validators/schemas');
const { validateBody, validateQuery, validateParams } = require('../middleware/validator');
const { requireAuth } = require('../middleware/auth');

/**
 * Templates Routes
 * All routes for message template management
 * All routes require authentication
 */

// ==========================================
// GET /api/templates
// Get all templates with pagination and filtering
// ==========================================
router.get(
  '/',
  requireAuth,
  validateQuery(templateQuerySchema),
  templatesController.getAllTemplates
);

// ==========================================
// GET /api/templates/:id
// Get template by ID
// ==========================================
router.get(
  '/:id',
  requireAuth,
  validateParams('id'),
  templatesController.getTemplateById
);

// ==========================================
// POST /api/templates
// Create new template
// ==========================================
router.post(
  '/',
  requireAuth,
  validateBody(createTemplateSchema),
  templatesController.createTemplate
);

// ==========================================
// PUT /api/templates/:id
// Update template
// ==========================================
router.put(
  '/:id',
  requireAuth,
  validateParams('id'),
  validateBody(updateTemplateSchema),
  templatesController.updateTemplate
);

// ==========================================
// DELETE /api/templates/:id
// Delete template
// ==========================================
router.delete(
  '/:id',
  requireAuth,
  validateParams('id'),
  templatesController.deleteTemplate
);

// ==========================================
// POST /api/templates/:id/preview
// Preview template with sample data
// ==========================================
router.post(
  '/:id/preview',
  requireAuth,
  validateParams('id'),
  validateBody(previewTemplateSchema),
  templatesController.previewTemplate
);

// ==========================================
// POST /api/templates/:id/render
// Render template with actual variables
// ==========================================
router.post(
  '/:id/render',
  requireAuth,
  validateParams('id'),
  validateBody(renderTemplateSchema),
  templatesController.renderTemplate
);

// ==========================================
// POST /api/templates/:id/generate-variations
// Generate variations using OpenAI
// ==========================================
router.post(
  '/:id/generate-variations',
  requireAuth,
  validateParams('id'),
  validateBody(generateVariationsSchema),
  templatesController.generateVariations
);

// ==========================================
// POST /api/templates/:id/improve
// Improve template using OpenAI
// ==========================================
router.post(
  '/:id/improve',
  requireAuth,
  validateParams('id'),
  validateBody(improveTemplateSchema),
  templatesController.improveTemplate
);

module.exports = router;

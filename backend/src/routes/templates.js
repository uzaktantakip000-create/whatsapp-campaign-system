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

/**
 * Templates Routes
 * All routes for message template management
 */

// ==========================================
// GET /api/templates
// Get all templates with pagination and filtering
// ==========================================
router.get(
  '/',
  validateQuery(templateQuerySchema),
  templatesController.getAllTemplates
);

// ==========================================
// GET /api/templates/:id
// Get template by ID
// ==========================================
router.get(
  '/:id',
  validateParams('id'),
  templatesController.getTemplateById
);

// ==========================================
// POST /api/templates
// Create new template
// ==========================================
router.post(
  '/',
  validateBody(createTemplateSchema),
  templatesController.createTemplate
);

// ==========================================
// PUT /api/templates/:id
// Update template
// ==========================================
router.put(
  '/:id',
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
  validateParams('id'),
  templatesController.deleteTemplate
);

// ==========================================
// POST /api/templates/:id/preview
// Preview template with sample data
// ==========================================
router.post(
  '/:id/preview',
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
  validateParams('id'),
  validateBody(improveTemplateSchema),
  templatesController.improveTemplate
);

module.exports = router;

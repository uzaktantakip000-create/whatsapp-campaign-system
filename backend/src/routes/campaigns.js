const express = require('express');
const router = express.Router();
const campaignsController = require('../controllers/campaigns');
const { createCampaignSchema, updateCampaignSchema, campaignQuerySchema } = require('../validators/schemas');
const { validateBody, validateQuery, validateParams } = require('../middleware/validator');
const { requireAuth } = require('../middleware/auth');

/**
 * Campaigns Routes
 * All routes for campaign management
 * All routes require authentication
 */

// ==========================================
// GET /api/campaigns
// Get all campaigns with pagination and filtering
// ==========================================
router.get(
  '/',
  requireAuth,
  validateQuery(campaignQuerySchema),
  campaignsController.getAllCampaigns
);

// ==========================================
// GET /api/campaigns/:id
// Get campaign by ID
// ==========================================
router.get(
  '/:id',
  requireAuth,
  validateParams('id'),
  campaignsController.getCampaignById
);

// ==========================================
// POST /api/campaigns
// Create new campaign
// ==========================================
router.post(
  '/',
  requireAuth,
  validateBody(createCampaignSchema),
  campaignsController.createCampaign
);

// ==========================================
// PUT /api/campaigns/:id
// Update campaign
// ==========================================
router.put(
  '/:id',
  requireAuth,
  validateParams('id'),
  validateBody(updateCampaignSchema),
  campaignsController.updateCampaign
);

// ==========================================
// DELETE /api/campaigns/:id
// Delete campaign
// ==========================================
router.delete(
  '/:id',
  requireAuth,
  validateParams('id'),
  campaignsController.deleteCampaign
);

// ==========================================
// POST /api/campaigns/:id/start
// Start/activate campaign
// ==========================================
router.post(
  '/:id/start',
  requireAuth,
  validateParams('id'),
  campaignsController.startCampaign
);

// ==========================================
// POST /api/campaigns/:id/pause
// Pause campaign
// ==========================================
router.post(
  '/:id/pause',
  requireAuth,
  validateParams('id'),
  campaignsController.pauseCampaign
);

// ==========================================
// POST /api/campaigns/:id/recipients
// Add recipients to campaign
// ==========================================
router.post(
  '/:id/recipients',
  requireAuth,
  validateParams('id'),
  campaignsController.addRecipients
);

// ==========================================
// GET /api/campaigns/:id/recipients
// Get campaign recipients
// ==========================================
router.get(
  '/:id/recipients',
  requireAuth,
  validateParams('id'),
  campaignsController.getCampaignRecipients
);

// ==========================================
// DELETE /api/campaigns/:id/recipients/:contactId
// Remove recipient from campaign
// ==========================================
router.delete(
  '/:id/recipients/:contactId',
  requireAuth,
  validateParams('id'),
  validateParams('contactId'),
  campaignsController.removeRecipient
);

module.exports = router;

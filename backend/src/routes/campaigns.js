const express = require('express');
const router = express.Router();
const campaignsController = require('../controllers/campaigns');
const { createCampaignSchema, updateCampaignSchema, campaignQuerySchema } = require('../validators/schemas');
const { validateBody, validateQuery, validateParams } = require('../middleware/validator');

/**
 * Campaigns Routes
 * All routes for campaign management
 */

// ==========================================
// GET /api/campaigns
// Get all campaigns with pagination and filtering
// ==========================================
router.get(
  '/',
  validateQuery(campaignQuerySchema),
  campaignsController.getAllCampaigns
);

// ==========================================
// GET /api/campaigns/:id
// Get campaign by ID
// ==========================================
router.get(
  '/:id',
  validateParams('id'),
  campaignsController.getCampaignById
);

// ==========================================
// POST /api/campaigns
// Create new campaign
// ==========================================
router.post(
  '/',
  validateBody(createCampaignSchema),
  campaignsController.createCampaign
);

// ==========================================
// PUT /api/campaigns/:id
// Update campaign
// ==========================================
router.put(
  '/:id',
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
  validateParams('id'),
  campaignsController.deleteCampaign
);

// ==========================================
// POST /api/campaigns/:id/start
// Start/activate campaign
// ==========================================
router.post(
  '/:id/start',
  validateParams('id'),
  campaignsController.startCampaign
);

// ==========================================
// POST /api/campaigns/:id/pause
// Pause campaign
// ==========================================
router.post(
  '/:id/pause',
  validateParams('id'),
  campaignsController.pauseCampaign
);

// ==========================================
// POST /api/campaigns/:id/recipients
// Add recipients to campaign
// ==========================================
router.post(
  '/:id/recipients',
  validateParams('id'),
  campaignsController.addRecipients
);

// ==========================================
// GET /api/campaigns/:id/recipients
// Get campaign recipients
// ==========================================
router.get(
  '/:id/recipients',
  validateParams('id'),
  campaignsController.getCampaignRecipients
);

// ==========================================
// DELETE /api/campaigns/:id/recipients/:contactId
// Remove recipient from campaign
// ==========================================
router.delete(
  '/:id/recipients/:contactId',
  validateParams('id'),
  validateParams('contactId'),
  campaignsController.removeRecipient
);

module.exports = router;

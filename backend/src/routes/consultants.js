const express = require('express');
const router = express.Router();
const consultantsController = require('../controllers/consultants');
const { createConsultantSchema, updateConsultantSchema, consultantQuerySchema } = require('../validators/schemas');
const { validateBody, validateQuery, validateParams } = require('../middleware/validator');
const { requireAuth } = require('../middleware/auth');

/**
 * Consultants Routes
 * All routes for consultant management
 */

// ==========================================
// SPECIFIC ROUTES (MUST COME BEFORE /:id)
// ==========================================

/**
 * @swagger
 * /api/consultants/dashboard:
 *   get:
 *     summary: Get consultant dashboard
 *     description: Retrieve comprehensive dashboard data for the authenticated consultant including stats, campaigns, and warmup status
 *     tags: [Consultants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     consultant:
 *                       type: object
 *                       description: Consultant profile information
 *                     stats:
 *                       type: object
 *                       properties:
 *                         contactsCount:
 *                           type: integer
 *                         campaignsCount:
 *                           type: integer
 *                         messagesSentToday:
 *                           type: integer
 *                         messagesTotalSent:
 *                           type: integer
 *                         readRate:
 *                           type: number
 *                           format: float
 *                         warmupStatus:
 *                           type: object
 *                           properties:
 *                             enabled:
 *                               type: boolean
 *                             phase:
 *                               type: string
 *                             dailyLimit:
 *                               type: integer
 *                             remainingToday:
 *                               type: integer
 *                     recentCampaigns:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized - Invalid or missing token
 */
router.get(
  '/dashboard',
  requireAuth,
  consultantsController.getConsultantDashboard
);

// GET /api/consultants/warmup/all
// Get warm-up status for all consultants
router.get(
  '/warmup/all',
  consultantsController.getAllWarmupStatus
);

// ==========================================
// GENERAL ROUTES
// ==========================================

// GET /api/consultants
// Get all consultants with pagination and filtering
router.get(
  '/',
  validateQuery(consultantQuerySchema),
  consultantsController.getAllConsultants
);

// ==========================================
// PARAMETERIZED ROUTES (MUST COME AFTER SPECIFIC ROUTES)
// ==========================================

// GET /api/consultants/:id
// Get consultant by ID
router.get(
  '/:id',
  validateParams('id'),
  consultantsController.getConsultantById
);

// ==========================================
// POST /api/consultants
// Create new consultant
// ==========================================
router.post(
  '/',
  validateBody(createConsultantSchema),
  consultantsController.createConsultant
);

// ==========================================
// PUT /api/consultants/:id
// Update consultant
// ==========================================
router.put(
  '/:id',
  validateParams('id'),
  validateBody(updateConsultantSchema),
  consultantsController.updateConsultant
);

// ==========================================
// DELETE /api/consultants/:id
// Delete consultant
// ==========================================
router.delete(
  '/:id',
  validateParams('id'),
  consultantsController.deleteConsultant
);

// ==========================================
// GET /api/consultants/:id/qrcode
// Get WhatsApp QR code for consultant
// ==========================================
router.get(
  '/:id/qrcode',
  validateParams('id'),
  consultantsController.getConsultantQRCode
);

// ==========================================
// GET /api/consultants/:id/status
// Get WhatsApp connection status
// ==========================================
router.get(
  '/:id/status',
  validateParams('id'),
  consultantsController.getConsultantStatus
);

// ==========================================
// WARM-UP ROUTES (PARAMETERIZED)
// ==========================================

// GET /api/consultants/:id/warmup
// Get warm-up status for a consultant
router.get(
  '/:id/warmup',
  validateParams('id'),
  consultantsController.getWarmupStatus
);

// POST /api/consultants/:id/warmup/toggle
// Toggle warm-up for a consultant
router.post(
  '/:id/warmup/toggle',
  validateParams('id'),
  consultantsController.toggleWarmup
);

// POST /api/consultants/:id/warmup/reset
// Reset warm-up start date
router.post(
  '/:id/warmup/reset',
  validateParams('id'),
  consultantsController.resetWarmup
);

// POST /api/consultants/:id/warmup/schedule
// Get recommended sending schedule
router.post(
  '/:id/warmup/schedule',
  validateParams('id'),
  consultantsController.getWarmupSchedule
);

// ==========================================
// GET /api/consultants/:id/contacts
// Get all contacts for this consultant
// ==========================================
const contactsController = require('../controllers/contacts');
router.get(
  '/:id/contacts',
  validateParams('id'),
  contactsController.getContactsByConsultant
);

module.exports = router;

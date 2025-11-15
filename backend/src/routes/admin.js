const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin');
const { requireAuth, requireRole } = require('../middleware/auth');

/**
 * Admin Routes
 * All routes require admin role
 */

// Apply admin role requirement to all routes
router.use(requireAuth);
router.use(requireRole('admin'));

/**
 * @swagger
 * /api/admin/consultants:
 *   get:
 *     summary: Get all consultants (admin)
 *     description: Retrieve all consultants with detailed statistics (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Consultants retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       is_active:
 *                         type: boolean
 *                       whatsapp_status:
 *                         type: string
 *                       contacts_count:
 *                         type: integer
 *                       campaigns_count:
 *                         type: integer
 *                       messages_sent:
 *                         type: integer
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get(
  '/consultants',
  adminController.getAllConsultantsAdmin
);

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get system statistics
 *     description: Retrieve system-wide statistics (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics retrieved successfully
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
 *                     totalConsultants:
 *                       type: integer
 *                       example: 15
 *                     activeConsultants:
 *                       type: integer
 *                       example: 12
 *                     totalContacts:
 *                       type: integer
 *                       example: 5420
 *                     totalCampaigns:
 *                       type: integer
 *                       example: 87
 *                     totalMessagesSent:
 *                       type: integer
 *                       example: 12450
 *                     messagesLastWeek:
 *                       type: integer
 *                       example: 2340
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get(
  '/stats',
  adminController.getSystemStats
);

// ==========================================
// PUT /api/admin/consultants/:id
// Update consultant settings
// ==========================================
router.put(
  '/consultants/:id',
  adminController.updateConsultantAdmin
);

// ==========================================
// POST /api/admin/consultants/:id/toggle-active
// Activate or deactivate consultant
// ==========================================
router.post(
  '/consultants/:id/toggle-active',
  adminController.toggleConsultantActive
);

module.exports = router;

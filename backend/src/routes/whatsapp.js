const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp');
const { requireAuth } = require('../middleware/auth');

/**
 * WhatsApp Routes
 * Handles WhatsApp connection, QR code, and status
 * All routes are protected - require authentication
 */

/**
 * @swagger
 * /api/whatsapp/connect:
 *   post:
 *     summary: Connect to WhatsApp
 *     description: Initialize WhatsApp connection and get QR code for scanning
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QR code generated successfully
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
 *                     qrCode:
 *                       type: string
 *                       description: Base64 encoded QR code image
 *                     instanceName:
 *                       type: string
 *                       example: "consultant_john_123"
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       description: QR code expiration time (45 seconds)
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error - Evolution API connection failed
 */
router.post('/connect', requireAuth, whatsappController.connect);

/**
 * @swagger
 * /api/whatsapp/status:
 *   get:
 *     summary: Get WhatsApp connection status
 *     description: Check current WhatsApp connection status for the authenticated consultant
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connection status retrieved successfully
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
 *                     status:
 *                       type: string
 *                       enum: [pending, active, offline]
 *                       description: Current connection status
 *                       example: "active"
 *                     instanceName:
 *                       type: string
 *                       example: "consultant_john_123"
 *                     whatsappNumber:
 *                       type: string
 *                       example: "+905551234567@s.whatsapp.net"
 *                       nullable: true
 *                     connectedAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error
 */
router.get('/status', requireAuth, whatsappController.getStatus);

/**
 * @swagger
 * /api/whatsapp/disconnect:
 *   post:
 *     summary: Disconnect from WhatsApp
 *     description: Disconnect the authenticated consultant from WhatsApp and delete the instance
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Disconnected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Disconnected successfully"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: No active WhatsApp connection found
 *       500:
 *         description: Server error
 */
router.post('/disconnect', requireAuth, whatsappController.disconnect);

module.exports = router;

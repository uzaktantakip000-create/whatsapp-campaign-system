const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messages');
const { sendMessageSchema, messageQuerySchema } = require('../validators/schemas');
const { validateBody, validateQuery, validateParams } = require('../middleware/validator');
const { requireAuth } = require('../middleware/auth');

/**
 * Messages Routes
 * All routes for message management
 * All routes require authentication
 */

// ==========================================
// GET /api/messages
// Get all messages with pagination and filtering
// ==========================================
router.get(
  '/',
  requireAuth,
  validateQuery(messageQuerySchema),
  messagesController.getAllMessages
);

// ==========================================
// GET /api/messages/stats
// Get message statistics
// ==========================================
router.get(
  '/stats',
  requireAuth,
  messagesController.getMessageStats
);

// ==========================================
// GET /api/messages/:id
// Get message by ID
// ==========================================
router.get(
  '/:id',
  requireAuth,
  validateParams('id'),
  messagesController.getMessageById
);

// ==========================================
// POST /api/messages/send
// Send message with anti-spam protection
// ==========================================
router.post(
  '/send',
  requireAuth,
  validateBody(sendMessageSchema),
  messagesController.sendMessage
);

module.exports = router;

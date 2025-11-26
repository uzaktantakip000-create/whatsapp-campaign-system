const express = require('express');
const router = express.Router();
const contactsController = require('../controllers/contacts');
const { createContactSchema, updateContactSchema, contactQuerySchema } = require('../validators/schemas');
const { validateBody, validateQuery, validateParams } = require('../middleware/validator');
const upload = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');

/**
 * Contacts Routes
 * All routes for contact management
 *
 * IMPORTANT: Specific routes (import/export) must come BEFORE parameterized routes (:id)
 */

// ==========================================
// GET /api/contacts
// Get all contacts with pagination and filtering
// ==========================================
router.get(
  '/',
  requireAuth,
  validateQuery(contactQuerySchema),
  contactsController.getAllContacts
);

// ==========================================
// GET /api/contacts/export
// Export contacts to CSV file
// (Must come BEFORE /:id route)
// ==========================================
router.get(
  '/export',
  requireAuth,
  validateQuery(contactQuerySchema),
  contactsController.exportContacts
);

// ==========================================
// GET /api/contacts/:id
// Get contact by ID
// ==========================================
router.get(
  '/:id',
  requireAuth,
  validateParams('id'),
  contactsController.getContactById
);

// ==========================================
// POST /api/contacts
// Create new contact
// ==========================================
router.post(
  '/',
  requireAuth,
  validateBody(createContactSchema),
  contactsController.createContact
);

// ==========================================
// POST /api/contacts/import
// Import contacts from CSV file
// (Must come BEFORE /:id route)
// ==========================================
router.post(
  '/import',
  requireAuth,
  upload.single('file'),
  contactsController.importContacts
);

/**
 * @swagger
 * /api/contacts/sync:
 *   post:
 *     summary: Sync contacts from WhatsApp
 *     description: Synchronize all contacts from WhatsApp to the database for the authenticated consultant
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contacts synchronized successfully
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
 *                     total:
 *                       type: integer
 *                       description: Total contacts fetched from WhatsApp
 *                       example: 150
 *                     inserted:
 *                       type: integer
 *                       description: Number of new contacts added
 *                       example: 45
 *                     updated:
 *                       type: integer
 *                       description: Number of existing contacts updated
 *                       example: 105
 *                     duration:
 *                       type: number
 *                       description: Sync duration in milliseconds
 *                       example: 2340
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       400:
 *         description: WhatsApp not connected
 *       500:
 *         description: Server error
 */
router.post(
  '/sync',
  requireAuth,
  contactsController.syncContactsFromWhatsApp
);

// ==========================================
// PUT /api/contacts/:id
// Update contact
// ==========================================
router.put(
  '/:id',
  requireAuth,
  validateParams('id'),
  validateBody(updateContactSchema),
  contactsController.updateContact
);

// ==========================================
// DELETE /api/contacts/:id
// Delete contact
// ==========================================
router.delete(
  '/:id',
  requireAuth,
  validateParams('id'),
  contactsController.deleteContact
);

module.exports = router;

const express = require('express');
const router = express.Router();
const webhooksController = require('../controllers/webhooks');

/**
 * Webhooks Routes
 * Handles incoming webhooks from external services
 */

/**
 * @route   POST /api/webhooks/evolution
 * @desc    Handle Evolution API webhook events
 * @access  Public (called by Evolution API)
 */
router.post('/evolution', webhooksController.handleEvolutionWebhook);

module.exports = router;

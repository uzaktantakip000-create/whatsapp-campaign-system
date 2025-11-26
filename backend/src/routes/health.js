const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const deliveryMonitor = require('../services/deliveryMonitor');
const engagementTracker = require('../services/engagementTracker');
const blockDetector = require('../services/blockDetector');
const numberValidator = require('../services/numberValidator');
const smartScheduler = require('../services/smartScheduler');
const spamScoreManager = require('../services/spamScoreManager');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/health/account:
 *   get:
 *     summary: Get comprehensive account health report
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account health report
 */
router.get('/account', requireAuth, async (req, res) => {
  try {
    const consultantId = req.user.id;
    const health = await deliveryMonitor.getAccountHealth(consultantId);

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error(`[HealthAPI] Account health error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get account health',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/health/delivery-stats:
 *   get:
 *     summary: Get delivery statistics
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           default: 24
 *         description: Hours to look back
 */
router.get('/delivery-stats', requireAuth, async (req, res) => {
  try {
    const consultantId = req.user.id;
    const hours = parseInt(req.query.hours) || 24;

    const stats = await deliveryMonitor.getDeliveryStats(consultantId, hours);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error(`[HealthAPI] Delivery stats error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get delivery stats',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/health/delivery-trends:
 *   get:
 *     summary: Get delivery trends over time
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 */
router.get('/delivery-trends', requireAuth, async (req, res) => {
  try {
    const consultantId = req.user.id;
    const days = parseInt(req.query.days) || 7;

    const trends = await deliveryMonitor.getDeliveryTrends(consultantId, days);

    res.json({
      success: true,
      data: trends
    });

  } catch (error) {
    logger.error(`[HealthAPI] Trends error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get delivery trends',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/health/engagement:
 *   get:
 *     summary: Get engagement statistics
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 */
router.get('/engagement', requireAuth, async (req, res) => {
  try {
    const consultantId = req.user.id;
    const stats = await engagementTracker.getEngagementStats(consultantId);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error(`[HealthAPI] Engagement stats error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get engagement stats',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/health/prioritized-contacts:
 *   get:
 *     summary: Get contacts prioritized by engagement
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 */
router.get('/prioritized-contacts', requireAuth, async (req, res) => {
  try {
    const consultantId = req.user.id;
    const { segment, minScore, limit } = req.query;

    const contacts = await engagementTracker.getPrioritizedContacts(consultantId, {
      segment,
      minScore: parseInt(minScore) || 0,
      limit: parseInt(limit) || 50
    });

    res.json({
      success: true,
      data: contacts,
      count: contacts.length
    });

  } catch (error) {
    logger.error(`[HealthAPI] Prioritized contacts error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get prioritized contacts',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/health/block-history:
 *   get:
 *     summary: Get block detection history
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 */
router.get('/block-history', requireAuth, async (req, res) => {
  try {
    const consultantId = req.user.id;
    const days = parseInt(req.query.days) || 30;

    const history = await blockDetector.getBlockHistory(consultantId, days);

    res.json({
      success: true,
      data: history,
      count: history.length
    });

  } catch (error) {
    logger.error(`[HealthAPI] Block history error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get block history',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/health/spam-history:
 *   get:
 *     summary: Get spam score history
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 */
router.get('/spam-history', requireAuth, async (req, res) => {
  try {
    const consultantId = req.user.id;
    const days = parseInt(req.query.days) || 30;

    const history = await spamScoreManager.getSpamHistory(consultantId, days);

    res.json({
      success: true,
      data: history,
      count: history.length
    });

  } catch (error) {
    logger.error(`[HealthAPI] Spam history error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get spam history',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/health/validation-stats:
 *   get:
 *     summary: Get number validation statistics
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 */
router.get('/validation-stats', requireAuth, async (req, res) => {
  try {
    const consultantId = req.user.id;
    const stats = await numberValidator.getValidationStats(consultantId);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error(`[HealthAPI] Validation stats error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get validation stats',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/health/validate-contacts:
 *   post:
 *     summary: Validate all contacts for WhatsApp registration
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 */
router.post('/validate-contacts', requireAuth, async (req, res) => {
  try {
    const consultantId = req.user.id;
    const instanceName = req.user.instanceName;

    if (!instanceName) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp not connected'
      });
    }

    const result = await numberValidator.validateConsultantContacts(consultantId, instanceName);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error(`[HealthAPI] Validate contacts error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to validate contacts',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/health/optimal-time:
 *   get:
 *     summary: Get optimal send time for a contact
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 */
router.get('/optimal-time/:contactId', requireAuth, async (req, res) => {
  try {
    const { contactId } = req.params;
    const optimal = await smartScheduler.getOptimalSendTime(parseInt(contactId));

    res.json({
      success: true,
      data: optimal
    });

  } catch (error) {
    logger.error(`[HealthAPI] Optimal time error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get optimal time',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/health/should-send-now:
 *   get:
 *     summary: Check if current time is good for sending
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 */
router.get('/should-send-now', requireAuth, async (req, res) => {
  try {
    const contactId = req.query.contactId ? parseInt(req.query.contactId) : null;
    const recommendation = await smartScheduler.shouldSendNow(contactId);

    res.json({
      success: true,
      data: recommendation
    });

  } catch (error) {
    logger.error(`[HealthAPI] Should send error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to check send time',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/health/activity-heatmap:
 *   get:
 *     summary: Get activity heatmap for contacts
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 */
router.get('/activity-heatmap', requireAuth, async (req, res) => {
  try {
    const consultantId = req.user.id;
    const heatmap = await smartScheduler.getActivityHeatmap(consultantId);

    res.json({
      success: true,
      data: heatmap
    });

  } catch (error) {
    logger.error(`[HealthAPI] Heatmap error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get activity heatmap',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/health/recalculate-engagement:
 *   post:
 *     summary: Recalculate engagement scores for all contacts
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 */
router.post('/recalculate-engagement', requireAuth, async (req, res) => {
  try {
    const consultantId = req.user.id;
    const result = await engagementTracker.recalculateAllScores(consultantId);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error(`[HealthAPI] Recalculate error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate engagement',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/health/dashboard:
 *   get:
 *     summary: Get complete dashboard data in one call
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 */
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const consultantId = req.user.id;

    // Fetch all data in parallel
    const [
      accountHealth,
      engagementStats,
      deliveryTrends,
      validationStats
    ] = await Promise.all([
      deliveryMonitor.getAccountHealth(consultantId),
      engagementTracker.getEngagementStats(consultantId),
      deliveryMonitor.getDeliveryTrends(consultantId, 7),
      numberValidator.getValidationStats(consultantId)
    ]);

    res.json({
      success: true,
      data: {
        health: accountHealth,
        engagement: engagementStats,
        trends: deliveryTrends,
        validation: validationStats,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error(`[HealthAPI] Dashboard error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to load dashboard',
      message: error.message
    });
  }
});

module.exports = router;

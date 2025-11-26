const db = require('../config/database');
const logger = require('../utils/logger');
const blockDetector = require('./blockDetector');

/**
 * Delivery Monitor Service
 * Monitors message delivery rates and account health
 */

// Health thresholds
const HEALTH_THRESHOLDS = {
  DELIVERY_RATE: {
    HEALTHY: 0.90,      // 90%+ delivery = healthy
    WARNING: 0.75,      // 75-90% = warning
    CRITICAL: 0.50      // Below 50% = critical
  },
  READ_RATE: {
    HEALTHY: 0.60,      // 60%+ read rate = healthy
    WARNING: 0.40,      // 40-60% = warning
    CRITICAL: 0.20      // Below 20% = critical
  },
  REPLY_RATE: {
    EXCELLENT: 0.10,    // 10%+ reply rate = excellent
    GOOD: 0.05,         // 5-10% = good
    AVERAGE: 0.02       // 2-5% = average
  },
  FAILURE_RATE: {
    HEALTHY: 0.05,      // Below 5% = healthy
    WARNING: 0.10,      // 5-10% = warning
    CRITICAL: 0.20      // Above 20% = critical
  }
};

// Health status levels
const HEALTH_STATUS = {
  EXCELLENT: { level: 'excellent', score: 100, color: 'green' },
  HEALTHY: { level: 'healthy', score: 80, color: 'green' },
  WARNING: { level: 'warning', score: 50, color: 'yellow' },
  CRITICAL: { level: 'critical', score: 20, color: 'red' },
  SUSPENDED: { level: 'suspended', score: 0, color: 'black' }
};

/**
 * Get comprehensive account health report
 * @param {number} consultantId - Consultant ID
 * @returns {Promise<Object>} Health report
 */
async function getAccountHealth(consultantId) {
  try {
    // Get consultant info
    const consultantQuery = `
      SELECT
        id, name, status, spam_risk_score, daily_limit,
        connected_at, last_active_at
      FROM consultants
      WHERE id = $1
    `;
    const consultantResult = await db.query(consultantQuery, [consultantId]);

    if (consultantResult.rows.length === 0) {
      throw new Error('Consultant not found');
    }

    const consultant = consultantResult.rows[0];

    // Check if suspended
    if (consultant.status === 'suspended') {
      return {
        consultantId,
        status: HEALTH_STATUS.SUSPENDED,
        healthScore: 0,
        message: 'Account is suspended',
        recommendations: ['Contact admin to reactivate account']
      };
    }

    // Get delivery statistics (last 24 hours)
    const stats24h = await getDeliveryStats(consultantId, 24);

    // Get delivery statistics (last 7 days)
    const stats7d = await getDeliveryStats(consultantId, 168);

    // Calculate health score
    const healthScore = calculateHealthScore(stats24h, consultant.spam_risk_score);

    // Determine health status
    const status = getHealthStatus(healthScore);

    // Generate recommendations
    const recommendations = generateRecommendations(stats24h, stats7d, consultant);

    // Check for block patterns
    const blockCheck = await blockDetector.checkMessagePatterns(consultantId);

    const report = {
      consultantId,
      consultantName: consultant.name,
      status,
      healthScore,
      spamRiskScore: consultant.spam_risk_score,
      connectedSince: consultant.connected_at,
      lastActive: consultant.last_active_at,
      stats: {
        last24Hours: stats24h,
        last7Days: stats7d
      },
      rates: {
        deliveryRate: stats24h.deliveryRate,
        readRate: stats24h.readRate,
        replyRate: stats24h.replyRate,
        failureRate: stats24h.failureRate
      },
      blockDetection: blockCheck,
      recommendations,
      generatedAt: new Date().toISOString()
    };

    // Log if health is concerning
    if (healthScore < 50) {
      logger.warn(`[DeliveryMonitor] Low health score for consultant ${consultantId}: ${healthScore}`);
    }

    return report;

  } catch (error) {
    logger.error(`[DeliveryMonitor] Health check error: ${error.message}`);
    throw error;
  }
}

/**
 * Get delivery statistics for a time period
 * @param {number} consultantId - Consultant ID
 * @param {number} hours - Hours to look back
 * @returns {Promise<Object>} Delivery statistics
 */
async function getDeliveryStats(consultantId, hours) {
  try {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE m.status = 'sent') as sent,
        COUNT(*) FILTER (WHERE m.status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE m.status = 'read') as read,
        COUNT(*) FILTER (WHERE m.status = 'failed') as failed,
        COUNT(*) FILTER (WHERE m.status = 'pending') as pending,
        COUNT(*) FILTER (WHERE m.replied = true) as replied
      FROM messages m
      INNER JOIN campaigns c ON m.campaign_id = c.id
      WHERE c.consultant_id = $1
        AND m.created_at >= NOW() - INTERVAL '${hours} hours'
    `;

    const result = await db.query(query, [consultantId]);
    const data = result.rows[0];

    const total = parseInt(data.total) || 0;
    const sent = parseInt(data.sent) || 0;
    const delivered = parseInt(data.delivered) || 0;
    const read = parseInt(data.read) || 0;
    const failed = parseInt(data.failed) || 0;
    const pending = parseInt(data.pending) || 0;
    const replied = parseInt(data.replied) || 0;

    // Calculate rates (avoid division by zero)
    const successfulSends = sent + delivered + read;
    const deliveryRate = total > 0 ? (delivered + read) / total : 1;
    const readRate = (delivered + read) > 0 ? read / (delivered + read) : 0;
    const replyRate = (sent + delivered + read) > 0 ? replied / (sent + delivered + read) : 0;
    const failureRate = total > 0 ? failed / total : 0;

    return {
      period: `${hours} hours`,
      total,
      sent,
      delivered,
      read,
      failed,
      pending,
      replied,
      deliveryRate: (deliveryRate * 100).toFixed(1) + '%',
      readRate: (readRate * 100).toFixed(1) + '%',
      replyRate: (replyRate * 100).toFixed(1) + '%',
      failureRate: (failureRate * 100).toFixed(1) + '%',
      deliveryRateNum: deliveryRate,
      readRateNum: readRate,
      replyRateNum: replyRate,
      failureRateNum: failureRate
    };

  } catch (error) {
    logger.error(`[DeliveryMonitor] Stats error: ${error.message}`);
    throw error;
  }
}

/**
 * Calculate overall health score
 * @param {Object} stats - Delivery statistics
 * @param {number} spamScore - Current spam risk score
 * @returns {number} Health score (0-100)
 */
function calculateHealthScore(stats, spamScore) {
  let score = 100;

  // Delivery rate impact (40% weight)
  if (stats.deliveryRateNum < HEALTH_THRESHOLDS.DELIVERY_RATE.CRITICAL) {
    score -= 40;
  } else if (stats.deliveryRateNum < HEALTH_THRESHOLDS.DELIVERY_RATE.WARNING) {
    score -= 20;
  } else if (stats.deliveryRateNum < HEALTH_THRESHOLDS.DELIVERY_RATE.HEALTHY) {
    score -= 10;
  }

  // Failure rate impact (30% weight)
  if (stats.failureRateNum > HEALTH_THRESHOLDS.FAILURE_RATE.CRITICAL) {
    score -= 30;
  } else if (stats.failureRateNum > HEALTH_THRESHOLDS.FAILURE_RATE.WARNING) {
    score -= 15;
  } else if (stats.failureRateNum > HEALTH_THRESHOLDS.FAILURE_RATE.HEALTHY) {
    score -= 5;
  }

  // Spam score impact (20% weight)
  score -= (spamScore / 100) * 20;

  // Read rate bonus (10% weight)
  if (stats.readRateNum >= HEALTH_THRESHOLDS.READ_RATE.HEALTHY) {
    score += 5;
  }

  // Reply rate bonus
  if (stats.replyRateNum >= HEALTH_THRESHOLDS.REPLY_RATE.EXCELLENT) {
    score += 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get health status based on score
 * @param {number} score - Health score
 * @returns {Object} Health status
 */
function getHealthStatus(score) {
  if (score >= 90) return HEALTH_STATUS.EXCELLENT;
  if (score >= 70) return HEALTH_STATUS.HEALTHY;
  if (score >= 40) return HEALTH_STATUS.WARNING;
  return HEALTH_STATUS.CRITICAL;
}

/**
 * Generate recommendations based on stats
 * @param {Object} stats24h - 24-hour statistics
 * @param {Object} stats7d - 7-day statistics
 * @param {Object} consultant - Consultant data
 * @returns {Array} Recommendations
 */
function generateRecommendations(stats24h, stats7d, consultant) {
  const recommendations = [];

  // Delivery rate recommendations
  if (stats24h.deliveryRateNum < HEALTH_THRESHOLDS.DELIVERY_RATE.WARNING) {
    recommendations.push({
      priority: 'high',
      type: 'delivery',
      message: 'Delivery rate is low. Consider validating phone numbers before sending.',
      action: 'validate_numbers'
    });
  }

  // Failure rate recommendations
  if (stats24h.failureRateNum > HEALTH_THRESHOLDS.FAILURE_RATE.WARNING) {
    recommendations.push({
      priority: 'high',
      type: 'failure',
      message: 'High failure rate detected. Check message content and recipient numbers.',
      action: 'review_failures'
    });
  }

  // Spam score recommendations
  if (consultant.spam_risk_score >= 50) {
    recommendations.push({
      priority: 'critical',
      type: 'spam',
      message: 'Spam risk score is high. Reduce messaging volume and wait for decay.',
      action: 'reduce_volume'
    });
  }

  // Read rate recommendations
  if (stats24h.readRateNum < HEALTH_THRESHOLDS.READ_RATE.WARNING) {
    recommendations.push({
      priority: 'medium',
      type: 'engagement',
      message: 'Low read rate. Consider improving message timing or content.',
      action: 'improve_content'
    });
  }

  // Volume recommendations
  if (stats24h.total > consultant.daily_limit * 0.9) {
    recommendations.push({
      priority: 'medium',
      type: 'volume',
      message: 'Approaching daily limit. Prioritize high-engagement contacts.',
      action: 'prioritize_contacts'
    });
  }

  // Reply rate recommendations
  if (stats7d.replyRateNum < HEALTH_THRESHOLDS.REPLY_RATE.AVERAGE) {
    recommendations.push({
      priority: 'low',
      type: 'engagement',
      message: 'Reply rate is below average. Consider more personalized messages.',
      action: 'personalize_messages'
    });
  }

  // If no issues, add positive feedback
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'info',
      type: 'positive',
      message: 'Account health is excellent! Keep up the good work.',
      action: 'maintain'
    });
  }

  return recommendations;
}

/**
 * Get delivery trends over time
 * @param {number} consultantId - Consultant ID
 * @param {number} days - Days to analyze
 * @returns {Promise<Array>} Daily delivery data
 */
async function getDeliveryTrends(consultantId, days = 7) {
  try {
    const query = `
      SELECT
        DATE(m.created_at) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE m.status IN ('delivered', 'read')) as delivered,
        COUNT(*) FILTER (WHERE m.status = 'failed') as failed,
        COUNT(*) FILTER (WHERE m.replied = true) as replied
      FROM messages m
      INNER JOIN campaigns c ON m.campaign_id = c.id
      WHERE c.consultant_id = $1
        AND m.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(m.created_at)
      ORDER BY date ASC
    `;

    const result = await db.query(query, [consultantId]);

    return result.rows.map(row => ({
      date: row.date,
      total: parseInt(row.total),
      delivered: parseInt(row.delivered),
      failed: parseInt(row.failed),
      replied: parseInt(row.replied),
      deliveryRate: row.total > 0
        ? ((row.delivered / row.total) * 100).toFixed(1) + '%'
        : '0%'
    }));

  } catch (error) {
    logger.error(`[DeliveryMonitor] Trends error: ${error.message}`);
    throw error;
  }
}

/**
 * Monitor all active consultants and alert on issues
 * @returns {Promise<Object>} Monitoring results
 */
async function monitorAllAccounts() {
  try {
    logger.info('[DeliveryMonitor] Starting account monitoring...');

    const query = `
      SELECT id, name FROM consultants
      WHERE status = 'active' AND connected_at IS NOT NULL
    `;

    const result = await db.query(query);
    const consultants = result.rows;

    const alerts = [];
    const reports = [];

    for (const consultant of consultants) {
      try {
        const health = await getAccountHealth(consultant.id);
        reports.push(health);

        if (health.healthScore < 50) {
          alerts.push({
            consultantId: consultant.id,
            consultantName: consultant.name,
            healthScore: health.healthScore,
            status: health.status.level,
            message: `Account health critical: ${health.healthScore}/100`
          });

          // Log critical accounts
          logger.warn(`[DeliveryMonitor] Critical health for ${consultant.name}: ${health.healthScore}`);
        }
      } catch (err) {
        logger.error(`[DeliveryMonitor] Error monitoring ${consultant.name}: ${err.message}`);
      }
    }

    logger.info(`[DeliveryMonitor] Monitoring complete: ${consultants.length} accounts, ${alerts.length} alerts`);

    return {
      totalAccounts: consultants.length,
      alerts,
      alertCount: alerts.length,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error(`[DeliveryMonitor] Monitoring error: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getAccountHealth,
  getDeliveryStats,
  calculateHealthScore,
  getHealthStatus,
  generateRecommendations,
  getDeliveryTrends,
  monitorAllAccounts,
  HEALTH_THRESHOLDS,
  HEALTH_STATUS
};

const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Block Detector Service
 * Detects when a WhatsApp account is blocked and takes protective action
 */

// Block indicators from Evolution API responses
const BLOCK_INDICATORS = {
  ERROR_CODES: [403, 401, 410],
  ERROR_MESSAGES: [
    'blocked',
    'banned',
    'not authorized',
    'account suspended',
    'temporarily blocked',
    'spam detected',
    'too many requests',
    'rate limit exceeded',
    'number not registered',
    'invalid number'
  ],
  DELIVERY_FAILURE_THRESHOLD: 0.5,  // 50% failure rate triggers warning
  CONSECUTIVE_FAILURES: 5,           // 5 consecutive failures triggers alert
  BLOCK_CHECK_WINDOW_HOURS: 1        // Check last 1 hour for patterns
};

// Block severity levels
const BLOCK_SEVERITY = {
  WARNING: 'warning',      // Possible block, monitor closely
  SUSPECTED: 'suspected',  // Likely blocked, reduce activity
  CONFIRMED: 'confirmed',  // Definitely blocked, stop all activity
  TEMPORARY: 'temporary'   // Temporary rate limit, wait and retry
};

/**
 * Analyze an error response for block indicators
 * @param {Object} error - Error object from Evolution API
 * @param {number} consultantId - Consultant ID
 * @returns {Promise<Object>} Block analysis result
 */
async function analyzeError(error, consultantId) {
  try {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.response?.status || error.code;

    let isBlocked = false;
    let severity = null;
    let reason = null;

    // Check error code
    if (BLOCK_INDICATORS.ERROR_CODES.includes(errorCode)) {
      isBlocked = true;
      severity = errorCode === 403 ? BLOCK_SEVERITY.CONFIRMED : BLOCK_SEVERITY.SUSPECTED;
      reason = `HTTP ${errorCode} error`;
    }

    // Check error message
    for (const indicator of BLOCK_INDICATORS.ERROR_MESSAGES) {
      if (errorMessage.includes(indicator)) {
        isBlocked = true;
        severity = indicator.includes('blocked') || indicator.includes('banned')
          ? BLOCK_SEVERITY.CONFIRMED
          : BLOCK_SEVERITY.WARNING;
        reason = `Error contains: "${indicator}"`;
        break;
      }
    }

    // Log the analysis
    if (isBlocked) {
      logger.warn(`[BlockDetector] Block indicator detected for consultant ${consultantId}: ${reason}`);

      // Record the block event
      await recordBlockEvent(consultantId, severity, {
        errorCode,
        errorMessage: error.message,
        reason
      });

      // Take protective action if confirmed
      if (severity === BLOCK_SEVERITY.CONFIRMED) {
        await suspendConsultant(consultantId, reason);
      }
    }

    return {
      isBlocked,
      severity,
      reason,
      action: getRecommendedAction(severity)
    };

  } catch (err) {
    logger.error(`[BlockDetector] Error analyzing: ${err.message}`);
    return { isBlocked: false, error: err.message };
  }
}

/**
 * Check recent message patterns for block indicators
 * @param {number} consultantId - Consultant ID
 * @returns {Promise<Object>} Pattern analysis result
 */
async function checkMessagePatterns(consultantId) {
  try {
    // Get recent message statistics
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'pending' AND created_at < NOW() - INTERVAL '5 minutes') as stuck,
        array_agg(DISTINCT error_message) FILTER (WHERE error_message IS NOT NULL) as errors
      FROM messages m
      INNER JOIN campaigns c ON m.campaign_id = c.id
      WHERE c.consultant_id = $1
        AND m.created_at >= NOW() - INTERVAL '${BLOCK_INDICATORS.BLOCK_CHECK_WINDOW_HOURS} hours'
    `;

    const result = await db.query(query, [consultantId]);
    const stats = result.rows[0];

    const total = parseInt(stats.total) || 0;
    const failed = parseInt(stats.failed) || 0;
    const stuck = parseInt(stats.stuck) || 0;
    const delivered = parseInt(stats.delivered) || 0;

    // Calculate rates
    const failureRate = total > 0 ? failed / total : 0;
    const deliveryRate = total > 0 ? delivered / total : 1;

    // Analyze patterns
    const analysis = {
      total,
      failed,
      stuck,
      delivered,
      failureRate: (failureRate * 100).toFixed(1) + '%',
      deliveryRate: (deliveryRate * 100).toFixed(1) + '%',
      warnings: [],
      severity: null,
      isHealthy: true
    };

    // Check for warning signs
    if (failureRate >= BLOCK_INDICATORS.DELIVERY_FAILURE_THRESHOLD) {
      analysis.warnings.push(`High failure rate: ${analysis.failureRate}`);
      analysis.severity = BLOCK_SEVERITY.WARNING;
      analysis.isHealthy = false;
    }

    if (stuck >= BLOCK_INDICATORS.CONSECUTIVE_FAILURES) {
      analysis.warnings.push(`${stuck} messages stuck in pending`);
      analysis.severity = BLOCK_SEVERITY.SUSPECTED;
      analysis.isHealthy = false;
    }

    // Check for consecutive failures
    const consecutiveQuery = `
      SELECT status
      FROM messages m
      INNER JOIN campaigns c ON m.campaign_id = c.id
      WHERE c.consultant_id = $1
      ORDER BY m.created_at DESC
      LIMIT ${BLOCK_INDICATORS.CONSECUTIVE_FAILURES}
    `;

    const consecutiveResult = await db.query(consecutiveQuery, [consultantId]);
    const recentStatuses = consecutiveResult.rows.map(r => r.status);

    if (recentStatuses.length >= BLOCK_INDICATORS.CONSECUTIVE_FAILURES &&
        recentStatuses.every(s => s === 'failed')) {
      analysis.warnings.push(`Last ${BLOCK_INDICATORS.CONSECUTIVE_FAILURES} messages all failed`);
      analysis.severity = BLOCK_SEVERITY.CONFIRMED;
      analysis.isHealthy = false;

      // Take protective action
      await suspendConsultant(consultantId, 'Consecutive message failures detected');
    }

    // Check error patterns
    if (stats.errors && stats.errors.length > 0) {
      const blockErrors = stats.errors.filter(e =>
        e && BLOCK_INDICATORS.ERROR_MESSAGES.some(indicator =>
          e.toLowerCase().includes(indicator)
        )
      );

      if (blockErrors.length > 0) {
        analysis.warnings.push(`Block-related errors found: ${blockErrors.join(', ')}`);
        analysis.severity = BLOCK_SEVERITY.SUSPECTED;
        analysis.isHealthy = false;
      }
    }

    // Log if unhealthy
    if (!analysis.isHealthy) {
      logger.warn(`[BlockDetector] Unhealthy patterns for consultant ${consultantId}: ${analysis.warnings.join('; ')}`);

      await recordBlockEvent(consultantId, analysis.severity, {
        type: 'pattern_analysis',
        ...analysis
      });
    }

    return analysis;

  } catch (error) {
    logger.error(`[BlockDetector] Pattern check error: ${error.message}`);
    return { isHealthy: true, error: error.message };
  }
}

/**
 * Record a block event in the database
 * @param {number} consultantId - Consultant ID
 * @param {string} severity - Block severity
 * @param {Object} metadata - Additional metadata
 */
async function recordBlockEvent(consultantId, severity, metadata) {
  try {
    await db.query(
      `INSERT INTO spam_logs (consultant_id, event_type, severity, details, metadata)
       VALUES ($1, 'BLOCK_DETECTED', $2, $3, $4)`,
      [
        consultantId,
        severity,
        `Block detected: ${severity}`,
        JSON.stringify(metadata)
      ]
    );

    // Increase spam score based on severity
    const scoreIncrease = {
      [BLOCK_SEVERITY.WARNING]: 10,
      [BLOCK_SEVERITY.SUSPECTED]: 20,
      [BLOCK_SEVERITY.CONFIRMED]: 50,
      [BLOCK_SEVERITY.TEMPORARY]: 5
    };

    await db.query(
      'UPDATE consultants SET spam_risk_score = LEAST(spam_risk_score + $1, 100) WHERE id = $2',
      [scoreIncrease[severity] || 10, consultantId]
    );

  } catch (error) {
    logger.error(`[BlockDetector] Failed to record block event: ${error.message}`);
  }
}

/**
 * Suspend a consultant's messaging capabilities
 * @param {number} consultantId - Consultant ID
 * @param {string} reason - Suspension reason
 */
async function suspendConsultant(consultantId, reason) {
  try {
    logger.warn(`[BlockDetector] Suspending consultant ${consultantId}: ${reason}`);

    // Update consultant status
    await db.query(
      `UPDATE consultants
       SET status = 'suspended', spam_risk_score = 100, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [consultantId]
    );

    // Pause all running campaigns
    await db.query(
      `UPDATE campaigns
       SET status = 'paused', updated_at = CURRENT_TIMESTAMP
       WHERE consultant_id = $1 AND status = 'running'`,
      [consultantId]
    );

    // Log the suspension
    await db.query(
      `INSERT INTO spam_logs (consultant_id, event_type, severity, details, metadata)
       VALUES ($1, 'ACCOUNT_SUSPENDED', 'critical', $2, $3)`,
      [
        consultantId,
        `Account suspended: ${reason}`,
        JSON.stringify({ reason, timestamp: new Date().toISOString() })
      ]
    );

    logger.warn(`[BlockDetector] Consultant ${consultantId} suspended successfully`);

  } catch (error) {
    logger.error(`[BlockDetector] Failed to suspend consultant: ${error.message}`);
  }
}

/**
 * Reactivate a suspended consultant (admin action)
 * @param {number} consultantId - Consultant ID
 * @param {string} adminNote - Admin's note
 */
async function reactivateConsultant(consultantId, adminNote = '') {
  try {
    logger.info(`[BlockDetector] Reactivating consultant ${consultantId}`);

    await db.query(
      `UPDATE consultants
       SET status = 'active', spam_risk_score = 30, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [consultantId]
    );

    await db.query(
      `INSERT INTO spam_logs (consultant_id, event_type, severity, details, metadata)
       VALUES ($1, 'ACCOUNT_REACTIVATED', 'info', $2, $3)`,
      [
        consultantId,
        `Account reactivated by admin`,
        JSON.stringify({ adminNote, timestamp: new Date().toISOString() })
      ]
    );

    return { success: true, message: 'Consultant reactivated' };

  } catch (error) {
    logger.error(`[BlockDetector] Failed to reactivate consultant: ${error.message}`);
    throw error;
  }
}

/**
 * Get recommended action based on severity
 * @param {string} severity - Block severity
 * @returns {Object} Recommended action
 */
function getRecommendedAction(severity) {
  const actions = {
    [BLOCK_SEVERITY.WARNING]: {
      action: 'REDUCE_ACTIVITY',
      description: 'Reduce message frequency by 50%',
      pauseDuration: 0
    },
    [BLOCK_SEVERITY.SUSPECTED]: {
      action: 'PAUSE_TEMPORARILY',
      description: 'Pause all campaigns for 1 hour',
      pauseDuration: 60 * 60 * 1000
    },
    [BLOCK_SEVERITY.CONFIRMED]: {
      action: 'STOP_ALL',
      description: 'Stop all messaging, manual intervention required',
      pauseDuration: 24 * 60 * 60 * 1000
    },
    [BLOCK_SEVERITY.TEMPORARY]: {
      action: 'WAIT_AND_RETRY',
      description: 'Wait 15 minutes before retrying',
      pauseDuration: 15 * 60 * 1000
    }
  };

  return actions[severity] || actions[BLOCK_SEVERITY.WARNING];
}

/**
 * Get block history for a consultant
 * @param {number} consultantId - Consultant ID
 * @param {number} days - Days to look back
 * @returns {Promise<Array>} Block events
 */
async function getBlockHistory(consultantId, days = 30) {
  try {
    const query = `
      SELECT id, event_type, severity, details, metadata, created_at
      FROM spam_logs
      WHERE consultant_id = $1
        AND event_type IN ('BLOCK_DETECTED', 'ACCOUNT_SUSPENDED', 'ACCOUNT_REACTIVATED')
        AND created_at >= NOW() - INTERVAL '${days} days'
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [consultantId]);

    return result.rows.map(row => ({
      id: row.id,
      eventType: row.event_type,
      severity: row.severity,
      details: row.details,
      metadata: row.metadata,
      createdAt: row.created_at
    }));

  } catch (error) {
    logger.error(`[BlockDetector] Failed to get block history: ${error.message}`);
    return [];
  }
}

module.exports = {
  analyzeError,
  checkMessagePatterns,
  recordBlockEvent,
  suspendConsultant,
  reactivateConsultant,
  getRecommendedAction,
  getBlockHistory,
  BLOCK_INDICATORS,
  BLOCK_SEVERITY
};

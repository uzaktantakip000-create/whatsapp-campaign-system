const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Spam Score Manager Service
 * Handles spam score decay and management
 */

// Decay configuration
const DECAY_CONFIG = {
  DAILY_DECAY: 2,           // Points to remove per day of clean history
  WEEKLY_BONUS: 10,         // Bonus points to remove for 7-day clean record
  MIN_SCORE: 0,             // Minimum spam score
  MAX_SCORE: 100,           // Maximum spam score
  CLEAN_THRESHOLD_HOURS: 24 // Hours without spam events to be considered "clean"
};

/**
 * Apply daily spam score decay for all consultants
 * Should be run once per day (via cron job)
 * @returns {Promise<Object>} Decay statistics
 */
async function applyDailyDecay() {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    logger.info('[SpamScoreManager] Starting daily spam score decay...');

    // Get all consultants with spam_risk_score > 0
    const consultantsQuery = `
      SELECT
        c.id,
        c.name,
        c.spam_risk_score,
        (
          SELECT MAX(created_at)
          FROM spam_logs
          WHERE consultant_id = c.id
        ) as last_spam_event
      FROM consultants c
      WHERE c.spam_risk_score > 0
    `;

    const consultantsResult = await client.query(consultantsQuery);
    const consultants = consultantsResult.rows;

    logger.info(`[SpamScoreManager] Found ${consultants.length} consultants with spam score > 0`);

    let totalDecayed = 0;
    let consultantsUpdated = 0;
    const details = [];

    for (const consultant of consultants) {
      const { id, name, spam_risk_score, last_spam_event } = consultant;

      // Calculate hours since last spam event
      let hoursSinceLastEvent = Infinity;
      if (last_spam_event) {
        hoursSinceLastEvent = (Date.now() - new Date(last_spam_event).getTime()) / (1000 * 60 * 60);
      }

      // Only apply decay if consultant has clean history
      if (hoursSinceLastEvent >= DECAY_CONFIG.CLEAN_THRESHOLD_HOURS) {
        let decayAmount = DECAY_CONFIG.DAILY_DECAY;

        // Check for 7-day clean bonus
        if (hoursSinceLastEvent >= 168) { // 7 days * 24 hours
          decayAmount += DECAY_CONFIG.WEEKLY_BONUS;
          logger.info(`[SpamScoreManager] Consultant ${id} gets weekly bonus (-${DECAY_CONFIG.WEEKLY_BONUS})`);
        }

        // Calculate new score (minimum 0)
        const newScore = Math.max(spam_risk_score - decayAmount, DECAY_CONFIG.MIN_SCORE);
        const actualDecay = spam_risk_score - newScore;

        if (actualDecay > 0) {
          // Update consultant's spam score
          await client.query(
            'UPDATE consultants SET spam_risk_score = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newScore, id]
          );

          // Log the decay event
          await client.query(
            `INSERT INTO spam_logs (consultant_id, event_type, severity, details, metadata)
             VALUES ($1, 'SCORE_DECAY', 'info', $2, $3)`,
            [
              id,
              `Daily decay applied: -${actualDecay} points`,
              JSON.stringify({
                previous_score: spam_risk_score,
                new_score: newScore,
                decay_amount: actualDecay,
                hours_clean: Math.floor(hoursSinceLastEvent)
              })
            ]
          );

          totalDecayed += actualDecay;
          consultantsUpdated++;

          details.push({
            consultantId: id,
            name: name,
            previousScore: spam_risk_score,
            newScore: newScore,
            decayAmount: actualDecay
          });

          logger.info(`[SpamScoreManager] Consultant ${id} (${name}): ${spam_risk_score} -> ${newScore} (-${actualDecay})`);
        }
      } else {
        logger.debug(`[SpamScoreManager] Consultant ${id} skipped: recent spam event (${Math.floor(hoursSinceLastEvent)}h ago)`);
      }
    }

    await client.query('COMMIT');

    const result = {
      success: true,
      consultantsChecked: consultants.length,
      consultantsUpdated: consultantsUpdated,
      totalPointsDecayed: totalDecayed,
      details: details,
      timestamp: new Date().toISOString()
    };

    logger.info(`[SpamScoreManager] Daily decay complete: ${consultantsUpdated} consultants updated, ${totalDecayed} total points decayed`);

    return result;

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`[SpamScoreManager] Daily decay failed: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Reset spam score for a specific consultant (admin action)
 * @param {number} consultantId - Consultant ID
 * @param {string} reason - Reason for reset
 * @returns {Promise<Object>} Reset result
 */
async function resetSpamScore(consultantId, reason = 'Admin reset') {
  try {
    // Get current score
    const currentResult = await db.query(
      'SELECT spam_risk_score FROM consultants WHERE id = $1',
      [consultantId]
    );

    if (currentResult.rows.length === 0) {
      throw new Error('Consultant not found');
    }

    const previousScore = currentResult.rows[0].spam_risk_score;

    // Reset score to 0
    await db.query(
      'UPDATE consultants SET spam_risk_score = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [consultantId]
    );

    // Log the reset
    await db.query(
      `INSERT INTO spam_logs (consultant_id, event_type, severity, details, metadata)
       VALUES ($1, 'SCORE_RESET', 'info', $2, $3)`,
      [
        consultantId,
        `Spam score reset: ${reason}`,
        JSON.stringify({
          previous_score: previousScore,
          new_score: 0,
          reason: reason
        })
      ]
    );

    logger.info(`[SpamScoreManager] Spam score reset for consultant ${consultantId}: ${previousScore} -> 0`);

    return {
      success: true,
      consultantId: consultantId,
      previousScore: previousScore,
      newScore: 0,
      reason: reason
    };

  } catch (error) {
    logger.error(`[SpamScoreManager] Reset failed for consultant ${consultantId}: ${error.message}`);
    throw error;
  }
}

/**
 * Get spam score history for a consultant
 * @param {number} consultantId - Consultant ID
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Spam log entries
 */
async function getSpamHistory(consultantId, days = 30) {
  try {
    const query = `
      SELECT
        id, event_type, severity, details, metadata, created_at
      FROM spam_logs
      WHERE consultant_id = $1
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
    logger.error(`[SpamScoreManager] Failed to get history for consultant ${consultantId}: ${error.message}`);
    throw error;
  }
}

/**
 * Increase spam score for a consultant
 * @param {number} consultantId - Consultant ID
 * @param {number} amount - Points to add
 * @param {string} eventType - Type of spam event
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Update result
 */
async function increaseSpamScore(consultantId, amount, eventType, metadata = {}) {
  try {
    // Get current score
    const currentResult = await db.query(
      'SELECT spam_risk_score FROM consultants WHERE id = $1',
      [consultantId]
    );

    if (currentResult.rows.length === 0) {
      throw new Error('Consultant not found');
    }

    const previousScore = currentResult.rows[0].spam_risk_score;
    const newScore = Math.min(previousScore + amount, DECAY_CONFIG.MAX_SCORE);

    // Update score
    await db.query(
      'UPDATE consultants SET spam_risk_score = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newScore, consultantId]
    );

    // Log the event
    await db.query(
      `INSERT INTO spam_logs (consultant_id, event_type, severity, details, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        consultantId,
        eventType,
        amount >= 15 ? 'high' : amount >= 10 ? 'medium' : 'low',
        `Spam score increased by ${amount}`,
        JSON.stringify({
          previous_score: previousScore,
          new_score: newScore,
          increase: amount,
          ...metadata
        })
      ]
    );

    logger.warn(`[SpamScoreManager] Spam score increased for consultant ${consultantId}: ${previousScore} -> ${newScore} (+${amount})`);

    return {
      success: true,
      consultantId: consultantId,
      previousScore: previousScore,
      newScore: newScore,
      increase: amount
    };

  } catch (error) {
    logger.error(`[SpamScoreManager] Failed to increase score for consultant ${consultantId}: ${error.message}`);
    throw error;
  }
}

module.exports = {
  applyDailyDecay,
  resetSpamScore,
  getSpamHistory,
  increaseSpamScore,
  DECAY_CONFIG
};

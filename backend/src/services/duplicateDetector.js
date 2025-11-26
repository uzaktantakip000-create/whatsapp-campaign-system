const crypto = require('crypto');
const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Duplicate Message Detector Service
 * Prevents sending identical messages to multiple recipients (spam prevention)
 */

// Configuration
const DUPLICATE_CONFIG = {
  MAX_SAME_MESSAGE_PER_24H: 5,     // Maximum times same message can be sent in 24 hours
  SIMILARITY_THRESHOLD: 0.85,      // Similarity threshold (0-1) for considering messages as duplicate
  LOOKBACK_HOURS: 24,              // Hours to look back for duplicates
  MIN_MESSAGE_LENGTH: 10           // Minimum message length to check for duplicates
};

/**
 * Generate hash for a message
 * @param {string} message - Message text
 * @returns {string} MD5 hash
 */
function generateMessageHash(message) {
  // Normalize message: lowercase, remove extra whitespace
  const normalized = message.toLowerCase().trim().replace(/\s+/g, ' ');
  return crypto.createHash('md5').update(normalized).digest('hex');
}

/**
 * Check if a message is a duplicate (sent too many times)
 * @param {number} consultantId - Consultant ID
 * @param {string} messageText - Message to check
 * @returns {Promise<Object>} Duplicate check result
 */
async function checkDuplicate(consultantId, messageText) {
  try {
    // Skip check for very short messages
    if (messageText.length < DUPLICATE_CONFIG.MIN_MESSAGE_LENGTH) {
      return {
        isDuplicate: false,
        reason: 'Message too short to check'
      };
    }

    const messageHash = generateMessageHash(messageText);

    // Check how many times this exact message was sent in the last 24 hours
    const query = `
      SELECT COUNT(*) as count
      FROM messages m
      INNER JOIN campaigns c ON m.campaign_id = c.id
      WHERE c.consultant_id = $1
        AND m.message_hash = $2
        AND m.created_at >= NOW() - INTERVAL '${DUPLICATE_CONFIG.LOOKBACK_HOURS} hours'
        AND m.status != 'failed'
    `;

    const result = await db.query(query, [consultantId, messageHash]);
    const count = parseInt(result.rows[0].count);

    if (count >= DUPLICATE_CONFIG.MAX_SAME_MESSAGE_PER_24H) {
      logger.warn(`[DuplicateDetector] Duplicate detected for consultant ${consultantId}: message sent ${count} times in last 24h`);

      return {
        isDuplicate: true,
        count: count,
        limit: DUPLICATE_CONFIG.MAX_SAME_MESSAGE_PER_24H,
        messageHash: messageHash,
        reason: `Same message already sent ${count} times in the last 24 hours (limit: ${DUPLICATE_CONFIG.MAX_SAME_MESSAGE_PER_24H})`
      };
    }

    return {
      isDuplicate: false,
      count: count,
      limit: DUPLICATE_CONFIG.MAX_SAME_MESSAGE_PER_24H,
      remaining: DUPLICATE_CONFIG.MAX_SAME_MESSAGE_PER_24H - count,
      messageHash: messageHash
    };

  } catch (error) {
    logger.error(`[DuplicateDetector] Check failed: ${error.message}`);
    // On error, allow the message (fail open)
    return {
      isDuplicate: false,
      error: error.message
    };
  }
}

/**
 * Check similarity between two messages using Levenshtein distance
 * @param {string} msg1 - First message
 * @param {string} msg2 - Second message
 * @returns {number} Similarity score (0-1)
 */
function calculateSimilarity(msg1, msg2) {
  const s1 = msg1.toLowerCase().trim();
  const s2 = msg2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Levenshtein distance
  const matrix = [];

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[s1.length][s2.length];
  const maxLength = Math.max(s1.length, s2.length);

  return 1 - (distance / maxLength);
}

/**
 * Check for similar messages (not exact duplicates)
 * @param {number} consultantId - Consultant ID
 * @param {string} messageText - Message to check
 * @returns {Promise<Object>} Similarity check result
 */
async function checkSimilarity(consultantId, messageText) {
  try {
    // Get recent messages from this consultant
    const query = `
      SELECT DISTINCT m.message_text
      FROM messages m
      INNER JOIN campaigns c ON m.campaign_id = c.id
      WHERE c.consultant_id = $1
        AND m.created_at >= NOW() - INTERVAL '${DUPLICATE_CONFIG.LOOKBACK_HOURS} hours'
        AND m.status != 'failed'
      ORDER BY m.created_at DESC
      LIMIT 50
    `;

    const result = await db.query(query, [consultantId]);
    const recentMessages = result.rows.map(r => r.message_text);

    // Check similarity with each recent message
    const similarMessages = [];

    for (const existingMessage of recentMessages) {
      const similarity = calculateSimilarity(messageText, existingMessage);

      if (similarity >= DUPLICATE_CONFIG.SIMILARITY_THRESHOLD) {
        similarMessages.push({
          message: existingMessage.substring(0, 100) + '...',
          similarity: (similarity * 100).toFixed(1) + '%'
        });
      }
    }

    if (similarMessages.length > 0) {
      logger.warn(`[DuplicateDetector] Similar messages found for consultant ${consultantId}: ${similarMessages.length} matches`);

      return {
        hasSimilar: true,
        similarCount: similarMessages.length,
        threshold: (DUPLICATE_CONFIG.SIMILARITY_THRESHOLD * 100) + '%',
        similarMessages: similarMessages.slice(0, 3) // Return top 3
      };
    }

    return {
      hasSimilar: false,
      checkedCount: recentMessages.length
    };

  } catch (error) {
    logger.error(`[DuplicateDetector] Similarity check failed: ${error.message}`);
    return {
      hasSimilar: false,
      error: error.message
    };
  }
}

/**
 * Get duplicate statistics for a consultant
 * @param {number} consultantId - Consultant ID
 * @returns {Promise<Object>} Duplicate statistics
 */
async function getDuplicateStats(consultantId) {
  try {
    const query = `
      SELECT
        m.message_hash,
        COUNT(*) as count,
        MIN(m.created_at) as first_sent,
        MAX(m.created_at) as last_sent
      FROM messages m
      INNER JOIN campaigns c ON m.campaign_id = c.id
      WHERE c.consultant_id = $1
        AND m.created_at >= NOW() - INTERVAL '24 hours'
        AND m.message_hash IS NOT NULL
      GROUP BY m.message_hash
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    `;

    const result = await db.query(query, [consultantId]);

    return {
      duplicateGroups: result.rows.map(r => ({
        hash: r.message_hash,
        count: parseInt(r.count),
        firstSent: r.first_sent,
        lastSent: r.last_sent
      })),
      totalDuplicateGroups: result.rows.length
    };

  } catch (error) {
    logger.error(`[DuplicateDetector] Stats failed: ${error.message}`);
    throw error;
  }
}

module.exports = {
  generateMessageHash,
  checkDuplicate,
  checkSimilarity,
  calculateSimilarity,
  getDuplicateStats,
  DUPLICATE_CONFIG
};

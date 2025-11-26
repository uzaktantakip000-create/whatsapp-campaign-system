const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Engagement Tracker Service
 * Tracks replies, calculates engagement scores, and prioritizes responsive contacts
 */

// Engagement score weights
const ENGAGEMENT_WEIGHTS = {
  REPLY: 30,              // Contact replied to a message
  READ: 10,               // Contact read the message
  DELIVERED: 5,           // Message was delivered
  QUICK_REPLY: 20,        // Replied within 1 hour (bonus)
  CONVERSATION: 15,       // Multiple back-and-forth messages
  RECENT_ACTIVITY: 10,    // Active in last 7 days
  COMPLAINT: -50,         // Contact complained or blocked
  NO_RESPONSE: -5         // No response to last 3 messages
};

// Engagement tiers
const ENGAGEMENT_TIERS = {
  HOT: { min: 70, label: 'Hot Lead', priority: 1 },
  WARM: { min: 40, label: 'Warm Lead', priority: 2 },
  COLD: { min: 10, label: 'Cold Lead', priority: 3 },
  INACTIVE: { min: 0, label: 'Inactive', priority: 4 }
};

/**
 * Process an incoming reply from a contact
 * @param {number} consultantId - Consultant ID
 * @param {string} phoneNumber - Contact's phone number
 * @param {string} messageText - Reply message text
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Processing result
 */
async function processReply(consultantId, phoneNumber, messageText, metadata = {}) {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Find the contact
    const contactQuery = `
      SELECT id, name, engagement_score, reply_count, last_reply_at
      FROM contacts
      WHERE consultant_id = $1 AND number = $2
    `;

    const contactResult = await client.query(contactQuery, [consultantId, phoneNumber]);

    if (contactResult.rows.length === 0) {
      await client.query('ROLLBACK');
      logger.warn(`[EngagementTracker] Contact not found: ${phoneNumber}`);
      return { success: false, reason: 'Contact not found' };
    }

    const contact = contactResult.rows[0];

    // Calculate score increase
    let scoreIncrease = ENGAGEMENT_WEIGHTS.REPLY;

    // Check for quick reply (within 1 hour of our last message)
    const lastMessageQuery = `
      SELECT sent_at FROM messages m
      INNER JOIN campaigns c ON m.campaign_id = c.id
      WHERE c.consultant_id = $1 AND m.contact_id = $2
      ORDER BY m.sent_at DESC LIMIT 1
    `;

    const lastMessageResult = await client.query(lastMessageQuery, [consultantId, contact.id]);

    if (lastMessageResult.rows.length > 0) {
      const lastSent = new Date(lastMessageResult.rows[0].sent_at);
      const replyTime = new Date();
      const hoursSinceMessage = (replyTime - lastSent) / (1000 * 60 * 60);

      if (hoursSinceMessage <= 1) {
        scoreIncrease += ENGAGEMENT_WEIGHTS.QUICK_REPLY;
        logger.info(`[EngagementTracker] Quick reply bonus for contact ${contact.id}`);
      }
    }

    // Update contact engagement
    const newScore = Math.min((contact.engagement_score || 0) + scoreIncrease, 100);
    const newReplyCount = (contact.reply_count || 0) + 1;

    await client.query(`
      UPDATE contacts
      SET
        engagement_score = $1,
        reply_count = $2,
        last_reply_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [newScore, newReplyCount, contact.id]);

    // Update the last message's replied status
    await client.query(`
      UPDATE messages
      SET replied = true, reply_text = $1
      WHERE id = (
        SELECT m.id FROM messages m
        INNER JOIN campaigns c ON m.campaign_id = c.id
        WHERE c.consultant_id = $2 AND m.contact_id = $3
        ORDER BY m.sent_at DESC LIMIT 1
      )
    `, [messageText.substring(0, 500), consultantId, contact.id]);

    // Update campaign reply count
    await client.query(`
      UPDATE campaigns
      SET reply_count = reply_count + 1
      WHERE id = (
        SELECT m.campaign_id FROM messages m
        INNER JOIN campaigns c ON m.campaign_id = c.id
        WHERE c.consultant_id = $1 AND m.contact_id = $2
        ORDER BY m.sent_at DESC LIMIT 1
      )
    `, [consultantId, contact.id]);

    await client.query('COMMIT');

    logger.info(`[EngagementTracker] Reply processed for contact ${contact.id}: score ${contact.engagement_score} -> ${newScore}`);

    return {
      success: true,
      contactId: contact.id,
      previousScore: contact.engagement_score || 0,
      newScore,
      scoreIncrease,
      replyCount: newReplyCount,
      tier: getEngagementTier(newScore)
    };

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`[EngagementTracker] Reply processing error: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update engagement when a message is read
 * @param {number} consultantId - Consultant ID
 * @param {number} messageId - Message ID
 * @returns {Promise<Object>} Update result
 */
async function processRead(consultantId, messageId) {
  try {
    // Get contact for this message
    const query = `
      SELECT m.contact_id, c.engagement_score
      FROM messages m
      INNER JOIN contacts c ON m.contact_id = c.id
      WHERE m.id = $1
    `;

    const result = await db.query(query, [messageId]);

    if (result.rows.length === 0) {
      return { success: false, reason: 'Message not found' };
    }

    const { contact_id, engagement_score } = result.rows[0];
    const newScore = Math.min((engagement_score || 0) + ENGAGEMENT_WEIGHTS.READ, 100);

    // Update contact engagement score
    await db.query(`
      UPDATE contacts
      SET engagement_score = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [newScore, contact_id]);

    // Update message read status
    await db.query(`
      UPDATE messages
      SET status = 'read', read_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [messageId]);

    return {
      success: true,
      contactId: contact_id,
      newScore
    };

  } catch (error) {
    logger.error(`[EngagementTracker] Read processing error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Calculate engagement score for a contact
 * @param {number} contactId - Contact ID
 * @returns {Promise<Object>} Calculated engagement data
 */
async function calculateEngagementScore(contactId) {
  try {
    const query = `
      SELECT
        c.id,
        c.reply_count,
        c.last_reply_at,
        c.last_message_from_us,
        c.message_count,
        c.complaint_count,
        COUNT(m.id) FILTER (WHERE m.status = 'delivered') as delivered_count,
        COUNT(m.id) FILTER (WHERE m.status = 'read') as read_count,
        COUNT(m.id) FILTER (WHERE m.replied = true) as replied_count,
        COUNT(m.id) FILTER (WHERE m.status = 'failed') as failed_count,
        MAX(m.read_at) as last_read_at
      FROM contacts c
      LEFT JOIN messages m ON c.id = m.contact_id
      WHERE c.id = $1
      GROUP BY c.id
    `;

    const result = await db.query(query, [contactId]);

    if (result.rows.length === 0) {
      return { success: false, reason: 'Contact not found' };
    }

    const data = result.rows[0];

    // Calculate score components
    let score = 0;

    // Reply score
    const replyCount = parseInt(data.replied_count) || 0;
    score += Math.min(replyCount * ENGAGEMENT_WEIGHTS.REPLY, 60);

    // Read score
    const readCount = parseInt(data.read_count) || 0;
    const deliveredCount = parseInt(data.delivered_count) || 0;
    if (deliveredCount > 0) {
      const readRate = readCount / deliveredCount;
      score += readRate * 20;
    }

    // Recent activity bonus
    if (data.last_reply_at) {
      const daysSinceReply = (Date.now() - new Date(data.last_reply_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceReply <= 7) {
        score += ENGAGEMENT_WEIGHTS.RECENT_ACTIVITY;
      }
    }

    // Complaint penalty
    const complaintCount = parseInt(data.complaint_count) || 0;
    if (complaintCount > 0) {
      score += ENGAGEMENT_WEIGHTS.COMPLAINT * complaintCount;
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Update contact's engagement score
    await db.query(
      'UPDATE contacts SET engagement_score = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [score, contactId]
    );

    return {
      success: true,
      contactId,
      score,
      tier: getEngagementTier(score),
      breakdown: {
        replyScore: Math.min(replyCount * ENGAGEMENT_WEIGHTS.REPLY, 60),
        readScore: deliveredCount > 0 ? (readCount / deliveredCount) * 20 : 0,
        activityBonus: data.last_reply_at && (Date.now() - new Date(data.last_reply_at).getTime()) / (1000 * 60 * 60 * 24) <= 7 ? ENGAGEMENT_WEIGHTS.RECENT_ACTIVITY : 0,
        complaintPenalty: complaintCount * ENGAGEMENT_WEIGHTS.COMPLAINT
      }
    };

  } catch (error) {
    logger.error(`[EngagementTracker] Score calculation error: ${error.message}`);
    throw error;
  }
}

/**
 * Get engagement tier based on score
 * @param {number} score - Engagement score
 * @returns {Object} Tier information
 */
function getEngagementTier(score) {
  if (score >= ENGAGEMENT_TIERS.HOT.min) return ENGAGEMENT_TIERS.HOT;
  if (score >= ENGAGEMENT_TIERS.WARM.min) return ENGAGEMENT_TIERS.WARM;
  if (score >= ENGAGEMENT_TIERS.COLD.min) return ENGAGEMENT_TIERS.COLD;
  return ENGAGEMENT_TIERS.INACTIVE;
}

/**
 * Get prioritized contacts for a campaign (sorted by engagement)
 * @param {number} consultantId - Consultant ID
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} Prioritized contacts
 */
async function getPrioritizedContacts(consultantId, options = {}) {
  const {
    segment = null,
    minScore = 0,
    limit = 100,
    excludeRecentlyContacted = true
  } = options;

  try {
    let whereClause = `c.consultant_id = $1 AND c.is_deleted = false AND c.whatsapp_valid != false`;
    const params = [consultantId];
    let paramIndex = 2;

    if (segment) {
      whereClause += ` AND c.segment = $${paramIndex}`;
      params.push(segment);
      paramIndex++;
    }

    if (minScore > 0) {
      whereClause += ` AND COALESCE(c.engagement_score, 0) >= $${paramIndex}`;
      params.push(minScore);
      paramIndex++;
    }

    if (excludeRecentlyContacted) {
      whereClause += ` AND (c.last_message_from_us IS NULL OR c.last_message_from_us < NOW() - INTERVAL '24 hours')`;
    }

    const query = `
      SELECT
        c.id,
        c.name,
        c.number,
        c.segment,
        COALESCE(c.engagement_score, 0) as engagement_score,
        c.reply_count,
        c.last_reply_at,
        c.last_message_from_us
      FROM contacts c
      WHERE ${whereClause}
      ORDER BY
        COALESCE(c.engagement_score, 0) DESC,
        c.reply_count DESC,
        c.last_reply_at DESC NULLS LAST
      LIMIT $${paramIndex}
    `;

    params.push(limit);

    const result = await db.query(query, params);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      number: row.number,
      segment: row.segment,
      engagementScore: row.engagement_score,
      tier: getEngagementTier(row.engagement_score),
      replyCount: row.reply_count,
      lastReplyAt: row.last_reply_at,
      lastMessageFromUs: row.last_message_from_us
    }));

  } catch (error) {
    logger.error(`[EngagementTracker] Get prioritized contacts error: ${error.message}`);
    throw error;
  }
}

/**
 * Get engagement statistics for a consultant
 * @param {number} consultantId - Consultant ID
 * @returns {Promise<Object>} Engagement statistics
 */
async function getEngagementStats(consultantId) {
  try {
    const query = `
      SELECT
        COUNT(*) as total_contacts,
        COUNT(*) FILTER (WHERE COALESCE(engagement_score, 0) >= 70) as hot_leads,
        COUNT(*) FILTER (WHERE COALESCE(engagement_score, 0) >= 40 AND COALESCE(engagement_score, 0) < 70) as warm_leads,
        COUNT(*) FILTER (WHERE COALESCE(engagement_score, 0) >= 10 AND COALESCE(engagement_score, 0) < 40) as cold_leads,
        COUNT(*) FILTER (WHERE COALESCE(engagement_score, 0) < 10) as inactive_leads,
        AVG(COALESCE(engagement_score, 0)) as avg_score,
        SUM(COALESCE(reply_count, 0)) as total_replies,
        COUNT(*) FILTER (WHERE last_reply_at >= NOW() - INTERVAL '7 days') as active_last_7_days
      FROM contacts
      WHERE consultant_id = $1 AND is_deleted = false
    `;

    const result = await db.query(query, [consultantId]);
    const stats = result.rows[0];

    return {
      totalContacts: parseInt(stats.total_contacts),
      hotLeads: parseInt(stats.hot_leads),
      warmLeads: parseInt(stats.warm_leads),
      coldLeads: parseInt(stats.cold_leads),
      inactiveLeads: parseInt(stats.inactive_leads),
      averageScore: parseFloat(stats.avg_score || 0).toFixed(1),
      totalReplies: parseInt(stats.total_replies),
      activeLast7Days: parseInt(stats.active_last_7_days),
      distribution: {
        hot: ((stats.hot_leads / stats.total_contacts) * 100).toFixed(1) + '%',
        warm: ((stats.warm_leads / stats.total_contacts) * 100).toFixed(1) + '%',
        cold: ((stats.cold_leads / stats.total_contacts) * 100).toFixed(1) + '%',
        inactive: ((stats.inactive_leads / stats.total_contacts) * 100).toFixed(1) + '%'
      }
    };

  } catch (error) {
    logger.error(`[EngagementTracker] Get stats error: ${error.message}`);
    throw error;
  }
}

/**
 * Recalculate engagement scores for all contacts of a consultant
 * @param {number} consultantId - Consultant ID
 * @returns {Promise<Object>} Recalculation result
 */
async function recalculateAllScores(consultantId) {
  try {
    logger.info(`[EngagementTracker] Recalculating scores for consultant ${consultantId}`);

    const query = `SELECT id FROM contacts WHERE consultant_id = $1 AND is_deleted = false`;
    const result = await db.query(query, [consultantId]);

    let updated = 0;
    for (const row of result.rows) {
      await calculateEngagementScore(row.id);
      updated++;
    }

    logger.info(`[EngagementTracker] Recalculated ${updated} contact scores`);

    return {
      success: true,
      contactsUpdated: updated
    };

  } catch (error) {
    logger.error(`[EngagementTracker] Recalculation error: ${error.message}`);
    throw error;
  }
}

module.exports = {
  processReply,
  processRead,
  calculateEngagementScore,
  getEngagementTier,
  getPrioritizedContacts,
  getEngagementStats,
  recalculateAllScores,
  ENGAGEMENT_WEIGHTS,
  ENGAGEMENT_TIERS
};

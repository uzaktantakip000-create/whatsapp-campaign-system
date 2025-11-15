const db = require('../../config/database');
const logger = require('../../utils/logger');

/**
 * Warmup Service
 * Manages WhatsApp account warm-up strategy to prevent spam detection
 *
 * Warm-up stages:
 * - NEW (0-7 days): 20-50 messages/day
 * - WARMING (8-21 days): 50-100 messages/day
 * - ACTIVE (22-60 days): 100-150 messages/day
 * - VETERAN (60+ days): Full limit (200 messages/day)
 */

class WarmupService {
  /**
   * Calculate current daily limit for a consultant based on account age
   * @param {number} consultantId - Consultant ID
   * @returns {Promise<Object>} Warm-up status and current limit
   */
  static async getCurrentLimit(consultantId) {
    try {
      const query = `
        SELECT
          id,
          name,
          warmup_start_date,
          warmup_stage,
          warmup_enabled,
          account_age_days,
          current_daily_limit,
          daily_limit as max_daily_limit,
          CASE
            WHEN warmup_start_date IS NOT NULL
            THEN (CURRENT_DATE - warmup_start_date)
            ELSE 0
          END as calculated_age_days
        FROM consultants
        WHERE id = $1
      `;

      const result = await db.query(query, [consultantId]);

      if (result.rows.length === 0) {
        throw new Error('Consultant not found');
      }

      const consultant = result.rows[0];

      return {
        consultant_id: consultant.id,
        consultant_name: consultant.name,
        warmup_enabled: consultant.warmup_enabled,
        warmup_stage: consultant.warmup_stage,
        account_age_days: consultant.calculated_age_days,
        current_daily_limit: consultant.current_daily_limit,
        max_daily_limit: consultant.max_daily_limit,
        warmup_start_date: consultant.warmup_start_date,
        limit_percentage: Math.round((consultant.current_daily_limit / consultant.max_daily_limit) * 100),
        is_fully_warmed_up: consultant.warmup_stage === 'veteran' || !consultant.warmup_enabled
      };

    } catch (error) {
      logger.error(`[Warmup] Error getting current limit: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get warm-up progress for all consultants
   * @returns {Promise<Array>} List of consultant warm-up statuses
   */
  static async getAllWarmupStatus() {
    try {
      const query = `
        SELECT
          id,
          name,
          instance_name,
          warmup_start_date,
          warmup_stage,
          warmup_enabled,
          account_age_days,
          current_daily_limit,
          daily_limit as max_daily_limit,
          CASE
            WHEN warmup_stage = 'new' THEN 7 - account_age_days
            WHEN warmup_stage = 'warming' THEN 21 - account_age_days
            WHEN warmup_stage = 'active' THEN 60 - account_age_days
            ELSE 0
          END as days_to_next_stage,
          CASE
            WHEN warmup_stage = 'new' THEN 'warming'
            WHEN warmup_stage = 'warming' THEN 'active'
            WHEN warmup_stage = 'active' THEN 'veteran'
            ELSE 'veteran'
          END as next_stage
        FROM consultants
        ORDER BY account_age_days ASC
      `;

      const result = await db.query(query);

      return result.rows.map(consultant => ({
        consultant_id: consultant.id,
        consultant_name: consultant.name,
        instance_name: consultant.instance_name,
        warmup_enabled: consultant.warmup_enabled,
        warmup_stage: consultant.warmup_stage,
        account_age_days: consultant.account_age_days,
        current_daily_limit: consultant.current_daily_limit,
        max_daily_limit: consultant.max_daily_limit,
        days_to_next_stage: consultant.days_to_next_stage,
        next_stage: consultant.next_stage,
        warmup_start_date: consultant.warmup_start_date,
        limit_percentage: Math.round((consultant.current_daily_limit / consultant.max_daily_limit) * 100),
        is_fully_warmed_up: consultant.warmup_stage === 'veteran' || !consultant.warmup_enabled
      }));

    } catch (error) {
      logger.error(`[Warmup] Error getting all warmup status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enable or disable warm-up for a consultant
   * @param {number} consultantId - Consultant ID
   * @param {boolean} enabled - Enable/disable warm-up
   * @returns {Promise<Object>} Updated warm-up status
   */
  static async setWarmupEnabled(consultantId, enabled) {
    try {
      const query = `
        UPDATE consultants
        SET warmup_enabled = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING
          id,
          name,
          warmup_enabled,
          warmup_stage,
          account_age_days,
          current_daily_limit,
          daily_limit as max_daily_limit
      `;

      const result = await db.query(query, [enabled, consultantId]);

      if (result.rows.length === 0) {
        throw new Error('Consultant not found');
      }

      const consultant = result.rows[0];

      logger.info(`[Warmup] Warm-up ${enabled ? 'enabled' : 'disabled'} for consultant ${consultantId}`);

      return {
        consultant_id: consultant.id,
        consultant_name: consultant.name,
        warmup_enabled: consultant.warmup_enabled,
        warmup_stage: consultant.warmup_stage,
        account_age_days: consultant.account_age_days,
        current_daily_limit: consultant.current_daily_limit,
        max_daily_limit: consultant.max_daily_limit
      };

    } catch (error) {
      logger.error(`[Warmup] Error setting warmup enabled: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reset warm-up start date (restart warm-up process)
   * @param {number} consultantId - Consultant ID
   * @param {Date} startDate - New start date (defaults to today)
   * @returns {Promise<Object>} Updated warm-up status
   */
  static async resetWarmupDate(consultantId, startDate = null) {
    try {
      const newStartDate = startDate || new Date().toISOString().split('T')[0];

      const query = `
        UPDATE consultants
        SET warmup_start_date = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING
          id,
          name,
          warmup_start_date,
          warmup_stage,
          account_age_days,
          current_daily_limit,
          daily_limit as max_daily_limit
      `;

      const result = await db.query(query, [newStartDate, consultantId]);

      if (result.rows.length === 0) {
        throw new Error('Consultant not found');
      }

      const consultant = result.rows[0];

      logger.info(`[Warmup] Warm-up date reset to ${newStartDate} for consultant ${consultantId}`);

      return {
        consultant_id: consultant.id,
        consultant_name: consultant.name,
        warmup_start_date: consultant.warmup_start_date,
        warmup_stage: consultant.warmup_stage,
        account_age_days: consultant.account_age_days,
        current_daily_limit: consultant.current_daily_limit,
        max_daily_limit: consultant.max_daily_limit
      };

    } catch (error) {
      logger.error(`[Warmup] Error resetting warmup date: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recommended message sending schedule for today
   * @param {number} consultantId - Consultant ID
   * @param {number} totalMessages - Total messages to send today
   * @returns {Promise<Object>} Sending schedule with time slots
   */
  static async getRecommendedSchedule(consultantId, totalMessages) {
    try {
      const limitInfo = await this.getCurrentLimit(consultantId);

      if (totalMessages > limitInfo.current_daily_limit) {
        return {
          can_send_all: false,
          current_daily_limit: limitInfo.current_daily_limit,
          requested: totalMessages,
          excess: totalMessages - limitInfo.current_daily_limit,
          message: `Cannot send ${totalMessages} messages. Current daily limit is ${limitInfo.current_daily_limit} (${limitInfo.warmup_stage} stage).`,
          warmup_stage: limitInfo.warmup_stage
        };
      }

      // Calculate time slots (09:00 - 20:00, 11 hours)
      const workingHours = 11; // 09:00 to 20:00
      const messagesPerHour = Math.ceil(totalMessages / workingHours);

      // Calculate delay between messages (in seconds)
      const delayBetweenMessages = Math.floor((workingHours * 3600) / totalMessages);

      // Ensure minimum 20 seconds, maximum 180 seconds (3 minutes)
      const recommendedDelay = Math.min(Math.max(delayBetweenMessages, 20), 180);

      // Calculate batches
      const batchSize = Math.ceil(totalMessages / workingHours);
      const batches = [];

      let startHour = 9; // 09:00
      let remainingMessages = totalMessages;

      for (let hour = 0; hour < workingHours && remainingMessages > 0; hour++) {
        const currentHour = startHour + hour;
        const batchMessages = Math.min(batchSize, remainingMessages);

        batches.push({
          hour: currentHour,
          time_slot: `${currentHour.toString().padStart(2, '0')}:00-${(currentHour + 1).toString().padStart(2, '0')}:00`,
          messages_count: batchMessages,
          delay_seconds: recommendedDelay
        });

        remainingMessages -= batchMessages;
      }

      return {
        can_send_all: true,
        total_messages: totalMessages,
        current_daily_limit: limitInfo.current_daily_limit,
        remaining_capacity: limitInfo.current_daily_limit - totalMessages,
        warmup_stage: limitInfo.warmup_stage,
        recommended_delay_seconds: recommendedDelay,
        working_hours: workingHours,
        estimated_duration_hours: Math.ceil(totalMessages * recommendedDelay / 3600),
        batches: batches,
        tips: [
          'Send messages during business hours (09:00-20:00)',
          `Maintain ${recommendedDelay}s delay between messages`,
          'Monitor spam risk score during campaign',
          'Stop sending if spam score exceeds 70',
          `Account in ${limitInfo.warmup_stage} stage - ${limitInfo.account_age_days} days old`
        ]
      };

    } catch (error) {
      logger.error(`[Warmup] Error getting recommended schedule: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate warm-up stage based on account age
   * @param {number} ageInDays - Account age in days
   * @returns {string} Warm-up stage
   */
  static calculateStage(ageInDays) {
    if (ageInDays < 8) return 'new';
    if (ageInDays < 22) return 'warming';
    if (ageInDays < 61) return 'active';
    return 'veteran';
  }

  /**
   * Calculate daily limit based on age and stage
   * @param {number} ageInDays - Account age in days
   * @param {number} maxLimit - Maximum daily limit
   * @returns {number} Current daily limit
   */
  static calculateDailyLimit(ageInDays, maxLimit = 200) {
    const stage = this.calculateStage(ageInDays);

    switch (stage) {
      case 'new':
        // Days 0-7: Start at 20, increase by 5 each day
        return Math.min(20 + (ageInDays * 5), 50);

      case 'warming':
        // Days 8-21: 50-100 messages
        return Math.min(50 + ((ageInDays - 7) * 4), 100);

      case 'active':
        // Days 22-60: 100-150 messages
        return Math.min(100 + ((ageInDays - 21) * 1), 150);

      case 'veteran':
        // Days 60+: Full limit
        return maxLimit;

      default:
        return 20; // Fallback
    }
  }
}

module.exports = WarmupService;

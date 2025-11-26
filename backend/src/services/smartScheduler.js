const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Smart Scheduler Service
 * Determines optimal send times based on contact activity patterns
 */

// Default working hours
const DEFAULT_HOURS = {
  START: 9,
  END: 20
};

// Time slot weights for Turkish audience
const TIME_SLOT_WEIGHTS = {
  // Morning: 09:00-12:00 (good for business)
  '09': 0.7,
  '10': 0.8,
  '11': 0.8,
  // Lunch: 12:00-14:00 (moderate)
  '12': 0.6,
  '13': 0.5,
  // Afternoon: 14:00-17:00 (best for business)
  '14': 0.8,
  '15': 0.9,
  '16': 0.9,
  // Evening: 17:00-20:00 (good for personal)
  '17': 0.8,
  '18': 0.9,
  '19': 0.8
};

// Day of week weights
const DAY_WEIGHTS = {
  0: 0.4,  // Sunday - low
  1: 0.9,  // Monday - high
  2: 1.0,  // Tuesday - highest
  3: 1.0,  // Wednesday - highest
  4: 0.9,  // Thursday - high
  5: 0.7,  // Friday - moderate
  6: 0.3   // Saturday - lowest
};

/**
 * Get optimal send time for a specific contact
 * @param {number} contactId - Contact ID
 * @returns {Promise<Object>} Optimal send time recommendation
 */
async function getOptimalSendTime(contactId) {
  try {
    // Get contact's activity history
    const query = `
      SELECT
        EXTRACT(HOUR FROM m.read_at) as read_hour,
        EXTRACT(DOW FROM m.read_at) as read_day,
        COUNT(*) as count
      FROM messages m
      WHERE m.contact_id = $1
        AND m.read_at IS NOT NULL
      GROUP BY EXTRACT(HOUR FROM m.read_at), EXTRACT(DOW FROM m.read_at)
      ORDER BY count DESC
    `;

    const result = await db.query(query, [contactId]);

    if (result.rows.length === 0) {
      // No history, return default recommendation
      return getDefaultOptimalTime();
    }

    // Analyze patterns
    const hourCounts = {};
    const dayCounts = {};

    for (const row of result.rows) {
      const hour = parseInt(row.read_hour);
      const day = parseInt(row.read_day);
      const count = parseInt(row.count);

      hourCounts[hour] = (hourCounts[hour] || 0) + count;
      dayCounts[day] = (dayCounts[day] || 0) + count;
    }

    // Find best hour
    let bestHour = 10;
    let maxHourCount = 0;
    for (const [hour, count] of Object.entries(hourCounts)) {
      if (count > maxHourCount && parseInt(hour) >= DEFAULT_HOURS.START && parseInt(hour) < DEFAULT_HOURS.END) {
        maxHourCount = count;
        bestHour = parseInt(hour);
      }
    }

    // Find best day
    let bestDay = 2; // Default Tuesday
    let maxDayCount = 0;
    for (const [day, count] of Object.entries(dayCounts)) {
      if (count > maxDayCount) {
        maxDayCount = count;
        bestDay = parseInt(day);
      }
    }

    return {
      contactId,
      recommendation: {
        hour: bestHour,
        hourRange: `${bestHour}:00 - ${bestHour + 1}:00`,
        day: bestDay,
        dayName: getDayName(bestDay),
        confidence: maxHourCount > 3 ? 'high' : maxHourCount > 1 ? 'medium' : 'low'
      },
      basedOnHistory: true,
      historySize: result.rows.length
    };

  } catch (error) {
    logger.error(`[SmartScheduler] Optimal time error: ${error.message}`);
    return getDefaultOptimalTime();
  }
}

/**
 * Get optimal send times for multiple contacts
 * @param {Array<number>} contactIds - Array of contact IDs
 * @returns {Promise<Map>} Map of contactId to optimal time
 */
async function getOptimalSendTimes(contactIds) {
  const results = new Map();

  for (const contactId of contactIds) {
    const optimal = await getOptimalSendTime(contactId);
    results.set(contactId, optimal);
  }

  return results;
}

/**
 * Get default optimal time (no history available)
 * @returns {Object} Default recommendation
 */
function getDefaultOptimalTime() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();

  // Find next good time slot
  let recommendedHour = 10; // Default

  if (currentHour < DEFAULT_HOURS.START) {
    recommendedHour = DEFAULT_HOURS.START;
  } else if (currentHour < 12) {
    recommendedHour = currentHour;
  } else if (currentHour < 14) {
    recommendedHour = 14;
  } else if (currentHour < DEFAULT_HOURS.END) {
    recommendedHour = currentHour;
  } else {
    recommendedHour = DEFAULT_HOURS.START; // Next day
  }

  return {
    recommendation: {
      hour: recommendedHour,
      hourRange: `${recommendedHour}:00 - ${recommendedHour + 1}:00`,
      day: currentDay,
      dayName: getDayName(currentDay),
      confidence: 'default'
    },
    basedOnHistory: false,
    note: 'No activity history, using default time slots'
  };
}

/**
 * Check if current time is optimal for sending
 * @param {number} contactId - Contact ID (optional)
 * @returns {Promise<Object>} Send recommendation
 */
async function shouldSendNow(contactId = null) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();

  // Check if within working hours
  if (currentHour < DEFAULT_HOURS.START || currentHour >= DEFAULT_HOURS.END) {
    return {
      shouldSend: false,
      reason: 'Outside working hours',
      nextGoodTime: getNextGoodTime(now)
    };
  }

  // Check day weight
  const dayWeight = DAY_WEIGHTS[currentDay];
  if (dayWeight < 0.5) {
    return {
      shouldSend: false,
      reason: `${getDayName(currentDay)} is not optimal for sending`,
      currentWeight: dayWeight,
      nextGoodTime: getNextGoodTime(now)
    };
  }

  // Get time slot weight
  const hourKey = currentHour.toString().padStart(2, '0');
  const timeWeight = TIME_SLOT_WEIGHTS[hourKey] || 0.5;

  // If contact specified, check their preferences
  let contactWeight = 1;
  if (contactId) {
    const optimal = await getOptimalSendTime(contactId);
    if (optimal.basedOnHistory && optimal.recommendation.hour === currentHour) {
      contactWeight = 1.2; // Bonus for matching preferred hour
    }
  }

  const totalScore = dayWeight * timeWeight * contactWeight;

  return {
    shouldSend: totalScore >= 0.5,
    score: totalScore.toFixed(2),
    factors: {
      dayWeight,
      timeWeight,
      contactWeight
    },
    currentTime: `${currentHour}:00`,
    recommendation: totalScore >= 0.7 ? 'excellent' : totalScore >= 0.5 ? 'good' : 'wait'
  };
}

/**
 * Get next good time to send
 * @param {Date} fromTime - Starting time
 * @returns {Object} Next good time
 */
function getNextGoodTime(fromTime) {
  const next = new Date(fromTime);

  // If after hours, move to next day
  if (next.getHours() >= DEFAULT_HOURS.END) {
    next.setDate(next.getDate() + 1);
    next.setHours(DEFAULT_HOURS.START, 0, 0, 0);
  } else if (next.getHours() < DEFAULT_HOURS.START) {
    next.setHours(DEFAULT_HOURS.START, 0, 0, 0);
  }

  // Skip weekends if weight is too low
  while (DAY_WEIGHTS[next.getDay()] < 0.5) {
    next.setDate(next.getDate() + 1);
    next.setHours(DEFAULT_HOURS.START, 0, 0, 0);
  }

  return {
    time: next.toISOString(),
    hour: next.getHours(),
    day: getDayName(next.getDay()),
    waitMinutes: Math.round((next - fromTime) / (1000 * 60))
  };
}

/**
 * Schedule messages for optimal delivery
 * @param {number} consultantId - Consultant ID
 * @param {Array} messages - Messages to schedule
 * @returns {Promise<Array>} Scheduled messages with send times
 */
async function scheduleMessages(consultantId, messages) {
  try {
    const scheduled = [];
    const now = new Date();

    // Group messages by contact
    const contactMessages = new Map();
    for (const msg of messages) {
      if (!contactMessages.has(msg.contactId)) {
        contactMessages.set(msg.contactId, []);
      }
      contactMessages.get(msg.contactId).push(msg);
    }

    // Get optimal times for all contacts
    const contactIds = Array.from(contactMessages.keys());
    const optimalTimes = await getOptimalSendTimes(contactIds);

    // Distribute messages throughout optimal windows
    let scheduleOffset = 0;

    for (const [contactId, msgs] of contactMessages.entries()) {
      const optimal = optimalTimes.get(contactId);
      const baseHour = optimal?.recommendation?.hour || 10;

      for (const msg of msgs) {
        // Calculate scheduled time
        const scheduledTime = new Date(now);

        // Set to optimal hour if in the future
        if (now.getHours() < baseHour) {
          scheduledTime.setHours(baseHour, 0, 0, 0);
        }

        // Add random offset (0-30 minutes) to avoid suspicious patterns
        const randomOffset = Math.floor(Math.random() * 30);
        scheduledTime.setMinutes(scheduledTime.getMinutes() + randomOffset + scheduleOffset);

        scheduled.push({
          ...msg,
          scheduledFor: scheduledTime.toISOString(),
          optimalHour: baseHour,
          confidence: optimal?.recommendation?.confidence || 'default'
        });

        // Increment offset for next message (30-60 seconds)
        scheduleOffset += 30 + Math.floor(Math.random() * 30);
      }
    }

    // Sort by scheduled time
    scheduled.sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));

    logger.info(`[SmartScheduler] Scheduled ${scheduled.length} messages for consultant ${consultantId}`);

    return scheduled;

  } catch (error) {
    logger.error(`[SmartScheduler] Scheduling error: ${error.message}`);
    throw error;
  }
}

/**
 * Get activity heatmap for a consultant's contacts
 * @param {number} consultantId - Consultant ID
 * @returns {Promise<Object>} Activity heatmap data
 */
async function getActivityHeatmap(consultantId) {
  try {
    const query = `
      SELECT
        EXTRACT(DOW FROM m.read_at) as day,
        EXTRACT(HOUR FROM m.read_at) as hour,
        COUNT(*) as count
      FROM messages m
      INNER JOIN campaigns c ON m.campaign_id = c.id
      WHERE c.consultant_id = $1
        AND m.read_at IS NOT NULL
        AND m.read_at >= NOW() - INTERVAL '30 days'
      GROUP BY EXTRACT(DOW FROM m.read_at), EXTRACT(HOUR FROM m.read_at)
    `;

    const result = await db.query(query, [consultantId]);

    // Build heatmap matrix
    const heatmap = {};
    for (let day = 0; day < 7; day++) {
      heatmap[getDayName(day)] = {};
      for (let hour = DEFAULT_HOURS.START; hour < DEFAULT_HOURS.END; hour++) {
        heatmap[getDayName(day)][`${hour}:00`] = 0;
      }
    }

    // Fill with actual data
    for (const row of result.rows) {
      const day = getDayName(parseInt(row.day));
      const hour = `${parseInt(row.hour)}:00`;
      if (heatmap[day] && heatmap[day][hour] !== undefined) {
        heatmap[day][hour] = parseInt(row.count);
      }
    }

    return {
      heatmap,
      period: '30 days',
      recommendation: findBestSlots(heatmap)
    };

  } catch (error) {
    logger.error(`[SmartScheduler] Heatmap error: ${error.message}`);
    throw error;
  }
}

/**
 * Find best time slots from heatmap
 * @param {Object} heatmap - Activity heatmap
 * @returns {Array} Best time slots
 */
function findBestSlots(heatmap) {
  const slots = [];

  for (const [day, hours] of Object.entries(heatmap)) {
    for (const [hour, count] of Object.entries(hours)) {
      slots.push({ day, hour, count });
    }
  }

  // Sort by count descending
  slots.sort((a, b) => b.count - a.count);

  // Return top 5
  return slots.slice(0, 5).map((slot, index) => ({
    rank: index + 1,
    day: slot.day,
    hour: slot.hour,
    activity: slot.count,
    recommendation: index === 0 ? 'Best time to send' : 'Good alternative'
  }));
}

/**
 * Get day name from day number
 * @param {number} day - Day of week (0-6)
 * @returns {string} Day name
 */
function getDayName(day) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day] || 'Unknown';
}

module.exports = {
  getOptimalSendTime,
  getOptimalSendTimes,
  getDefaultOptimalTime,
  shouldSendNow,
  getNextGoodTime,
  scheduleMessages,
  getActivityHeatmap,
  DEFAULT_HOURS,
  TIME_SLOT_WEIGHTS,
  DAY_WEIGHTS
};

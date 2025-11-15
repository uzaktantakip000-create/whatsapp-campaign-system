/**
 * Campaign Warm-up Strategy Service
 *
 * WhatsApp hesapları için kademeli mesaj artış stratejisi.
 * Yeni hesaplar spam olarak işaretlenmemesi için yavaş başlar,
 * hafta hafta mesaj limitini artırır.
 *
 * Anti-Spam Rule: Yeni hesaplar az mesajla başlamalı!
 */

const logger = require('../../utils/logger');

/**
 * Warm-up schedule: Haftalık mesaj limitleri
 * @constant {Object}
 */
const WARMUP_SCHEDULE = {
  week1: 20,   // İlk hafta: Max 20 mesaj/gün (çok muhafazakar)
  week2: 50,   // 2. hafta: Max 50 mesaj/gün
  week3: 100,  // 3. hafta: Max 100 mesaj/gün
  week4: 150,  // 4. hafta: Max 150 mesaj/gün
  week5: 200   // 5. hafta ve sonrası: Max 200 mesaj/gün (tam kapasite)
};

/**
 * Warm-up aşamaları
 * @constant {Object}
 */
const WARMUP_PHASES = {
  PHASE_1: { week: 1, limit: WARMUP_SCHEDULE.week1, name: 'İlk Hafta (Çok Yavaş)' },
  PHASE_2: { week: 2, limit: WARMUP_SCHEDULE.week2, name: '2. Hafta (Yavaş)' },
  PHASE_3: { week: 3, limit: WARMUP_SCHEDULE.week3, name: '3. Hafta (Orta)' },
  PHASE_4: { week: 4, limit: WARMUP_SCHEDULE.week4, name: '4. Hafta (Hızlı)' },
  PHASE_5: { week: 5, limit: WARMUP_SCHEDULE.week5, name: 'Tam Kapasite' }
};

/**
 * Hesabın yaşını hafta cinsinden hesaplar
 *
 * @param {Date} connectedAt - Hesabın WhatsApp'a bağlandığı tarih
 * @returns {number} Hafta sayısı (1, 2, 3, ...)
 * @throws {Error} connectedAt null veya geçersiz tarih ise
 */
function calculateAccountAge(connectedAt) {
  try {
    if (!connectedAt) {
      throw new Error('connectedAt parametresi gerekli');
    }

    const connectedDate = new Date(connectedAt);
    if (isNaN(connectedDate.getTime())) {
      throw new Error('Geçersiz tarih formatı');
    }

    const now = new Date();
    const diffMs = now - connectedDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.ceil(diffDays / 7); // Yukarı yuvarla (7 gün = 1 hafta)

    // Minimum 1 hafta
    return Math.max(diffWeeks, 1);

  } catch (error) {
    logger.error(`[WarmupStrategy] calculateAccountAge error: ${error.message}`);
    throw error;
  }
}

/**
 * Danışman için günlük mesaj limitini hesaplar
 * Hesabın yaşına göre kademeli limit uygular (Warm-up Strategy)
 *
 * @param {Date} connectedAt - Hesabın WhatsApp'a bağlandığı tarih
 * @param {number} [customDailyLimit] - Danışmana özel belirlenen limit (varsa)
 * @returns {Object} { limit, phase, weeksSinceConnection }
 * @throws {Error} connectedAt null ise
 */
function getDailyLimitForConsultant(connectedAt, customDailyLimit = null) {
  try {
    if (!connectedAt) {
      // Eğer henüz bağlanmadıysa, 0 limit
      logger.warn('[WarmupStrategy] Danışman henüz WhatsApp\'a bağlanmamış');
      return {
        limit: 0,
        phase: 'NOT_CONNECTED',
        weeksSinceConnection: 0,
        reason: 'WhatsApp bağlantısı yok'
      };
    }

    const weeksSinceConnection = calculateAccountAge(connectedAt);

    // Warm-up schedule'a göre limit belirle
    let warmupLimit;
    let phase;

    if (weeksSinceConnection <= 1) {
      warmupLimit = WARMUP_SCHEDULE.week1;
      phase = 'PHASE_1';
    } else if (weeksSinceConnection <= 2) {
      warmupLimit = WARMUP_SCHEDULE.week2;
      phase = 'PHASE_2';
    } else if (weeksSinceConnection <= 3) {
      warmupLimit = WARMUP_SCHEDULE.week3;
      phase = 'PHASE_3';
    } else if (weeksSinceConnection <= 4) {
      warmupLimit = WARMUP_SCHEDULE.week4;
      phase = 'PHASE_4';
    } else {
      warmupLimit = WARMUP_SCHEDULE.week5;
      phase = 'PHASE_5';
    }

    // Custom limit varsa ve warm-up limitinden düşükse, custom limit kullan
    let finalLimit = warmupLimit;
    if (customDailyLimit && customDailyLimit < warmupLimit) {
      finalLimit = customDailyLimit;
      logger.info(`[WarmupStrategy] Custom limit kullanılıyor: ${customDailyLimit} (warmup: ${warmupLimit})`);
    }

    logger.info(`[WarmupStrategy] Limit hesaplandı: ${finalLimit} (Hafta: ${weeksSinceConnection}, Phase: ${phase})`);

    return {
      limit: finalLimit,
      phase: phase,
      phaseName: WARMUP_PHASES[phase].name,
      weeksSinceConnection: weeksSinceConnection,
      warmupLimit: warmupLimit,
      customLimit: customDailyLimit,
      isCustomLimitApplied: customDailyLimit && customDailyLimit < warmupLimit
    };

  } catch (error) {
    logger.error(`[WarmupStrategy] getDailyLimitForConsultant error: ${error.message}`);
    throw error;
  }
}

/**
 * Danışmanın warm-up durumunu detaylı olarak döner
 *
 * @param {Date} connectedAt - Hesabın WhatsApp'a bağlandığı tarih
 * @param {number} currentDailyCount - Bugün gönderilen mesaj sayısı
 * @param {number} [customDailyLimit] - Danışmana özel limit (varsa)
 * @returns {Object} Warm-up durumu raporu
 */
function getWarmupStatus(connectedAt, currentDailyCount = 0, customDailyLimit = null) {
  try {
    if (!connectedAt) {
      return {
        status: 'NOT_CONNECTED',
        message: 'Danışman henüz WhatsApp\'a bağlanmamış',
        canSendMessage: false,
        limit: 0,
        sent: 0,
        remaining: 0,
        percentageUsed: 0
      };
    }

    const limitInfo = getDailyLimitForConsultant(connectedAt, customDailyLimit);
    const remaining = Math.max(limitInfo.limit - currentDailyCount, 0);
    const percentageUsed = limitInfo.limit > 0
      ? Math.min((currentDailyCount / limitInfo.limit) * 100, 100).toFixed(1)
      : 0;

    // Warm-up tamamlandı mı?
    const isComplete = limitInfo.weeksSinceConnection >= 5;

    // Mesaj gönderebilir mi?
    const canSendMessage = currentDailyCount < limitInfo.limit;

    return {
      status: limitInfo.phase,
      statusName: limitInfo.phaseName,
      weeksSinceConnection: limitInfo.weeksSinceConnection,
      isWarmupComplete: isComplete,
      canSendMessage: canSendMessage,
      limit: limitInfo.limit,
      warmupLimit: limitInfo.warmupLimit,
      customLimit: limitInfo.customLimit,
      isCustomLimitApplied: limitInfo.isCustomLimitApplied,
      sent: currentDailyCount,
      remaining: remaining,
      percentageUsed: parseFloat(percentageUsed),
      message: canSendMessage
        ? `${remaining} mesaj hakkı kaldı (${percentageUsed}% kullanıldı)`
        : `Günlük limit doldu (${limitInfo.limit} mesaj)`
    };

  } catch (error) {
    logger.error(`[WarmupStrategy] getWarmupStatus error: ${error.message}`);
    throw error;
  }
}

/**
 * Warm-up tamamlandı mı kontrol eder (5+ hafta geçmiş mi?)
 *
 * @param {Date} connectedAt - Hesabın WhatsApp'a bağlandığı tarih
 * @returns {boolean} Warm-up tamamlandıysa true
 */
function isWarmupComplete(connectedAt) {
  try {
    if (!connectedAt) {
      return false;
    }

    const weeksSinceConnection = calculateAccountAge(connectedAt);
    return weeksSinceConnection >= 5;

  } catch (error) {
    logger.error(`[WarmupStrategy] isWarmupComplete error: ${error.message}`);
    return false;
  }
}

/**
 * Warm-up schedule'u döner (tüm fazların limitlerini)
 *
 * @returns {Object} Warm-up schedule
 */
function getWarmupSchedule() {
  return {
    schedule: WARMUP_SCHEDULE,
    phases: WARMUP_PHASES,
    totalWeeks: 5,
    description: 'Yeni hesaplar 5 haftalık warm-up sürecinden geçer'
  };
}

/**
 * Sonraki faza geçmek için kalan gün sayısını hesaplar
 *
 * @param {Date} connectedAt - Hesabın WhatsApp'a bağlandığı tarih
 * @returns {Object} Sonraki faz bilgisi
 */
function getDaysUntilNextPhase(connectedAt) {
  try {
    if (!connectedAt) {
      return {
        currentPhase: 'NOT_CONNECTED',
        nextPhase: 'PHASE_1',
        daysRemaining: null,
        message: 'WhatsApp bağlantısı yapılmamış'
      };
    }

    const connectedDate = new Date(connectedAt);
    const now = new Date();
    const diffMs = now - connectedDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weeksSinceConnection = Math.ceil(diffDays / 7);

    // Mevcut faz
    let currentPhase, nextPhase, nextPhaseWeek;

    if (weeksSinceConnection <= 1) {
      currentPhase = 'PHASE_1';
      nextPhase = 'PHASE_2';
      nextPhaseWeek = 2;
    } else if (weeksSinceConnection <= 2) {
      currentPhase = 'PHASE_2';
      nextPhase = 'PHASE_3';
      nextPhaseWeek = 3;
    } else if (weeksSinceConnection <= 3) {
      currentPhase = 'PHASE_3';
      nextPhase = 'PHASE_4';
      nextPhaseWeek = 4;
    } else if (weeksSinceConnection <= 4) {
      currentPhase = 'PHASE_4';
      nextPhase = 'PHASE_5';
      nextPhaseWeek = 5;
    } else {
      return {
        currentPhase: 'PHASE_5',
        nextPhase: null,
        daysRemaining: 0,
        message: 'Warm-up tamamlandı! Tam kapasite çalışıyor.'
      };
    }

    // Sonraki faza kaç gün kaldı?
    const nextPhaseDate = new Date(connectedDate);
    nextPhaseDate.setDate(nextPhaseDate.getDate() + (nextPhaseWeek * 7));
    const daysUntilNext = Math.ceil((nextPhaseDate - now) / (1000 * 60 * 60 * 24));

    return {
      currentPhase: currentPhase,
      currentPhaseName: WARMUP_PHASES[currentPhase].name,
      currentLimit: WARMUP_PHASES[currentPhase].limit,
      nextPhase: nextPhase,
      nextPhaseName: WARMUP_PHASES[nextPhase].name,
      nextLimit: WARMUP_PHASES[nextPhase].limit,
      daysRemaining: Math.max(daysUntilNext, 0),
      message: `${daysUntilNext} gün sonra limit ${WARMUP_PHASES[nextPhase].limit} mesaj/gün olacak`
    };

  } catch (error) {
    logger.error(`[WarmupStrategy] getDaysUntilNextPhase error: ${error.message}`);
    throw error;
  }
}

module.exports = {
  WARMUP_SCHEDULE,
  WARMUP_PHASES,
  calculateAccountAge,
  getDailyLimitForConsultant,
  getWarmupStatus,
  isWarmupComplete,
  getWarmupSchedule,
  getDaysUntilNextPhase
};

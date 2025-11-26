const logger = require('../utils/logger');

/**
 * Content Analyzer Service
 * Analyzes message content for spam indicators and calculates risk score
 */

// Spam indicator weights
const SPAM_WEIGHTS = {
  TOO_MANY_LINKS: 15,
  TOO_MANY_PHONE_NUMBERS: 10,
  TOO_MANY_CAPS: 8,
  TOO_MANY_EMOJIS: 5,
  TOO_LONG: 5,
  TOO_SHORT: 3,
  SPAM_KEYWORDS: 20,
  URGENCY_LANGUAGE: 10,
  MONEY_MENTIONS: 12,
  ALL_CAPS: 15
};

// Spam keywords (Turkish and English)
const SPAM_KEYWORDS = [
  // Urgency
  'acele', 'hemen', 'simdi', 'son sans', 'son firsat', 'urgent', 'immediately',
  'limited time', 'sinirli sure', 'bu firsat kacmaz',
  // Money/Prize
  'kazandin', 'kazanan', 'odul', 'hediye', 'ucretsiz', 'bedava', 'free', 'win', 'winner',
  'para kazan', 'kolay para', 'zengin ol', 'milyoner',
  // Suspicious
  'tikla', 'click here', 'link', 'sifreni', 'password', 'hesap dogrulama',
  'account verification', 'kredi karti', 'credit card', 'banka',
  // Marketing spam
  'indirim', 'kampanya', '%50', '%70', '%80', '%90', 'super firsat',
  // Scam indicators
  'gizli', 'secret', 'guaranteed', 'garanti', '100%', 'risk yok'
];

// URL pattern
const URL_PATTERN = /https?:\/\/[^\s]+|www\.[^\s]+/gi;

// Phone number patterns
const PHONE_PATTERNS = [
  /\+?90\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}/g,  // Turkish mobile
  /05\d{2}\s*\d{3}\s*\d{2}\s*\d{2}/g,          // Turkish mobile without country code
  /\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g  // US format
];

// Emoji pattern
const EMOJI_PATTERN = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;

/**
 * Analyze message content for spam indicators
 * @param {string} message - Message text to analyze
 * @returns {Object} Analysis result with spam score and details
 */
function analyzeContent(message) {
  if (!message || typeof message !== 'string') {
    return {
      isSpam: false,
      score: 0,
      details: [],
      message: 'Empty or invalid message'
    };
  }

  const details = [];
  let totalScore = 0;

  // 1. Check message length
  const lengthCheck = checkMessageLength(message);
  if (lengthCheck.issue) {
    details.push(lengthCheck);
    totalScore += lengthCheck.score;
  }

  // 2. Check for URLs/links
  const urlCheck = checkUrls(message);
  if (urlCheck.issue) {
    details.push(urlCheck);
    totalScore += urlCheck.score;
  }

  // 3. Check for phone numbers
  const phoneCheck = checkPhoneNumbers(message);
  if (phoneCheck.issue) {
    details.push(phoneCheck);
    totalScore += phoneCheck.score;
  }

  // 4. Check for excessive caps
  const capsCheck = checkCaps(message);
  if (capsCheck.issue) {
    details.push(capsCheck);
    totalScore += capsCheck.score;
  }

  // 5. Check for excessive emojis
  const emojiCheck = checkEmojis(message);
  if (emojiCheck.issue) {
    details.push(emojiCheck);
    totalScore += emojiCheck.score;
  }

  // 6. Check for spam keywords
  const keywordCheck = checkSpamKeywords(message);
  if (keywordCheck.issue) {
    details.push(keywordCheck);
    totalScore += keywordCheck.score;
  }

  // 7. Check for money mentions
  const moneyCheck = checkMoneyMentions(message);
  if (moneyCheck.issue) {
    details.push(moneyCheck);
    totalScore += moneyCheck.score;
  }

  // Determine if message is spam (threshold: 20)
  const isSpam = totalScore >= 20;

  const result = {
    isSpam: isSpam,
    score: totalScore,
    maxScore: 100,
    riskLevel: getRiskLevel(totalScore),
    details: details,
    recommendation: getRecommendation(totalScore, details)
  };

  if (isSpam) {
    logger.warn(`[ContentAnalyzer] Spam detected (score: ${totalScore}): ${message.substring(0, 50)}...`);
  }

  return result;
}

/**
 * Check message length
 */
function checkMessageLength(message) {
  const length = message.length;

  if (length < 10) {
    return {
      issue: 'TOO_SHORT',
      description: 'Message is too short',
      score: SPAM_WEIGHTS.TOO_SHORT,
      value: length
    };
  }

  if (length > 1000) {
    return {
      issue: 'TOO_LONG',
      description: 'Message is too long',
      score: SPAM_WEIGHTS.TOO_LONG,
      value: length
    };
  }

  return { issue: null };
}

/**
 * Check for URLs
 */
function checkUrls(message) {
  const urls = message.match(URL_PATTERN) || [];

  if (urls.length > 2) {
    return {
      issue: 'TOO_MANY_LINKS',
      description: `Message contains ${urls.length} links (max 2 recommended)`,
      score: SPAM_WEIGHTS.TOO_MANY_LINKS,
      value: urls.length
    };
  }

  return { issue: null };
}

/**
 * Check for phone numbers
 */
function checkPhoneNumbers(message) {
  let phoneCount = 0;

  for (const pattern of PHONE_PATTERNS) {
    const matches = message.match(pattern) || [];
    phoneCount += matches.length;
  }

  if (phoneCount > 1) {
    return {
      issue: 'TOO_MANY_PHONE_NUMBERS',
      description: `Message contains ${phoneCount} phone numbers`,
      score: SPAM_WEIGHTS.TOO_MANY_PHONE_NUMBERS,
      value: phoneCount
    };
  }

  return { issue: null };
}

/**
 * Check for excessive capital letters
 */
function checkCaps(message) {
  const letters = message.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ]/g, '');

  if (letters.length === 0) return { issue: null };

  const upperCase = letters.replace(/[^A-ZĞÜŞİÖÇ]/g, '');
  const capsRatio = upperCase.length / letters.length;

  // Check if entire message is caps
  if (capsRatio > 0.9 && letters.length > 20) {
    return {
      issue: 'ALL_CAPS',
      description: 'Message is almost entirely in capital letters',
      score: SPAM_WEIGHTS.ALL_CAPS,
      value: (capsRatio * 100).toFixed(0) + '%'
    };
  }

  // Check for excessive caps
  if (capsRatio > 0.5 && letters.length > 30) {
    return {
      issue: 'TOO_MANY_CAPS',
      description: `Message has ${(capsRatio * 100).toFixed(0)}% capital letters`,
      score: SPAM_WEIGHTS.TOO_MANY_CAPS,
      value: (capsRatio * 100).toFixed(0) + '%'
    };
  }

  return { issue: null };
}

/**
 * Check for excessive emojis
 */
function checkEmojis(message) {
  const emojis = message.match(EMOJI_PATTERN) || [];
  const emojiRatio = emojis.length / (message.length || 1);

  if (emojis.length > 10 || emojiRatio > 0.1) {
    return {
      issue: 'TOO_MANY_EMOJIS',
      description: `Message contains ${emojis.length} emojis`,
      score: SPAM_WEIGHTS.TOO_MANY_EMOJIS,
      value: emojis.length
    };
  }

  return { issue: null };
}

/**
 * Check for spam keywords
 */
function checkSpamKeywords(message) {
  const lowerMessage = message.toLowerCase();
  const foundKeywords = [];

  for (const keyword of SPAM_KEYWORDS) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
    }
  }

  if (foundKeywords.length >= 2) {
    return {
      issue: 'SPAM_KEYWORDS',
      description: `Message contains spam keywords: ${foundKeywords.slice(0, 3).join(', ')}`,
      score: Math.min(SPAM_WEIGHTS.SPAM_KEYWORDS * foundKeywords.length / 2, 30),
      value: foundKeywords.length
    };
  }

  return { issue: null };
}

/**
 * Check for money mentions
 */
function checkMoneyMentions(message) {
  const moneyPatterns = [
    /\$\d+/g,
    /\d+\s*(TL|tl|USD|usd|EUR|eur)/g,
    /\d+\s*(lira|dolar|euro)/gi,
    /\d+[.,]\d+\s*(TL|tl)/g
  ];

  let moneyCount = 0;

  for (const pattern of moneyPatterns) {
    const matches = message.match(pattern) || [];
    moneyCount += matches.length;
  }

  if (moneyCount > 2) {
    return {
      issue: 'MONEY_MENTIONS',
      description: `Message mentions money/currency ${moneyCount} times`,
      score: SPAM_WEIGHTS.MONEY_MENTIONS,
      value: moneyCount
    };
  }

  return { issue: null };
}

/**
 * Get risk level based on score
 */
function getRiskLevel(score) {
  if (score >= 50) return 'CRITICAL';
  if (score >= 30) return 'HIGH';
  if (score >= 20) return 'MEDIUM';
  if (score >= 10) return 'LOW';
  return 'SAFE';
}

/**
 * Get recommendation based on analysis
 */
function getRecommendation(score, details) {
  if (score >= 50) {
    return 'Bu mesaj spam olarak algılanabilir. Gönderilmemesi önerilir.';
  }
  if (score >= 30) {
    return 'Bu mesajın spam riski yüksek. Içeriği gözden geçirin.';
  }
  if (score >= 20) {
    return 'Bu mesajda bazı spam göstergeleri var. Dikkatli olun.';
  }
  if (score >= 10) {
    return 'Mesaj genellikle güvenli, ancak küçük iyileştirmeler yapılabilir.';
  }
  return 'Mesaj güvenli görünüyor.';
}

/**
 * Quick check - just returns if spam or not
 * @param {string} message - Message to check
 * @returns {boolean} Is spam
 */
function isSpam(message) {
  const result = analyzeContent(message);
  return result.isSpam;
}

/**
 * Get spam score only
 * @param {string} message - Message to check
 * @returns {number} Spam score (0-100)
 */
function getSpamScore(message) {
  const result = analyzeContent(message);
  return result.score;
}

module.exports = {
  analyzeContent,
  isSpam,
  getSpamScore,
  SPAM_WEIGHTS,
  SPAM_KEYWORDS
};

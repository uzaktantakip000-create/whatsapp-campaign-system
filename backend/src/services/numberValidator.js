const db = require('../config/database');
const logger = require('../utils/logger');
const evolutionClient = require('./evolution/client');

/**
 * Number Validator Service
 * Validates phone numbers before sending messages to reduce ban risk
 */

// Validation cache (in-memory, consider Redis for production)
const validationCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Validation statuses
const VALIDATION_STATUS = {
  VALID: 'valid',           // Number is registered on WhatsApp
  INVALID: 'invalid',       // Number is NOT registered
  UNKNOWN: 'unknown',       // Could not determine
  CACHED: 'cached',         // Result from cache
  ERROR: 'error'            // Validation failed
};

/**
 * Validate a single phone number
 * @param {string} instanceName - Evolution instance name
 * @param {string} phoneNumber - Phone number to validate
 * @param {boolean} useCache - Whether to use cached results
 * @returns {Promise<Object>} Validation result
 */
async function validateNumber(instanceName, phoneNumber, useCache = true) {
  try {
    // Normalize phone number
    const normalizedNumber = normalizePhoneNumber(phoneNumber);

    if (!normalizedNumber) {
      return {
        number: phoneNumber,
        status: VALIDATION_STATUS.INVALID,
        reason: 'Invalid phone number format',
        isValid: false
      };
    }

    // Check cache first
    if (useCache) {
      const cached = getFromCache(normalizedNumber);
      if (cached) {
        logger.debug(`[NumberValidator] Cache hit for ${normalizedNumber}`);
        return {
          ...cached,
          status: VALIDATION_STATUS.CACHED,
          fromCache: true
        };
      }
    }

    // Check with Evolution API
    logger.debug(`[NumberValidator] Checking ${normalizedNumber} with WhatsApp`);

    const isRegistered = await evolutionClient.isNumberRegistered(instanceName, normalizedNumber);

    const result = {
      number: normalizedNumber,
      originalNumber: phoneNumber,
      status: isRegistered ? VALIDATION_STATUS.VALID : VALIDATION_STATUS.INVALID,
      isValid: isRegistered,
      checkedAt: new Date().toISOString()
    };

    // Cache the result
    setCache(normalizedNumber, result);

    // Update contact in database
    await updateContactValidation(normalizedNumber, isRegistered);

    return result;

  } catch (error) {
    logger.error(`[NumberValidator] Validation error for ${phoneNumber}: ${error.message}`);
    return {
      number: phoneNumber,
      status: VALIDATION_STATUS.ERROR,
      isValid: false,
      error: error.message
    };
  }
}

/**
 * Validate multiple phone numbers (batch)
 * @param {string} instanceName - Evolution instance name
 * @param {Array<string>} phoneNumbers - Array of phone numbers
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} Batch validation results
 */
async function validateNumbers(instanceName, phoneNumbers, options = {}) {
  const { useCache = true, concurrency = 5 } = options;

  const results = {
    total: phoneNumbers.length,
    valid: [],
    invalid: [],
    errors: [],
    cached: 0,
    validationTime: 0
  };

  const startTime = Date.now();

  // Process in batches to avoid rate limiting
  for (let i = 0; i < phoneNumbers.length; i += concurrency) {
    const batch = phoneNumbers.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(number => validateNumber(instanceName, number, useCache))
    );

    for (const result of batchResults) {
      if (result.fromCache) results.cached++;

      if (result.isValid) {
        results.valid.push(result);
      } else if (result.status === VALIDATION_STATUS.ERROR) {
        results.errors.push(result);
      } else {
        results.invalid.push(result);
      }
    }

    // Small delay between batches to avoid rate limiting
    if (i + concurrency < phoneNumbers.length) {
      await sleep(1000);
    }
  }

  results.validationTime = Date.now() - startTime;
  results.validRate = ((results.valid.length / results.total) * 100).toFixed(1) + '%';

  logger.info(`[NumberValidator] Batch validation complete: ${results.valid.length}/${results.total} valid (${results.validRate})`);

  return results;
}

/**
 * Validate all contacts for a consultant
 * @param {number} consultantId - Consultant ID
 * @param {string} instanceName - Evolution instance name
 * @returns {Promise<Object>} Validation results
 */
async function validateConsultantContacts(consultantId, instanceName) {
  try {
    logger.info(`[NumberValidator] Starting contact validation for consultant ${consultantId}`);

    // Get all contacts that haven't been validated recently
    const query = `
      SELECT id, number
      FROM contacts
      WHERE consultant_id = $1
        AND is_deleted = false
        AND (whatsapp_valid IS NULL OR validated_at < NOW() - INTERVAL '7 days')
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const result = await db.query(query, [consultantId]);
    const contacts = result.rows;

    if (contacts.length === 0) {
      return {
        success: true,
        message: 'No contacts need validation',
        validated: 0
      };
    }

    const phoneNumbers = contacts.map(c => c.number);
    const validationResults = await validateNumbers(instanceName, phoneNumbers);

    // Update database with results
    for (const validResult of validationResults.valid) {
      await db.query(
        `UPDATE contacts
         SET whatsapp_valid = true, validated_at = CURRENT_TIMESTAMP
         WHERE number = $1 AND consultant_id = $2`,
        [validResult.number, consultantId]
      );
    }

    for (const invalidResult of validationResults.invalid) {
      await db.query(
        `UPDATE contacts
         SET whatsapp_valid = false, validated_at = CURRENT_TIMESTAMP
         WHERE number = $1 AND consultant_id = $2`,
        [invalidResult.number, consultantId]
      );
    }

    return {
      success: true,
      total: validationResults.total,
      valid: validationResults.valid.length,
      invalid: validationResults.invalid.length,
      errors: validationResults.errors.length,
      validRate: validationResults.validRate,
      validationTime: validationResults.validationTime
    };

  } catch (error) {
    logger.error(`[NumberValidator] Consultant validation error: ${error.message}`);
    throw error;
  }
}

/**
 * Check if a number should be skipped (invalid or recently failed)
 * @param {number} consultantId - Consultant ID
 * @param {string} phoneNumber - Phone number
 * @returns {Promise<Object>} Skip recommendation
 */
async function shouldSkipNumber(consultantId, phoneNumber) {
  try {
    const normalizedNumber = normalizePhoneNumber(phoneNumber);

    // Check database for validation status
    const query = `
      SELECT whatsapp_valid, validated_at, message_count,
             (SELECT COUNT(*) FROM messages m
              INNER JOIN campaigns c ON m.campaign_id = c.id
              WHERE c.consultant_id = $1
                AND m.contact_id = contacts.id
                AND m.status = 'failed'
                AND m.created_at >= NOW() - INTERVAL '24 hours') as recent_failures
      FROM contacts
      WHERE consultant_id = $1 AND number = $2
    `;

    const result = await db.query(query, [consultantId, normalizedNumber]);

    if (result.rows.length === 0) {
      return { skip: false, reason: 'Contact not found' };
    }

    const contact = result.rows[0];

    // Skip if explicitly marked as invalid
    if (contact.whatsapp_valid === false) {
      return {
        skip: true,
        reason: 'Number not registered on WhatsApp',
        validatedAt: contact.validated_at
      };
    }

    // Skip if too many recent failures
    if (parseInt(contact.recent_failures) >= 3) {
      return {
        skip: true,
        reason: 'Too many recent delivery failures',
        failures: contact.recent_failures
      };
    }

    return { skip: false };

  } catch (error) {
    logger.error(`[NumberValidator] Skip check error: ${error.message}`);
    return { skip: false, error: error.message };
  }
}

/**
 * Normalize phone number to standard format
 * @param {string} phoneNumber - Raw phone number
 * @returns {string|null} Normalized number or null if invalid
 */
function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return null;

  // Remove all non-digit characters
  let cleaned = phoneNumber.toString().replace(/\D/g, '');

  // Handle Turkish numbers
  if (cleaned.startsWith('0')) {
    cleaned = '90' + cleaned.substring(1);
  }

  // Add country code if missing (assume Turkey)
  if (cleaned.length === 10 && cleaned.startsWith('5')) {
    cleaned = '90' + cleaned;
  }

  // Validate length
  if (cleaned.length < 10 || cleaned.length > 15) {
    return null;
  }

  return cleaned;
}

/**
 * Get validation statistics for a consultant
 * @param {number} consultantId - Consultant ID
 * @returns {Promise<Object>} Validation statistics
 */
async function getValidationStats(consultantId) {
  try {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE whatsapp_valid = true) as valid,
        COUNT(*) FILTER (WHERE whatsapp_valid = false) as invalid,
        COUNT(*) FILTER (WHERE whatsapp_valid IS NULL) as unvalidated,
        COUNT(*) FILTER (WHERE validated_at >= NOW() - INTERVAL '7 days') as recently_validated
      FROM contacts
      WHERE consultant_id = $1 AND is_deleted = false
    `;

    const result = await db.query(query, [consultantId]);
    const stats = result.rows[0];

    return {
      total: parseInt(stats.total),
      valid: parseInt(stats.valid),
      invalid: parseInt(stats.invalid),
      unvalidated: parseInt(stats.unvalidated),
      recentlyValidated: parseInt(stats.recently_validated),
      validRate: stats.total > 0
        ? ((stats.valid / stats.total) * 100).toFixed(1) + '%'
        : '0%'
    };

  } catch (error) {
    logger.error(`[NumberValidator] Stats error: ${error.message}`);
    throw error;
  }
}

// Cache helpers
function getFromCache(number) {
  const cached = validationCache.get(number);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  validationCache.delete(number);
  return null;
}

function setCache(number, data) {
  validationCache.set(number, {
    data,
    timestamp: Date.now()
  });
}

function clearCache() {
  validationCache.clear();
}

// Update contact validation in database
async function updateContactValidation(number, isValid) {
  try {
    await db.query(
      `UPDATE contacts
       SET whatsapp_valid = $1, validated_at = CURRENT_TIMESTAMP
       WHERE number = $2`,
      [isValid, number]
    );
  } catch (error) {
    logger.debug(`[NumberValidator] Could not update contact: ${error.message}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  validateNumber,
  validateNumbers,
  validateConsultantContacts,
  shouldSkipNumber,
  normalizePhoneNumber,
  getValidationStats,
  clearCache,
  VALIDATION_STATUS
};

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../../utils/logger');

/**
 * Authentication Service
 * Handles password hashing, verification, and JWT token management
 */

const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Hash a plain text password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    logger.debug('[AuthService] Password hashed successfully');
    return hash;
  } catch (error) {
    logger.error('[AuthService] Error hashing password:', error);
    throw new Error('Password hashing failed');
  }
}

/**
 * Compare plain text password with hashed password
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
async function comparePassword(password, hash) {
  try {
    const isMatch = await bcrypt.compare(password, hash);
    logger.debug(`[AuthService] Password comparison result: ${isMatch}`);
    return isMatch;
  } catch (error) {
    logger.error('[AuthService] Error comparing password:', error);
    return false;
  }
}

/**
 * Generate JWT token for consultant
 * @param {Object} consultant - Consultant object with id, email, name, role
 * @returns {string} JWT token
 */
function generateToken(consultant) {
  try {
    const payload = {
      id: consultant.id,
      email: consultant.email,
      name: consultant.name,
      role: consultant.role || 'consultant'
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    logger.info(`[AuthService] Token generated for consultant ${consultant.id} (${consultant.email})`);
    return token;
  } catch (error) {
    logger.error('[AuthService] Error generating token:', error);
    throw new Error('Token generation failed');
  }
}

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token payload or null if invalid
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    logger.debug(`[AuthService] Token verified for consultant ${decoded.id}`);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('[AuthService] Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn('[AuthService] Invalid token');
    } else {
      logger.error('[AuthService] Error verifying token:', error);
    }
    return null;
  }
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader) {
    return null;
  }

  // Expected format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    logger.warn('[AuthService] Invalid authorization header format');
    return null;
  }

  return parts[1];
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  extractTokenFromHeader
};

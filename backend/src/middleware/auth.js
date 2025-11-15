const authService = require('../services/auth/authService');
const logger = require('../utils/logger');
const db = require('../config/database');

/**
 * Auth Middleware
 * Provides authentication and authorization middleware for routes
 */

/**
 * Require authentication - reject requests without valid token
 * Adds req.user with decoded token payload
 * Optionally loads full consultant data from database
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn('[AuthMiddleware] No authorization header provided');
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'No authorization header provided'
      });
    }

    const token = authService.extractTokenFromHeader(authHeader);

    if (!token) {
      logger.warn('[AuthMiddleware] Invalid authorization header format');
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Invalid authorization header format. Expected: Bearer <token>'
      });
    }

    const decoded = authService.verifyToken(token);

    if (!decoded) {
      logger.warn('[AuthMiddleware] Invalid or expired token');
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid or expired token'
      });
    }

    // Add user info to request
    req.user = decoded;
    logger.debug(`[AuthMiddleware] Authenticated user: ${decoded.id} (${decoded.email})`);

    // Load full consultant data from database
    const result = await db.query(
      `SELECT id, name, email, phone, instance_name, whatsapp_number,
              status, daily_limit, spam_risk_score, connected_at,
              last_active_at, role, is_active
       FROM consultants
       WHERE id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      logger.warn(`[AuthMiddleware] Consultant not found: ${decoded.id}`);
      return res.status(401).json({
        success: false,
        error: 'Consultant not found',
        message: 'User account no longer exists'
      });
    }

    // Add full consultant data to request
    req.consultant = result.rows[0];
    logger.debug(`[AuthMiddleware] Consultant data loaded: ${req.consultant.instance_name}`);

    next();
  } catch (error) {
    logger.error('[AuthMiddleware] Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      details: error.message
    });
  }
}

/**
 * Optional authentication - parse token if present, continue if not
 * Adds req.user if token is valid, otherwise req.user is undefined
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.debug('[AuthMiddleware] No authorization header, continuing without auth');
      return next();
    }

    const token = authService.extractTokenFromHeader(authHeader);

    if (!token) {
      logger.debug('[AuthMiddleware] Invalid authorization header format, continuing without auth');
      return next();
    }

    const decoded = authService.verifyToken(token);

    if (decoded) {
      req.user = decoded;
      logger.debug(`[AuthMiddleware] Optional auth: Authenticated user: ${decoded.id}`);
    } else {
      logger.debug('[AuthMiddleware] Invalid token, continuing without auth');
    }

    next();
  } catch (error) {
    logger.error('[AuthMiddleware] Optional auth error:', error);
    // Continue without authentication on error
    next();
  }
}

/**
 * Require specific role - must be used after requireAuth
 * @param {string} role - Required role (e.g., 'admin', 'consultant')
 * @returns {Function} Middleware function
 */
function requireRole(role) {
  return function(req, res, next) {
    try {
      if (!req.user) {
        logger.warn('[AuthMiddleware] requireRole called without authentication');
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      if (req.user.role !== role) {
        logger.warn(`[AuthMiddleware] Access denied: User ${req.user.id} has role ${req.user.role}, required: ${role}`);
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: `This endpoint requires ${role} role`
        });
      }

      logger.debug(`[AuthMiddleware] Role check passed: ${req.user.role}`);
      next();
    } catch (error) {
      logger.error('[AuthMiddleware] Role check error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization error',
        details: error.message
      });
    }
  };
}

/**
 * Require any of specified roles
 * @param {string[]} roles - Array of allowed roles
 * @returns {Function} Middleware function
 */
function requireAnyRole(roles) {
  return function(req, res, next) {
    try {
      if (!req.user) {
        logger.warn('[AuthMiddleware] requireAnyRole called without authentication');
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      if (!roles.includes(req.user.role)) {
        logger.warn(`[AuthMiddleware] Access denied: User ${req.user.id} has role ${req.user.role}, required one of: ${roles.join(', ')}`);
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: `This endpoint requires one of these roles: ${roles.join(', ')}`
        });
      }

      logger.debug(`[AuthMiddleware] Role check passed: ${req.user.role}`);
      next();
    } catch (error) {
      logger.error('[AuthMiddleware] Role check error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization error',
        details: error.message
      });
    }
  };
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
  requireAnyRole
};

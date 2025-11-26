const db = require('../config/database');
const authService = require('../services/auth/authService');
const logger = require('../utils/logger');

/**
 * Auth Controller
 * Handles authentication endpoints: register, login, me, logout
 */

/**
 * Register a new consultant
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { name, email, password, phone } = req.body;

    logger.info(`[Auth] Registration attempt for email: ${email}`);

    // Check if email already exists
    const existingUser = await db.query(
      'SELECT id FROM consultants WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      logger.warn(`[Auth] Registration failed: Email already exists: ${email}`);
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // Hash password
    const passwordHash = await authService.hashPassword(password);

    // Generate unique instance_name from name
    const instanceNameBase = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    // Check if instance_name exists and add suffix if needed
    let instanceName = instanceNameBase;
    let suffix = 1;
    while (true) {
      const existing = await db.query(
        'SELECT id FROM consultants WHERE instance_name = $1',
        [instanceName]
      );
      if (existing.rows.length === 0) break;
      instanceName = `${instanceNameBase}_${suffix}`;
      suffix++;
    }

    // Insert new consultant
    const result = await db.query(`
      INSERT INTO consultants (
        name, email, password_hash, phone, instance_name, role, is_active
      ) VALUES ($1, $2, $3, $4, $5, 'consultant', true)
      RETURNING id, name, email, phone, instance_name, role, created_at
    `, [name, email, passwordHash, phone, instanceName]);

    const consultant = result.rows[0];

    // Generate JWT token
    const token = authService.generateToken(consultant);

    logger.info(`[Auth] Registration successful for ${email} (ID: ${consultant.id})`);

    res.status(201).json({
      success: true,
      data: {
        consultant: {
          id: consultant.id,
          name: consultant.name,
          email: consultant.email,
          phone: consultant.phone,
          instanceName: consultant.instance_name,
          role: consultant.role
        },
        token
      }
    });
  } catch (error) {
    logger.error('[Auth] Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      details: error.message
    });
  }
}

/**
 * Login consultant
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    logger.info(`[Auth] Login attempt for email: ${email}`);

    // Find consultant by email
    const result = await db.query(
      'SELECT * FROM consultants WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      logger.warn(`[Auth] Login failed: Email not found: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const consultant = result.rows[0];

    // Check if account is active
    if (!consultant.is_active) {
      logger.warn(`[Auth] Login failed: Account inactive: ${email}`);
      return res.status(403).json({
        success: false,
        error: 'Account is inactive. Please contact administrator.'
      });
    }

    // Check if password_hash exists
    if (!consultant.password_hash) {
      logger.warn(`[Auth] Login failed: No password set: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Verify password
    const isPasswordValid = await authService.comparePassword(password, consultant.password_hash);

    if (!isPasswordValid) {
      logger.warn(`[Auth] Login failed: Invalid password: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Update last_login_at
    await db.query(
      'UPDATE consultants SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [consultant.id]
    );

    // Generate JWT token
    const token = authService.generateToken(consultant);

    logger.info(`[Auth] Login successful for ${email} (ID: ${consultant.id})`);

    res.json({
      success: true,
      data: {
        consultant: {
          id: consultant.id,
          name: consultant.name,
          email: consultant.email,
          phone: consultant.phone,
          instanceName: consultant.instance_name,
          role: consultant.role,
          status: consultant.status
        },
        token
      }
    });
  } catch (error) {
    logger.error('[Auth] Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      details: error.message
    });
  }
}

/**
 * Get current consultant info
 * GET /api/auth/me
 * Protected route - requires authentication
 */
async function me(req, res) {
  try {
    const consultantId = req.user.id;

    logger.debug(`[Auth] Fetching info for consultant ${consultantId}`);

    const result = await db.query(`
      SELECT
        c.*,
        COUNT(DISTINCT contacts.id) as contacts_count,
        COUNT(DISTINCT campaigns.id) as campaigns_count,
        (
          SELECT COUNT(*)
          FROM messages m
          JOIN campaigns camp ON m.campaign_id = camp.id
          WHERE camp.consultant_id = c.id
            AND DATE(m.created_at) = CURRENT_DATE
            AND m.status != 'failed'
        ) as messages_sent_today
      FROM consultants c
      LEFT JOIN contacts ON contacts.consultant_id = c.id
      LEFT JOIN campaigns ON campaigns.consultant_id = c.id
      WHERE c.id = $1
      GROUP BY c.id
    `, [consultantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Consultant not found'
      });
    }

    const row = result.rows[0];

    // Transform to camelCase and remove sensitive data
    const consultant = {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      instanceName: row.instance_name,
      status: row.status,
      dailyLimit: row.daily_limit,
      spamRiskScore: row.spam_risk_score,
      whatsappNumber: row.whatsapp_number,
      connectedAt: row.connected_at,
      lastActiveAt: row.last_active_at,
      isActive: row.is_active,
      contactsCount: parseInt(row.contacts_count) || 0,
      campaignsCount: parseInt(row.campaigns_count) || 0,
      messagesSentToday: parseInt(row.messages_sent_today) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    res.json({
      success: true,
      data: consultant
    });
  } catch (error) {
    logger.error('[Auth] Me endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consultant info',
      details: error.message
    });
  }
}

/**
 * Logout consultant
 * POST /api/auth/logout
 * Protected route - requires authentication
 */
async function logout(req, res) {
  try {
    // In a stateless JWT system, logout is handled client-side by removing the token
    // But we can log the event for audit purposes
    const consultantId = req.user.id;
    logger.info(`[Auth] Logout for consultant ${consultantId}`);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('[Auth] Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      details: error.message
    });
  }
}

module.exports = {
  register,
  login,
  me,
  logout
};

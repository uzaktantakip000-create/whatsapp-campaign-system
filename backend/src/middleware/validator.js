const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Validation Middleware
 * Validates request body, query, and params using Joi schemas
 */

/**
 * Validate request body
 */
function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn(`[Validator] Body validation failed: ${JSON.stringify(errors)}`);

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    req.body = value;
    next();
  };
}

/**
 * Validate query parameters
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn(`[Validator] Query validation failed: ${JSON.stringify(errors)}`);

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    req.query = value;
    next();
  };
}

/**
 * Validate URL parameters (simple ID validation)
 */
function validateParams(...paramNames) {
  return (req, res, next) => {
    const errors = [];

    for (const paramName of paramNames) {
      const value = req.params[paramName];

      // Validate ID is a positive integer
      if (paramName === 'id') {
        const id = parseInt(value);
        if (isNaN(id) || id <= 0) {
          errors.push({
            field: paramName,
            message: `${paramName} must be a positive integer`
          });
        }
      }
    }

    if (errors.length > 0) {
      logger.warn(`[Validator] Params validation failed: ${JSON.stringify(errors)}`);

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
}

module.exports = {
  validateBody,
  validateQuery,
  validateParams
};

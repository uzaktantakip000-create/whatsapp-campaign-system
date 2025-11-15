const winston = require('winston');
const path = require('path');

/**
 * Winston logger configuration for WhatsApp Campaign System
 * Logs to console and files (combined.log, errors.log)
 */

// Determine log directory based on environment
// In Docker/production: /app/logs
// In local development: ../../../logs/backend
const LOG_DIR = process.env.NODE_ENV === 'production'
  ? '/app/logs'
  : path.join(__dirname, '../../../logs/backend');

// Log formatı
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${stack || message}`;
  })
);

// Logger oluştur
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console log (colored)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    // File log - Tüm loglar
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // File log - Sadece hatalar
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'errors.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

/**
 * Log helper methods
 */
logger.logRequest = (req) => {
  logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);
};

logger.logResponse = (req, res, duration) => {
  logger.info(`${req.method} ${req.path} - Status: ${res.statusCode} - Duration: ${duration}ms`);
};

logger.logError = (error, context = '') => {
  logger.error(`${context ? `[${context}] ` : ''}${error.message}`, { stack: error.stack });
};

module.exports = logger;

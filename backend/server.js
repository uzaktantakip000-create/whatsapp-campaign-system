// Load environment variables
// In Docker, environment variables are injected directly
// In local development, load from ../.env
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '../.env' });
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');
const logger = require('./src/utils/logger');
const db = require('./src/config/database');

const app = express();
const PORT = process.env.BACKEND_PORT || 3000;

// Campaign Executor Service
const campaignExecutor = require('./src/services/campaignExecutor');

// ============================================
// MIDDLEWARE
// ============================================

// Security (allow Swagger UI inline scripts)
app.use(helmet({
  contentSecurityPolicy: false // Required for Swagger UI
}));

// CORS
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',  // Frontend development server
    'http://localhost:5174',
    'http://localhost:5175',  // Frontend current port
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
// Development: Very high limits for testing
// Production: Stricter limits for security
const isDevelopment = process.env.NODE_ENV !== 'production';
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 1) * 60 * 1000, // Default: 1 minute
  max: isDevelopment ? 10000 : (process.env.RATE_LIMIT_MAX || 1000), // Dev: 10000, Prod: 1000 per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isDevelopment && req.ip === '::1' || req.ip === '127.0.0.1' // Skip rate limit for localhost in dev
});
app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  // Log request
  logger.logRequest(req);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logResponse(req, res, duration);
  });

  next();
});

// ============================================
// ROUTES
// ============================================

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await db.testConnection();

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus ? 'connected' : 'disconnected',
      version: '1.0.0'
    });
  } catch (error) {
    logger.logError(error, 'Health Check');
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// API Documentation (Swagger)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'WhatsApp Campaign API Docs'
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/whatsapp', require('./src/routes/whatsapp'));
app.use('/api/webhooks', require('./src/routes/webhooks'));
app.use('/api/consultants', require('./src/routes/consultants'));
app.use('/api/campaigns', require('./src/routes/campaigns'));
app.use('/api/contacts', require('./src/routes/contacts'));
app.use('/api/messages', require('./src/routes/messages'));
app.use('/api/templates', require('./src/routes/templates'));
app.use('/api/admin', require('./src/routes/admin'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.logError(err, 'Global Error Handler');

  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ============================================
// SERVER START
// ============================================

const startServer = async () => {
  try {
    // Test database connection
    logger.info('[Server] Testing database connection...');
    const dbConnected = await db.testConnection();

    if (!dbConnected) {
      logger.error('[Server] Database connection failed. Exiting...');
      process.exit(1);
    }

    // Start server
    app.listen(PORT, () => {
      logger.info('='.repeat(50));
      logger.info(`🚀 WhatsApp Campaign System Backend`);
      logger.info(`📍 Server running on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`💚 Health check: http://localhost:${PORT}/health`);
      logger.info(`🗄️  Database: Connected`);
      logger.info('='.repeat(50));

      // Start campaign executor
      logger.info('[Server] Starting campaign executor...');
      campaignExecutor.start();
      logger.info('[Server] Campaign executor started successfully');
    });
  } catch (error) {
    logger.logError(error, 'Server Startup');
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('[Server] SIGTERM received. Shutting down gracefully...');
  campaignExecutor.stop();
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('[Server] SIGINT received. Shutting down gracefully...');
  campaignExecutor.stop();
  await db.close();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;

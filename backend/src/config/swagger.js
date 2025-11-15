const swaggerJsdoc = require('swagger-jsdoc');

/**
 * Swagger API Documentation Configuration
 * Automatically generates API docs from JSDoc comments
 */

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhatsApp Campaign System API',
      version: '1.0.0',
      description: `
        Multi-consultant WhatsApp campaign management system with Evolution API integration.

        ## Features
        - JWT Authentication & Authorization
        - Role-based access control (Admin/Consultant)
        - WhatsApp connection management via QR code
        - Contact synchronization from WhatsApp
        - Campaign and message management
        - Template-based messaging
        - Warm-up strategy for new accounts
        - OpenAI integration for message variations

        ## Authentication
        Most endpoints require a JWT token. Use the \`/api/auth/login\` endpoint to obtain a token.
        Include the token in the Authorization header:
        \`\`\`
        Authorization: Bearer <your_token>
        \`\`\`
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'http://localhost:3000',
        description: 'Docker development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Error message'
            },
            message: {
              type: 'string',
              example: 'Detailed error description'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object'
            },
            message: {
              type: 'string',
              example: 'Operation successful'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints (login, register, logout)'
      },
      {
        name: 'Consultants',
        description: 'Consultant management and dashboard'
      },
      {
        name: 'Admin',
        description: 'Admin-only endpoints for system management'
      },
      {
        name: 'WhatsApp',
        description: 'WhatsApp connection and instance management'
      },
      {
        name: 'Contacts',
        description: 'Contact management and synchronization'
      },
      {
        name: 'Campaigns',
        description: 'Campaign creation and management'
      },
      {
        name: 'Messages',
        description: 'Message sending and tracking'
      },
      {
        name: 'Templates',
        description: 'Message template management'
      },
      {
        name: 'Webhooks',
        description: 'Evolution API webhook handlers'
      }
    ]
  },
  // Path to the API routes
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

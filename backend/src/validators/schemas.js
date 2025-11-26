const Joi = require('joi');

/**
 * Validation Schemas for API Endpoints
 * All input validation rules using Joi
 */

// ==========================================
// AUTHENTICATION SCHEMAS
// ==========================================

const registerSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 3 characters',
      'string.max': 'Name cannot exceed 100 characters'
    }),

  email: Joi.string()
    .email()
    .max(100)
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Email must be valid'
    }),

  password: Joi.string()
    .min(8)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password cannot exceed 100 characters'
    }),

  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid phone number format (use E.164 format)'
    })
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Email must be valid'
    }),

  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required'
    })
});

// ==========================================
// CONSULTANT SCHEMAS
// ==========================================

const createConsultantSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 3 characters',
      'string.max': 'Name cannot exceed 100 characters'
    }),

  email: Joi.string()
    .email()
    .max(100)
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Email must be valid'
    }),

  instance_name: Joi.string()
    .min(3)
    .max(100)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required()
    .messages({
      'string.empty': 'Instance name is required',
      'string.pattern.base': 'Instance name can only contain letters, numbers, hyphens, and underscores'
    }),

  daily_limit: Joi.number()
    .integer()
    .min(1)
    .max(500)
    .default(200)
    .messages({
      'number.min': 'Daily limit must be at least 1',
      'number.max': 'Daily limit cannot exceed 500'
    }),

  whatsapp_number: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Invalid phone number format (use E.164 format)'
    })
});

const updateConsultantSchema = Joi.object({
  name: Joi.string().min(3).max(100),
  email: Joi.string().email().max(100),
  daily_limit: Joi.number().integer().min(1).max(500),
  status: Joi.string().valid('active', 'inactive', 'pending', 'suspended'),
  whatsapp_number: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).allow(null, '')
}).min(1);

// ==========================================
// CAMPAIGN SCHEMAS
// ==========================================

const createCampaignSchema = Joi.object({
  consultant_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Consultant ID must be a number',
      'any.required': 'Consultant ID is required'
    }),

  name: Joi.string()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Campaign name is required',
      'string.min': 'Campaign name must be at least 3 characters'
    }),

  message_template: Joi.string()
    .min(10)
    .max(4000)
    .optional()
    .allow('')
    .messages({
      'string.min': 'Message template must be at least 10 characters',
      'string.max': 'Message template cannot exceed 4000 characters'
    }),

  template_id: Joi.number()
    .integer()
    .positive()
    .optional()
    .allow(null),

  use_ai_variations: Joi.boolean().optional(),

  segment_filter: Joi.string()
    .max(20)
    .optional()
    .allow(null, '')
});

const updateCampaignSchema = Joi.object({
  name: Joi.string().min(3).max(200),
  message_template: Joi.string().min(10).max(4000),
  status: Joi.string().valid('draft', 'running', 'paused', 'completed', 'failed')
}).min(1);

// ==========================================
// CONTACT SCHEMAS
// ==========================================

const createContactSchema = Joi.object({
  consultant_id: Joi.number()
    .integer()
    .positive()
    .required(),

  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Contact name is required'
    }),

  number: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required()
    .messages({
      'string.empty': 'Phone number is required',
      'string.pattern.base': 'Invalid phone number format'
    }),

  segment: Joi.string()
    .valid('A', 'B', 'C')
    .default('B')
    .messages({
      'any.only': 'Segment must be A (hot), B (warm), or C (cold)'
    }),

  tags: Joi.array()
    .items(Joi.string().max(50))
    .max(10)
    .default([])
});

const updateContactSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  segment: Joi.string().valid('A', 'B', 'C'),
  tags: Joi.array().items(Joi.string().max(50)).max(10)
}).min(1);

const contactQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(20),
  consultant_id: Joi.number().integer().positive(),
  segment: Joi.string().valid('A', 'B', 'C'),
  search: Joi.string().allow('').max(100),
  sort: Joi.string().valid('created_at', 'updated_at', 'name', 'number').default('created_at'),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

// ==========================================
// MESSAGE SCHEMAS
// ==========================================

const sendMessageSchema = Joi.object({
  campaign_id: Joi.number()
    .integer()
    .positive()
    .required(),

  contact_id: Joi.number()
    .integer()
    .positive()
    .required(),

  message_text: Joi.string()
    .min(1)
    .max(4000)
    .optional()
    .messages({
      'string.empty': 'Message text cannot be empty',
      'string.max': 'Message cannot exceed 4000 characters'
    }),

  template_id: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': 'Template ID must be a number',
      'number.positive': 'Template ID must be positive'
    }),

  custom_variables: Joi.object()
    .optional()
    .messages({
      'object.base': 'Custom variables must be an object'
    }),

  scheduled_for: Joi.date()
    .iso()
    .min('now')
    .allow(null)
    .messages({
      'date.min': 'Scheduled time cannot be in the past'
    })
}).or('message_text', 'template_id')
  .messages({
    'object.missing': 'Either message_text or template_id must be provided'
  });

// ==========================================
// QUERY PARAMETER SCHEMAS
// ==========================================

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().valid('created_at', 'updated_at', 'name', 'status').default('created_at'),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

const consultantQuerySchema = paginationSchema.keys({
  status: Joi.string().valid('active', 'inactive', 'pending', 'suspended'),
  search: Joi.string().allow('').max(100)
});

const campaignQuerySchema = paginationSchema.keys({
  consultant_id: Joi.number().integer().positive(),
  status: Joi.string().valid('draft', 'running', 'paused', 'completed', 'failed'),
  search: Joi.string().allow('').max(100)
});

const messageQuerySchema = paginationSchema.keys({
  campaign_id: Joi.number().integer().positive(),
  contact_id: Joi.number().integer().positive(),
  status: Joi.string().valid('pending', 'sent', 'delivered', 'read', 'failed'),
  date_from: Joi.date().iso(),
  date_to: Joi.date().iso().greater(Joi.ref('date_from'))
});

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  // Authentication schemas
  registerSchema,
  loginSchema,

  // Consultant schemas
  createConsultantSchema,
  updateConsultantSchema,
  consultantQuerySchema,

  // Campaign schemas
  createCampaignSchema,
  updateCampaignSchema,
  campaignQuerySchema,

  // Contact schemas
  createContactSchema,
  updateContactSchema,
  contactQuerySchema,

  // Message schemas
  sendMessageSchema,
  messageQuerySchema,

  // Utility schemas
  paginationSchema
};

// ============================================
// TEMPLATE SCHEMAS
// ============================================

const createTemplateSchema = Joi.object({
  consultant_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Consultant ID must be a number',
      'number.positive': 'Consultant ID must be positive',
      'any.required': 'Consultant ID is required'
    }),
  name: Joi.string().min(3).max(100).required()
    .messages({
      'string.min': 'Template name must be at least 3 characters',
      'string.max': 'Template name cannot exceed 100 characters',
      'any.required': 'Template name is required'
    }),
  content: Joi.string().min(10).max(5000).required()
    .messages({
      'string.min': 'Template content must be at least 10 characters',
      'string.max': 'Template content cannot exceed 5000 characters',
      'any.required': 'Template content is required'
    }),
  category: Joi.string().max(50).optional()
    .messages({
      'string.max': 'Category cannot exceed 50 characters'
    }),
  is_active: Joi.boolean().optional()
    .messages({
      'boolean.base': 'is_active must be a boolean'
    })
});

const updateTemplateSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional()
    .messages({
      'string.min': 'Template name must be at least 3 characters',
      'string.max': 'Template name cannot exceed 100 characters'
    }),
  content: Joi.string().min(10).max(5000).optional()
    .messages({
      'string.min': 'Template content must be at least 10 characters',
      'string.max': 'Template content cannot exceed 5000 characters'
    }),
  category: Joi.string().max(50).optional()
    .messages({
      'string.max': 'Category cannot exceed 50 characters'
    }),
  is_active: Joi.boolean().optional()
    .messages({
      'boolean.base': 'is_active must be a boolean'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

const templateQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  consultant_id: Joi.number().integer().positive(),
  category: Joi.string().max(50),
  is_active: Joi.boolean(),
  search: Joi.string().max(100),
  sort: Joi.string().valid('created_at', 'updated_at', 'name', 'usage_count').default('created_at'),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

const renderTemplateSchema = Joi.object({
  variables: Joi.object().required()
    .messages({
      'any.required': 'Variables object is required'
    })
});

const previewTemplateSchema = Joi.object({
  variables: Joi.object().optional()
});

const generateVariationsSchema = Joi.object({
  count: Joi.number().integer().min(1).max(5).default(3)
    .messages({
      'number.min': 'Count must be at least 1',
      'number.max': 'Count cannot exceed 5'
    }),
  tone: Joi.string().valid('professional', 'friendly', 'casual', 'urgent').default('professional')
    .messages({
      'any.only': 'Tone must be one of: professional, friendly, casual, urgent'
    }),
  context: Joi.string().max(500).optional()
    .messages({
      'string.max': 'Context cannot exceed 500 characters'
    }),
  variables: Joi.object().optional()
});

const improveTemplateSchema = Joi.object({
  tone: Joi.string().valid('professional', 'friendly', 'casual', 'urgent').default('professional')
    .messages({
      'any.only': 'Tone must be one of: professional, friendly, casual, urgent'
    }),
  goal: Joi.string().max(200).default('increase engagement')
    .messages({
      'string.max': 'Goal cannot exceed 200 characters'
    })
});

// Export new schemas
module.exports.createTemplateSchema = createTemplateSchema;
module.exports.updateTemplateSchema = updateTemplateSchema;
module.exports.templateQuerySchema = templateQuerySchema;
module.exports.renderTemplateSchema = renderTemplateSchema;
module.exports.previewTemplateSchema = previewTemplateSchema;
module.exports.generateVariationsSchema = generateVariationsSchema;
module.exports.improveTemplateSchema = improveTemplateSchema;

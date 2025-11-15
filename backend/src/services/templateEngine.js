const logger = require('../utils/logger');

/**
 * Template Engine Service
 * Handles message template processing, placeholder parsing, and rendering
 */

class TemplateEngine {
  /**
   * Extract placeholder variables from template content
   * @param {string} content - Template content with placeholders like {name}, {product}
   * @returns {Array<string>} Array of unique variable names
   * @example
   * extractVariables("Hello {name}, check {product}!")
   * // Returns: ['name', 'product']
   */
  static extractVariables(content) {
    try {
      if (!content || typeof content !== 'string') {
        return [];
      }

      // Regex to match {variableName} pattern
      const regex = /{([a-zA-Z_][a-zA-Z0-9_]*)}/g;
      const matches = content.matchAll(regex);
      const variables = new Set();

      for (const match of matches) {
        variables.add(match[1]); // match[1] is the variable name without braces
      }

      return Array.from(variables);
    } catch (error) {
      logger.error(`[TemplateEngine] Error extracting variables: ${error.message}`);
      return [];
    }
  }

  /**
   * Render template with provided variables
   * @param {string} content - Template content with placeholders
   * @param {Object} variables - Key-value pairs for replacement
   * @returns {string} Rendered content with variables replaced
   * @throws {Error} If required variables are missing
   * @example
   * render("Hello {name}!", {name: "John"})
   * // Returns: "Hello John!"
   */
  static render(content, variables = {}) {
    try {
      if (!content || typeof content !== 'string') {
        throw new Error('Content must be a non-empty string');
      }

      // Extract required variables from template
      const requiredVars = this.extractVariables(content);

      // Check if all required variables are provided
      const missingVars = requiredVars.filter(varName => !(varName in variables));
      if (missingVars.length > 0) {
        throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
      }

      // Replace each placeholder with its value
      let rendered = content;
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{${key}}`;
        // Use global replacement
        rendered = rendered.split(placeholder).join(String(value));
      }

      logger.info(`[TemplateEngine] Template rendered successfully (${requiredVars.length} variables)`);
      return rendered;

    } catch (error) {
      logger.error(`[TemplateEngine] Error rendering template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate template content
   * @param {string} content - Template content to validate
   * @returns {Object} Validation result {valid: boolean, errors: Array<string>, variables: Array<string>}
   */
  static validate(content) {
    const result = {
      valid: true,
      errors: [],
      variables: []
    };

    try {
      if (!content || typeof content !== 'string') {
        result.valid = false;
        result.errors.push('Content must be a non-empty string');
        return result;
      }

      if (content.trim().length === 0) {
        result.valid = false;
        result.errors.push('Content cannot be empty or whitespace only');
        return result;
      }

      // Extract variables
      result.variables = this.extractVariables(content);

      // Check for malformed placeholders
      const malformedRegex = /{[^}]*$/g; // { without closing }
      const malformed = content.match(malformedRegex);
      if (malformed) {
        result.valid = false;
        result.errors.push('Template contains unclosed placeholders');
      }

      // Check for empty placeholders
      const emptyPlaceholders = content.match(/{}/g);
      if (emptyPlaceholders) {
        result.valid = false;
        result.errors.push('Template contains empty placeholders {}');
      }

      // Check for invalid variable names (must start with letter or underscore)
      const invalidVarRegex = /{([^a-zA-Z_][^}]*)}/g;
      const invalidVars = [...content.matchAll(invalidVarRegex)];
      if (invalidVars.length > 0) {
        result.valid = false;
        result.errors.push(`Invalid variable names: ${invalidVars.map(m => m[1]).join(', ')}`);
      }

      logger.info(`[TemplateEngine] Template validation: ${result.valid ? 'VALID' : 'INVALID'}`);
      return result;

    } catch (error) {
      logger.error(`[TemplateEngine] Error validating template: ${error.message}`);
      result.valid = false;
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Preview template with sample data
   * @param {string} content - Template content
   * @param {Object} sampleData - Sample variable values
   * @returns {string} Preview of rendered template
   */
  static preview(content, sampleData = {}) {
    try {
      const variables = this.extractVariables(content);

      // Fill missing variables with placeholder text
      const previewData = { ...sampleData };
      variables.forEach(varName => {
        if (!(varName in previewData)) {
          previewData[varName] = `[${varName.toUpperCase()}]`;
        }
      });

      return this.render(content, previewData);

    } catch (error) {
      logger.error(`[TemplateEngine] Error previewing template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get random template from array
   * @param {Array} templates - Array of template objects
   * @param {Object} filters - Optional filters {category, is_active}
   * @returns {Object|null} Random template or null if none found
   */
  static selectRandom(templates, filters = {}) {
    try {
      if (!Array.isArray(templates) || templates.length === 0) {
        return null;
      }

      // Apply filters
      let filtered = templates;

      if (filters.category) {
        filtered = filtered.filter(t => t.category === filters.category);
      }

      if (filters.is_active !== undefined) {
        filtered = filtered.filter(t => t.is_active === filters.is_active);
      }

      if (filtered.length === 0) {
        logger.warn('[TemplateEngine] No templates found matching filters');
        return null;
      }

      // Select random
      const randomIndex = Math.floor(Math.random() * filtered.length);
      const selected = filtered[randomIndex];

      logger.info(`[TemplateEngine] Selected random template: ${selected.name || selected.id}`);
      return selected;

    } catch (error) {
      logger.error(`[TemplateEngine] Error selecting random template: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate variations of a message using multiple templates
   * @param {Array} templates - Array of template objects with 'content' property
   * @param {Object} variables - Variables to inject
   * @param {number} count - Number of variations to generate (default: all)
   * @returns {Array<string>} Array of rendered variations
   */
  static generateVariations(templates, variables, count = null) {
    try {
      if (!Array.isArray(templates) || templates.length === 0) {
        throw new Error('Templates array is required');
      }

      const variations = [];
      const activeTemplates = templates.filter(t => t.is_active !== false);

      const limit = count || activeTemplates.length;
      const templatesToUse = activeTemplates.slice(0, limit);

      for (const template of templatesToUse) {
        try {
          const rendered = this.render(template.content, variables);
          variations.push(rendered);
        } catch (error) {
          logger.warn(`[TemplateEngine] Skipping template ${template.id}: ${error.message}`);
        }
      }

      logger.info(`[TemplateEngine] Generated ${variations.length} variations`);
      return variations;

    } catch (error) {
      logger.error(`[TemplateEngine] Error generating variations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if content contains valid placeholders
   * @param {string} content - Content to check
   * @returns {boolean} True if contains at least one valid placeholder
   */
  static hasPlaceholders(content) {
    const variables = this.extractVariables(content);
    return variables.length > 0;
  }
}

module.exports = TemplateEngine;

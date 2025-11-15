const OpenAI = require('openai');
const logger = require('../../utils/logger');

/**
 * OpenAI Client Service
 * Handles all interactions with OpenAI API for message generation
 */

class OpenAIClient {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '500');
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE || '0.7');

    // Check if API key is missing or is a placeholder
    const placeholderKeys = [
      'sk-proj-BURAYA_GERCEK_ANAHTAR_GELECEK',
      'your-api-key-here',
      'YOUR_API_KEY',
      'placeholder'
    ];

    if (!this.apiKey || placeholderKeys.includes(this.apiKey)) {
      logger.warn('[OpenAI] API key not configured - service will be disabled');
      this.enabled = false;
      return;
    }

    try {
      this.client = new OpenAI({
        apiKey: this.apiKey
      });
      this.enabled = true;
      logger.info(`[OpenAI] Client initialized with model: ${this.model}`);
    } catch (error) {
      logger.error(`[OpenAI] Initialization error: ${error.message}`);
      this.enabled = false;
    }
  }

  /**
   * Check if OpenAI service is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Test OpenAI API connection
   * @returns {Promise<Object>} Connection status
   */
  async testConnection() {
    try {
      if (!this.enabled) {
        return { success: false, error: 'OpenAI API key not configured' };
      }

      logger.info('[OpenAI] Testing API connection...');

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        max_tokens: 10
      });

      logger.info('[OpenAI] Connection test successful');

      return {
        success: true,
        model: this.model,
        responseId: response.id,
        usage: response.usage
      };

    } catch (error) {
      logger.error(`[OpenAI] Connection test failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate a single message variation
   * @param {string} baseMessage - Original message
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated variation
   */
  async generateVariation(baseMessage, options = {}) {
    try {
      if (!this.enabled) {
        throw new Error('OpenAI service is not enabled');
      }

      const {
        tone = 'professional',
        context = '',
        preserveMeaning = true,
        maxLength = null
      } = options;

      logger.info(`[OpenAI] Generating variation (tone: ${tone})`);

      // Build system prompt
      const systemPrompt = this._buildSystemPrompt(tone, preserveMeaning, maxLength);

      // Build user prompt
      const userPrompt = this._buildUserPrompt(baseMessage, context);

      // Call OpenAI API
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        n: 1
      });

      const variation = response.choices[0].message.content.trim();

      logger.info(`[OpenAI] Variation generated successfully`);

      return {
        success: true,
        variation: variation,
        original: baseMessage,
        tone: tone,
        usage: response.usage,
        cost: this._calculateCost(response.usage)
      };

    } catch (error) {
      logger.error(`[OpenAI] Variation generation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate multiple variations at once
   * @param {string} baseMessage - Original message
   * @param {number} count - Number of variations (1-5)
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated variations
   */
  async generateMultipleVariations(baseMessage, count = 3, options = {}) {
    try {
      if (!this.enabled) {
        throw new Error('OpenAI service is not enabled');
      }

      if (count < 1 || count > 5) {
        throw new Error('Count must be between 1 and 5');
      }

      const {
        tone = 'professional',
        context = '',
        preserveMeaning = true
      } = options;

      logger.info(`[OpenAI] Generating ${count} variations (tone: ${tone})`);

      const systemPrompt = this._buildSystemPrompt(tone, preserveMeaning);
      const userPrompt = this._buildMultipleVariationsPrompt(baseMessage, count, context);

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: this.maxTokens * count,
        temperature: this.temperature,
        n: 1
      });

      const content = response.choices[0].message.content.trim();

      // Parse variations (assuming numbered list format)
      const variations = this._parseVariations(content);

      logger.info(`[OpenAI] ${variations.length} variations generated successfully`);

      return {
        success: true,
        variations: variations,
        original: baseMessage,
        count: variations.length,
        tone: tone,
        usage: response.usage,
        cost: this._calculateCost(response.usage)
      };

    } catch (error) {
      logger.error(`[OpenAI] Multiple variations generation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Improve a message template
   * @param {string} template - Template content with placeholders
   * @param {Object} options - Improvement options
   * @returns {Promise<Object>} Improved template
   */
  async improveTemplate(template, options = {}) {
    try {
      if (!this.enabled) {
        throw new Error('OpenAI service is not enabled');
      }

      const {
        tone = 'professional',
        goal = 'increase engagement'
      } = options;

      logger.info(`[OpenAI] Improving template (goal: ${goal})`);

      const systemPrompt = `You are an expert copywriter specializing in ${tone} business messages.
Your goal is to ${goal} while maintaining placeholder variables intact.
Keep placeholders in the format {variable_name} exactly as they are.
Make the message more engaging, clear, and persuasive.`;

      const userPrompt = `Improve this message template while keeping all {placeholder} variables exactly as they are:

"${template}"

Return only the improved template, nothing else.`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: this.maxTokens,
        temperature: 0.7
      });

      const improved = response.choices[0].message.content.trim();

      logger.info(`[OpenAI] Template improved successfully`);

      return {
        success: true,
        improved: improved,
        original: template,
        usage: response.usage,
        cost: this._calculateCost(response.usage)
      };

    } catch (error) {
      logger.error(`[OpenAI] Template improvement error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build system prompt for variation generation
   * @private
   */
  _buildSystemPrompt(tone, preserveMeaning, maxLength) {
    let prompt = `You are an expert copywriter. Generate message variations that are natural and human-like.

Tone: ${tone}
${preserveMeaning ? 'IMPORTANT: Preserve the core meaning and intent of the original message.' : ''}
${maxLength ? `Keep the variation under ${maxLength} characters.` : ''}

Rules:
- Write in Turkish if the original is in Turkish
- Make it sound natural and conversational
- Avoid overly formal or robotic language
- Keep the message structure similar but words different
- Do NOT add greetings or signatures unless in original`;

    return prompt;
  }

  /**
   * Build user prompt for single variation
   * @private
   */
  _buildUserPrompt(baseMessage, context) {
    let prompt = `Create a variation of this message:\n\n"${baseMessage}"`;

    if (context) {
      prompt += `\n\nContext: ${context}`;
    }

    prompt += '\n\nReturn only the variation, nothing else.';

    return prompt;
  }

  /**
   * Build user prompt for multiple variations
   * @private
   */
  _buildMultipleVariationsPrompt(baseMessage, count, context) {
    let prompt = `Create ${count} different variations of this message:\n\n"${baseMessage}"`;

    if (context) {
      prompt += `\n\nContext: ${context}`;
    }

    prompt += `\n\nReturn ${count} numbered variations (1., 2., 3., etc.), each on a new line. Return ONLY the variations, no explanations.`;

    return prompt;
  }

  /**
   * Parse numbered variations from response
   * @private
   */
  _parseVariations(content) {
    // Split by line and filter out empty lines
    const lines = content.split('\n').filter(line => line.trim());

    const variations = [];

    for (const line of lines) {
      // Match numbered format: "1. text", "1) text", or just lines
      const match = line.match(/^\d+[\.)]\s*(.+)$/);
      if (match) {
        variations.push(match[1].trim());
      } else if (line.trim() && !line.match(/^\d+[\.)]\s*$/)) {
        // If line doesn't match number format but has content, include it
        variations.push(line.trim());
      }
    }

    return variations.length > 0 ? variations : [content.trim()];
  }

  /**
   * Calculate approximate cost based on usage
   * @private
   */
  _calculateCost(usage) {
    if (!usage) return 0;

    // Approximate pricing (as of 2024)
    // GPT-3.5-turbo: $0.0015 / 1K prompt tokens, $0.002 / 1K completion tokens
    // GPT-4: $0.03 / 1K prompt tokens, $0.06 / 1K completion tokens

    const pricing = this.model.includes('gpt-4')
      ? { prompt: 0.03, completion: 0.06 }
      : { prompt: 0.0015, completion: 0.002 };

    const promptCost = (usage.prompt_tokens / 1000) * pricing.prompt;
    const completionCost = (usage.completion_tokens / 1000) * pricing.completion;

    return parseFloat((promptCost + completionCost).toFixed(6));
  }
}

// Export singleton instance
module.exports = new OpenAIClient();

require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const logger = require('./src/utils/logger');

const API_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * Templates API Integration Test
 */

let testConsultantId = null;
let testTemplateId = null;

async function runTemplatesTests() {
  logger.info('='.repeat(70));
  logger.info('🧪 TESTING TEMPLATES API ENDPOINTS');
  logger.info('='.repeat(70));

  let passedTests = 0;
  let failedTests = 0;

  try {
    // ==========================================
    // SETUP: Create test consultant
    // ==========================================
    logger.info('\n[SETUP] Creating test consultant');
    try {
      const response = await axios.post(`${API_URL}/api/consultants`, {
        name: 'Test Consultant for Templates',
        email: `templates.test.${Date.now()}@example.com`,
        instance_name: `templates_test_${Date.now()}`,
        daily_limit: 200
      });

      if (response.status === 201) {
        testConsultantId = response.data.data.id;
        logger.info(`✅ Test consultant created with ID ${testConsultantId}`);
      }
    } catch (error) {
      logger.error(`❌ SETUP FAILED: ${error.message}`);
      process.exit(1);
    }

    // ==========================================
    // TEST 1: Create Template
    // ==========================================
    logger.info('\n[TEST 1] POST /api/templates - Create Template');
    try {
      const response = await axios.post(`${API_URL}/api/templates`, {
        consultant_id: testConsultantId,
        name: 'Test Greeting Template',
        content: 'Merhaba {name}! Ben {consultant_name}, size {product} hakkında bilgi vermek istiyorum.',
        category: 'greeting'
      });

      if (response.status === 201 && response.data.success) {
        testTemplateId = response.data.data.id;
        const variables = response.data.data.variables; // Already parsed by controller

        if (variables.length === 3 && variables.includes('name') && variables.includes('consultant_name') && variables.includes('product')) {
          logger.info(`✅ PASSED: Template created with ID ${testTemplateId}, variables extracted: ${variables.join(', ')}`);
          passedTests++;
        } else {
          throw new Error(`Variables mismatch: ${JSON.stringify(variables)}`);
        }
      } else {
        throw new Error('Failed to create template');
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.response?.data?.message || error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 2: Get All Templates
    // ==========================================
    logger.info('\n[TEST 2] GET /api/templates - Get All Templates');
    try {
      const response = await axios.get(`${API_URL}/api/templates`);

      if (response.status === 200 && response.data.success && Array.isArray(response.data.data)) {
        logger.info(`✅ PASSED: Retrieved ${response.data.data.length} templates`);
        passedTests++;
      } else {
        throw new Error('Failed to get templates');
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 3: Get Template by ID
    // ==========================================
    logger.info('\n[TEST 3] GET /api/templates/:id - Get Template by ID');
    try {
      if (!testTemplateId) throw new Error('No template ID available');

      const response = await axios.get(`${API_URL}/api/templates/${testTemplateId}`);

      if (response.status === 200 && response.data.success && response.data.data.id === testTemplateId) {
        logger.info(`✅ PASSED: Retrieved template ${testTemplateId}`);
        passedTests++;
      } else {
        throw new Error('Failed to get template by ID');
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 4: Update Template
    // ==========================================
    logger.info('\n[TEST 4] PUT /api/templates/:id - Update Template');
    try {
      if (!testTemplateId) throw new Error('No template ID available');

      const response = await axios.put(`${API_URL}/api/templates/${testTemplateId}`, {
        name: 'Updated Greeting Template',
        category: 'greeting_updated'
      });

      if (response.status === 200 && response.data.success && response.data.data.name === 'Updated Greeting Template') {
        logger.info(`✅ PASSED: Template updated successfully`);
        passedTests++;
      } else {
        throw new Error('Failed to update template');
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 5: Preview Template
    // ==========================================
    logger.info('\n[TEST 5] POST /api/templates/:id/preview - Preview Template');
    try {
      if (!testTemplateId) throw new Error('No template ID available');

      const response = await axios.post(`${API_URL}/api/templates/${testTemplateId}/preview`, {
        variables: {
          name: 'Ahmet',
          consultant_name: 'Ayşe',
          product: 'Yatırım Fonu'
        }
      });

      if (response.status === 200 && response.data.success) {
        const preview = response.data.data.preview;
        if (preview.includes('Ahmet') && preview.includes('Ayşe') && preview.includes('Yatırım Fonu')) {
          logger.info(`✅ PASSED: Preview generated: "${preview}"`);
          passedTests++;
        } else {
          throw new Error(`Preview doesn't contain expected values: ${preview}`);
        }
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 6: Render Template
    // ==========================================
    logger.info('\n[TEST 6] POST /api/templates/:id/render - Render Template');
    try {
      if (!testTemplateId) throw new Error('No template ID available');

      const response = await axios.post(`${API_URL}/api/templates/${testTemplateId}/render`, {
        variables: {
          name: 'Mehmet',
          consultant_name: 'Fatma',
          product: 'Emeklilik Sigortası'
        }
      });

      if (response.status === 200 && response.data.success) {
        const rendered = response.data.data.rendered;
        if (rendered.includes('Mehmet') && rendered.includes('Fatma') && rendered.includes('Emeklilik Sigortası')) {
          logger.info(`✅ PASSED: Template rendered: "${rendered}"`);
          passedTests++;
        } else {
          throw new Error(`Rendered doesn't contain expected values`);
        }
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 7: Filter by Category
    // ==========================================
    logger.info('\n[TEST 7] GET /api/templates?category=greeting_updated - Filter by Category');
    try {
      const response = await axios.get(`${API_URL}/api/templates?category=greeting_updated`);

      if (response.status === 200 && response.data.success) {
        logger.info(`✅ PASSED: Filtered templates by category (found ${response.data.data.length})`);
        passedTests++;
      } else {
        throw new Error('Failed to filter templates');
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 8: Validation - Invalid Content
    // ==========================================
    logger.info('\n[TEST 8] Validation - Invalid Template Content (unclosed placeholder)');
    try {
      const response = await axios.post(`${API_URL}/api/templates`, {
        consultant_id: testConsultantId,
        name: 'Invalid Template',
        content: 'Hello {name, this is invalid',
        category: 'test'
      });

      logger.error(`❌ FAILED: Should have rejected invalid content`);
      failedTests++;
    } catch (error) {
      if (error.response && error.response.status === 400) {
        logger.info(`✅ PASSED: Correctly rejected invalid template content`);
        passedTests++;
      } else {
        logger.error(`❌ FAILED: ${error.message}`);
        failedTests++;
      }
    }

    // ==========================================
    // TEST 9: Render Missing Variables
    // ==========================================
    logger.info('\n[TEST 9] Validation - Render with Missing Variables');
    try {
      if (!testTemplateId) throw new Error('No template ID available');

      const response = await axios.post(`${API_URL}/api/templates/${testTemplateId}/render`, {
        variables: {
          name: 'Test'
          // Missing consultant_name and product
        }
      });

      logger.error(`❌ FAILED: Should have rejected missing variables`);
      failedTests++;
    } catch (error) {
      if (error.response && error.response.status === 500) {
        logger.info(`✅ PASSED: Correctly rejected missing variables`);
        passedTests++;
      } else {
        logger.error(`❌ FAILED: ${error.message}`);
        failedTests++;
      }
    }

    // ==========================================
    // TEST 10: Delete Template
    // ==========================================
    logger.info('\n[TEST 10] DELETE /api/templates/:id - Delete Template');
    try {
      if (!testTemplateId) throw new Error('No template ID available');

      const response = await axios.delete(`${API_URL}/api/templates/${testTemplateId}`);

      if (response.status === 200 && response.data.success) {
        logger.info(`✅ PASSED: Template deleted successfully`);
        passedTests++;
      } else {
        throw new Error('Failed to delete template');
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.message}`);
      failedTests++;
    }

    // ==========================================
    // CLEANUP: Delete Test Consultant
    // ==========================================
    logger.info('\n[CLEANUP] Deleting test consultant');
    try {
      if (testConsultantId) {
        await axios.delete(`${API_URL}/api/consultants/${testConsultantId}`);
        logger.info(`✅ Deleted test consultant ${testConsultantId}`);
      }
    } catch (error) {
      logger.warn(`⚠️  Could not delete consultant: ${error.message}`);
    }

    // ==========================================
    // TEST SUMMARY
    // ==========================================
    logger.info('\n' + '='.repeat(70));
    logger.info('📊 TEMPLATES API TEST SUMMARY');
    logger.info('='.repeat(70));
    logger.info(`✅ Passed: ${passedTests}`);
    logger.info(`❌ Failed: ${failedTests}`);
    logger.info(`📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(2)}%`);
    logger.info('='.repeat(70));

    if (failedTests === 0) {
      logger.info('🎉 ALL TEMPLATES TESTS PASSED!');
    } else {
      logger.warn(`⚠️  ${failedTests} test(s) failed`);
    }

    process.exit(failedTests === 0 ? 0 : 1);

  } catch (error) {
    logger.error(`\n❌ CRITICAL ERROR: ${error.message}`);
    process.exit(1);
  }
}

// Run tests
runTemplatesTests();

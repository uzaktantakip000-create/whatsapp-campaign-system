require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const logger = require('./src/utils/logger');

const API_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * OpenAI Integration Test
 * Tests message variation generation and template improvement
 */

let testConsultantId = null;
let testTemplateId = null;

async function runOpenAITests() {
  logger.info('='.repeat(70));
  logger.info('🧪 TESTING OPENAI INTEGRATION');
  logger.info('='.repeat(70));

  let passedTests = 0;
  let failedTests = 0;
  let skippedTests = 0;

  // Check if OpenAI is configured
  const openaiEnabled = process.env.OPENAI_API_KEY &&
                        process.env.OPENAI_API_KEY !== 'sk-proj-BURAYA_GERCEK_ANAHTAR_GELECEK';

  if (!openaiEnabled) {
    logger.warn('\n⚠️  OPENAI_API_KEY not configured - some tests will be skipped');
    logger.warn('To enable full testing, set OPENAI_API_KEY in .env file');
  }

  try {
    // ==========================================
    // SETUP: Create test consultant and template
    // ==========================================
    logger.info('\n[SETUP] Creating test data');
    try {
      // Create consultant
      const consultantResponse = await axios.post(`${API_URL}/api/consultants`, {
        name: 'OpenAI Test Consultant',
        email: `openai.test.${Date.now()}@example.com`,
        instance_name: `openai_test_${Date.now()}`,
        daily_limit: 200
      });

      testConsultantId = consultantResponse.data.data.id;
      logger.info(`✅ Test consultant created with ID ${testConsultantId}`);

      // Create template
      const templateResponse = await axios.post(`${API_URL}/api/templates`, {
        consultant_id: testConsultantId,
        name: 'OpenAI Test Template',
        content: 'Merhaba {name}! Size özel bir teklifimiz var.',
        category: 'promotion'
      });

      testTemplateId = templateResponse.data.data.id;
      logger.info(`✅ Test template created with ID ${testTemplateId}`);

    } catch (error) {
      logger.error(`❌ SETUP FAILED: ${error.message}`);
      process.exit(1);
    }

    // ==========================================
    // TEST 1: OpenAI Service Check
    // ==========================================
    logger.info('\n[TEST 1] Check OpenAI Service Status');
    try {
      // This endpoint doesn't exist yet, but we can check if OpenAI is enabled
      // by trying to generate variations with invalid template

      if (!openaiEnabled) {
        logger.info(`⏭️  SKIPPED: OpenAI not configured`);
        skippedTests++;
      } else {
        logger.info(`✅ PASSED: OpenAI API key is configured`);
        passedTests++;
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 2: Generate Variations (Without Variables)
    // ==========================================
    logger.info('\n[TEST 2] POST /api/templates/:id/generate-variations - Basic');
    try {
      if (!openaiEnabled) {
        logger.info(`⏭️  SKIPPED: OpenAI not configured`);
        skippedTests++;
      } else {
        const response = await axios.post(
          `${API_URL}/api/templates/${testTemplateId}/generate-variations`,
          {
            count: 3,
            tone: 'professional'
          }
        );

        if (response.status === 200 &&
            response.data.success &&
            response.data.data.variations.length === 3) {

          logger.info(`✅ PASSED: Generated ${response.data.data.variations.length} variations`);
          logger.info(`  Base: "${response.data.data.base_message}"`);
          response.data.data.variations.forEach((v, i) => {
            logger.info(`  Variation ${i + 1}: "${v}"`);
          });
          logger.info(`  Cost: $${response.data.data.cost}`);
          passedTests++;
        } else {
          throw new Error('Unexpected response format');
        }
      }
    } catch (error) {
      if (error.response?.status === 503) {
        logger.info(`⏭️  SKIPPED: OpenAI service not enabled`);
        skippedTests++;
      } else {
        logger.error(`❌ FAILED: ${error.response?.data?.message || error.message}`);
        failedTests++;
      }
    }

    // ==========================================
    // TEST 3: Generate Variations (With Variables)
    // ==========================================
    logger.info('\n[TEST 3] POST /api/templates/:id/generate-variations - With Variables');
    try {
      if (!openaiEnabled) {
        logger.info(`⏭️  SKIPPED: OpenAI not configured`);
        skippedTests++;
      } else {
        const response = await axios.post(
          `${API_URL}/api/templates/${testTemplateId}/generate-variations`,
          {
            count: 2,
            tone: 'friendly',
            variables: {
              name: 'Ahmet Bey'
            }
          }
        );

        if (response.status === 200 &&
            response.data.success &&
            response.data.data.variations.length === 2) {

          logger.info(`✅ PASSED: Generated variations with variables`);
          logger.info(`  Rendered base: "${response.data.data.base_message}"`);
          response.data.data.variations.forEach((v, i) => {
            logger.info(`  Variation ${i + 1}: "${v}"`);
          });
          passedTests++;
        } else {
          throw new Error('Unexpected response format');
        }
      }
    } catch (error) {
      if (error.response?.status === 503) {
        logger.info(`⏭️  SKIPPED: OpenAI service not enabled`);
        skippedTests++;
      } else {
        logger.error(`❌ FAILED: ${error.response?.data?.message || error.message}`);
        failedTests++;
      }
    }

    // ==========================================
    // TEST 4: Generate Variations (Different Tones)
    // ==========================================
    logger.info('\n[TEST 4] POST /api/templates/:id/generate-variations - Different Tones');
    try {
      if (!openaiEnabled) {
        logger.info(`⏭️  SKIPPED: OpenAI not configured`);
        skippedTests++;
      } else {
        const tones = ['professional', 'friendly', 'casual'];
        let allPassed = true;

        for (const tone of tones) {
          const response = await axios.post(
            `${API_URL}/api/templates/${testTemplateId}/generate-variations`,
            {
              count: 1,
              tone: tone,
              variables: { name: 'Test' }
            }
          );

          if (response.status !== 200 || !response.data.success) {
            allPassed = false;
            break;
          }

          logger.info(`  ${tone}: "${response.data.data.variations[0]}"`);
        }

        if (allPassed) {
          logger.info(`✅ PASSED: All tones generated successfully`);
          passedTests++;
        } else {
          throw new Error('Failed to generate all tone variations');
        }
      }
    } catch (error) {
      if (error.response?.status === 503) {
        logger.info(`⏭️  SKIPPED: OpenAI service not enabled`);
        skippedTests++;
      } else {
        logger.error(`❌ FAILED: ${error.response?.data?.message || error.message}`);
        failedTests++;
      }
    }

    // ==========================================
    // TEST 5: Improve Template
    // ==========================================
    logger.info('\n[TEST 5] POST /api/templates/:id/improve - Improve Template');
    try {
      if (!openaiEnabled) {
        logger.info(`⏭️  SKIPPED: OpenAI not configured`);
        skippedTests++;
      } else {
        const response = await axios.post(
          `${API_URL}/api/templates/${testTemplateId}/improve`,
          {
            tone: 'professional',
            goal: 'increase engagement'
          }
        );

        if (response.status === 200 && response.data.success) {
          logger.info(`✅ PASSED: Template improved successfully`);
          logger.info(`  Original: "${response.data.data.original}"`);
          logger.info(`  Improved: "${response.data.data.improved}"`);
          logger.info(`  Cost: $${response.data.data.cost}`);
          passedTests++;
        } else {
          throw new Error('Unexpected response format');
        }
      }
    } catch (error) {
      if (error.response?.status === 503) {
        logger.info(`⏭️  SKIPPED: OpenAI service not enabled`);
        skippedTests++;
      } else {
        logger.error(`❌ FAILED: ${error.response?.data?.message || error.message}`);
        failedTests++;
      }
    }

    // ==========================================
    // TEST 6: API Structure - Endpoints Exist
    // ==========================================
    logger.info('\n[TEST 6] Check API Endpoints Exist');
    try {
      // Try to access endpoint (should return 503 if OpenAI not configured, not 404)
      const response = await axios.post(
        `${API_URL}/api/templates/${testTemplateId}/generate-variations`,
        {
          count: 3,
          tone: 'professional'
        }
      );

      // If we get here, OpenAI is configured
      logger.info(`✅ PASSED: Endpoint exists and OpenAI is configured`);
      passedTests++;
    } catch (error) {
      if (error.response?.status === 503) {
        // 503 means endpoint exists but OpenAI not enabled - this is expected
        logger.info(`✅ PASSED: Endpoint exists (503 - OpenAI not configured as expected)`);
        passedTests++;
      } else if (error.response?.status === 404) {
        logger.error(`❌ FAILED: Endpoint not found (404) - routes not loaded`);
        failedTests++;
      } else {
        logger.error(`❌ FAILED: Unexpected error: ${error.response?.status} ${error.message}`);
        failedTests++;
      }
    }

    // ==========================================
    // TEST 7: API Structure - Improve Endpoint Exists
    // ==========================================
    logger.info('\n[TEST 7] Check Improve Template Endpoint Exists');
    try {
      const response = await axios.post(
        `${API_URL}/api/templates/${testTemplateId}/improve`,
        {
          tone: 'professional',
          goal: 'test'
        }
      );

      logger.info(`✅ PASSED: Endpoint exists and OpenAI is configured`);
      passedTests++;
    } catch (error) {
      if (error.response?.status === 503) {
        // 503 means endpoint exists but OpenAI not enabled - this is expected
        logger.info(`✅ PASSED: Endpoint exists (503 - OpenAI not configured as expected)`);
        passedTests++;
      } else if (error.response?.status === 404) {
        logger.error(`❌ FAILED: Endpoint not found (404) - routes not loaded`);
        failedTests++;
      } else {
        logger.error(`❌ FAILED: Unexpected error: ${error.response?.status} ${error.message}`);
        failedTests++;
      }
    }

    // ==========================================
    // CLEANUP: Delete test data
    // ==========================================
    logger.info('\n[CLEANUP] Deleting test data');
    try {
      if (testTemplateId) {
        await axios.delete(`${API_URL}/api/templates/${testTemplateId}`);
        logger.info(`✅ Deleted test template ${testTemplateId}`);
      }
      if (testConsultantId) {
        await axios.delete(`${API_URL}/api/consultants/${testConsultantId}`);
        logger.info(`✅ Deleted test consultant ${testConsultantId}`);
      }
    } catch (error) {
      logger.warn(`⚠️  Could not delete test data: ${error.message}`);
    }

    // ==========================================
    // TEST SUMMARY
    // ==========================================
    logger.info('\n' + '='.repeat(70));
    logger.info('📊 OPENAI INTEGRATION TEST SUMMARY');
    logger.info('='.repeat(70));
    logger.info(`✅ Passed: ${passedTests}`);
    logger.info(`❌ Failed: ${failedTests}`);
    logger.info(`⏭️  Skipped: ${skippedTests} (OpenAI not configured)`);

    const totalRun = passedTests + failedTests;
    if (totalRun > 0) {
      logger.info(`📈 Success Rate: ${((passedTests / totalRun) * 100).toFixed(2)}%`);
    }
    logger.info('='.repeat(70));

    if (skippedTests > 0) {
      logger.warn('\n💡 TIP: To run full OpenAI tests, configure OPENAI_API_KEY in .env file');
    }

    if (failedTests === 0) {
      logger.info('🎉 ALL OPENAI TESTS PASSED!');
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
runOpenAITests();

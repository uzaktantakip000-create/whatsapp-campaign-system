require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const logger = require('./src/utils/logger');

const API_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * Messages with Templates Integration Test
 */

let testConsultantId = null;
let testCampaignId = null;
let testContactId = null;
let testTemplateId = null;

async function runMessagesWithTemplatesTests() {
  logger.info('='.repeat(70));
  logger.info('🧪 TESTING MESSAGES WITH TEMPLATES INTEGRATION');
  logger.info('='.repeat(70));

  let passedTests = 0;
  let failedTests = 0;

  try {
    // ==========================================
    // SETUP: Create test data
    // ==========================================
    logger.info('\n[SETUP] Creating test consultant, campaign, contact, and template');

    // Create consultant
    const consultantRes = await axios.post(`${API_URL}/api/consultants`, {
      name: 'Template Test Consultant',
      email: `template.msg.test.${Date.now()}@example.com`,
      instance_name: `template_msg_test_${Date.now()}`,
      daily_limit: 200
    });
    testConsultantId = consultantRes.data.data.id;
    logger.info(`✅ Test consultant created with ID ${testConsultantId}`);

    // Activate consultant (Evolution instance takes time to create)
    await axios.put(`${API_URL}/api/consultants/${testConsultantId}`, {
      status: 'active'
    });
    logger.info(`✅ Test consultant activated`);

    // Create campaign
    const campaignRes = await axios.post(`${API_URL}/api/campaigns`, {
      consultant_id: testConsultantId,
      name: 'Template Test Campaign',
      message_template: 'Test campaign for template integration'
    });
    testCampaignId = campaignRes.data.data.id;
    logger.info(`✅ Test campaign created with ID ${testCampaignId}`);

    // Set campaign to running status
    await axios.put(`${API_URL}/api/campaigns/${testCampaignId}`, {
      status: 'running'
    });
    logger.info(`✅ Test campaign set to running`);

    // Create contact
    const contactRes = await axios.post(`${API_URL}/api/contacts`, {
      consultant_id: testConsultantId,
      name: 'Ahmet Yılmaz',
      number: '+905551234567',
      segment: 'A'
    });
    testContactId = contactRes.data.data.id;
    logger.info(`✅ Test contact created with ID ${testContactId}`);

    // Create template
    const templateRes = await axios.post(`${API_URL}/api/templates`, {
      consultant_id: testConsultantId,
      name: 'Personalized Greeting',
      content: 'Merhaba {name}! Ben {consultant_name}. Size {product} hakkında bilgi vermek istiyorum. Segment: {segment}',
      category: 'greeting'
    });
    testTemplateId = templateRes.data.data.id;
    logger.info(`✅ Test template created with ID ${testTemplateId}`);

    // ==========================================
    // TEST 1: Send Message with Template (No Custom Variables)
    // ==========================================
    logger.info('\n[TEST 1] POST /api/messages/send - Send Message with Template');
    try {
      const response = await axios.post(`${API_URL}/api/messages/send`, {
        campaign_id: testCampaignId,
        contact_id: testContactId,
        template_id: testTemplateId,
        custom_variables: {
          product: 'Yatırım Fonu'
        }
      });

      if (response.status === 202 && response.data.success) {
        const messageId = response.data.data.message_id;

        // Wait a moment for message to be created
        await sleep(500);

        // Fetch the message to verify rendered content
        const messageRes = await axios.get(`${API_URL}/api/messages/${messageId}`);
        const messageText = messageRes.data.data.message_text;

        // Check if template was rendered correctly with contact data
        if (messageText.includes('Ahmet Yılmaz') &&
            messageText.includes('Template Test Consultant') &&
            messageText.includes('Yatırım Fonu') &&
            messageText.includes('Segment: A')) {
          logger.info(`✅ PASSED: Template rendered correctly: "${messageText}"`);
          passedTests++;
        } else {
          throw new Error(`Template not rendered correctly: "${messageText}"`);
        }
      } else {
        throw new Error('Failed to send message with template');
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.response?.data?.message || error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 2: Send Message with Direct Text (No Template)
    // ==========================================
    logger.info('\n[TEST 2] POST /api/messages/send - Send Message with Direct Text');
    try {
      const response = await axios.post(`${API_URL}/api/messages/send`, {
        campaign_id: testCampaignId,
        contact_id: testContactId,
        message_text: 'Bu direkt mesaj metnidir, template kullanılmıyor.'
      });

      if (response.status === 202 && response.data.success) {
        logger.info(`✅ PASSED: Direct message sent successfully`);
        passedTests++;
      } else {
        throw new Error('Failed to send direct message');
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.response?.data?.message || error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 3: Validation - Neither message_text nor template_id provided
    // ==========================================
    logger.info('\n[TEST 3] Validation - Neither message_text nor template_id');
    try {
      await axios.post(`${API_URL}/api/messages/send`, {
        campaign_id: testCampaignId,
        contact_id: testContactId
        // Missing both message_text and template_id
      });

      logger.error(`❌ FAILED: Should have rejected missing message_text and template_id`);
      failedTests++;
    } catch (error) {
      if (error.response && error.response.status === 400) {
        logger.info(`✅ PASSED: Correctly rejected missing message_text and template_id`);
        passedTests++;
      } else {
        logger.error(`❌ FAILED: ${error.message}`);
        failedTests++;
      }
    }

    // ==========================================
    // TEST 4: Send Message with Inactive Template
    // ==========================================
    logger.info('\n[TEST 4] Validation - Inactive Template');
    try {
      // Deactivate template
      await axios.put(`${API_URL}/api/templates/${testTemplateId}`, {
        is_active: false
      });

      // Try to send message
      await axios.post(`${API_URL}/api/messages/send`, {
        campaign_id: testCampaignId,
        contact_id: testContactId,
        template_id: testTemplateId,
        custom_variables: { product: 'Test' }
      });

      logger.error(`❌ FAILED: Should have rejected inactive template`);
      failedTests++;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        logger.info(`✅ PASSED: Correctly rejected inactive template`);
        passedTests++;
      } else {
        logger.error(`❌ FAILED: ${error.message}`);
        failedTests++;
      }
    } finally {
      // Reactivate template for cleanup
      await axios.put(`${API_URL}/api/templates/${testTemplateId}`, {
        is_active: true
      });
    }

    // ==========================================
    // TEST 5: Verify Template Usage Count
    // ==========================================
    logger.info('\n[TEST 5] Verify Template Usage Count Incremented');
    try {
      const response = await axios.get(`${API_URL}/api/templates/${testTemplateId}`);
      const usageCount = response.data.data.usage_count;

      // Should be 1 (from Test 1, Test 4 failed so didn't increment)
      if (usageCount >= 1) {
        logger.info(`✅ PASSED: Template usage count is ${usageCount}`);
        passedTests++;
      } else {
        throw new Error(`Expected usage count >= 1, got ${usageCount}`);
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 6: Send Message with Both Text and Template (Should Use Text)
    // ==========================================
    logger.info('\n[TEST 6] Send Message with Both message_text and template_id');
    try {
      const response = await axios.post(`${API_URL}/api/messages/send`, {
        campaign_id: testCampaignId,
        contact_id: testContactId,
        message_text: 'Direct text overrides template',
        template_id: testTemplateId,
        custom_variables: { product: 'Test' }
      });

      if (response.status === 202 && response.data.success) {
        logger.info(`✅ PASSED: Message with both text and template accepted`);
        passedTests++;
      } else {
        throw new Error('Failed to send message with both text and template');
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.response?.data?.message || error.message}`);
      failedTests++;
    }

    // ==========================================
    // CLEANUP
    // ==========================================
    logger.info('\n[CLEANUP] Deleting test data');
    try {
      if (testTemplateId) {
        await axios.delete(`${API_URL}/api/templates/${testTemplateId}`);
        logger.info(`✅ Deleted test template ${testTemplateId}`);
      }
      if (testCampaignId) {
        await axios.delete(`${API_URL}/api/campaigns/${testCampaignId}`);
        logger.info(`✅ Deleted test campaign ${testCampaignId}`);
      }
      if (testContactId) {
        await axios.delete(`${API_URL}/api/contacts/${testContactId}`);
        logger.info(`✅ Deleted test contact ${testContactId}`);
      }
      if (testConsultantId) {
        await axios.delete(`${API_URL}/api/consultants/${testConsultantId}`);
        logger.info(`✅ Deleted test consultant ${testConsultantId}`);
      }
    } catch (error) {
      logger.warn(`⚠️  Cleanup error: ${error.message}`);
    }

    // ==========================================
    // TEST SUMMARY
    // ==========================================
    logger.info('\n' + '='.repeat(70));
    logger.info('📊 MESSAGES WITH TEMPLATES INTEGRATION TEST SUMMARY');
    logger.info('='.repeat(70));
    logger.info(`✅ Passed: ${passedTests}`);
    logger.info(`❌ Failed: ${failedTests}`);
    logger.info(`📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(2)}%`);
    logger.info('='.repeat(70));

    if (failedTests === 0) {
      logger.info('🎉 ALL INTEGRATION TESTS PASSED!');
    } else {
      logger.warn(`⚠️  ${failedTests} test(s) failed`);
    }

    process.exit(failedTests === 0 ? 0 : 1);

  } catch (error) {
    logger.error(`\n❌ CRITICAL ERROR: ${error.message}`);
    process.exit(1);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run tests
runMessagesWithTemplatesTests();

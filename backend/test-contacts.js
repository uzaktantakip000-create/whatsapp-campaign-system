require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const logger = require('./src/utils/logger');

const API_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * Contacts API Integration Test
 */

let testConsultantId = null;
let testContactId = null;

async function runContactsTests() {
  logger.info('='.repeat(70));
  logger.info('🧪 TESTING CONTACTS API ENDPOINTS');
  logger.info('='.repeat(70));

  let passedTests = 0;
  let failedTests = 0;

  try {
    // ==========================================
    // SETUP: Create a test consultant
    // ==========================================
    logger.info('\n[SETUP] Creating test consultant');
    try {
      const response = await axios.post(`${API_URL}/api/consultants`, {
        name: 'Test Consultant for Contacts',
        email: `contacts.test.${Date.now()}@example.com`,
        instance_name: `contacts_test_${Date.now()}`,
        daily_limit: 200
      });

      if (response.status === 201) {
        testConsultantId = response.data.data.id;
        logger.info(`✅ Test consultant created with ID ${testConsultantId}`);
        // Set to active so we can create contacts
        await axios.put(`${API_URL}/api/consultants/${testConsultantId}`, {
          status: 'active'
        });
        logger.info(`✅ Consultant set to active`);
      }
    } catch (error) {
      logger.error(`❌ SETUP FAILED: ${error.message}`);
      process.exit(1);
    }

    // ==========================================
    // TEST 1: Create Contact
    // ==========================================
    logger.info('\n[TEST 1] POST /api/contacts - Create Contact');
    try {
      const response = await axios.post(`${API_URL}/api/contacts`, {
        consultant_id: testConsultantId,
        name: 'Test Kişi',
        number: '905551234567',
        segment: 'A'
      });

      if (response.status === 201 && response.data.success) {
        testContactId = response.data.data.id;
        logger.info(`✅ PASSED: Contact created with ID ${testContactId}`);
        passedTests++;
      } else {
        throw new Error('Failed to create contact');
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.response?.data?.message || error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 2: Get All Contacts
    // ==========================================
    logger.info('\n[TEST 2] GET /api/contacts - Get All Contacts');
    try {
      const response = await axios.get(`${API_URL}/api/contacts`);

      if (response.status === 200 && response.data.success && Array.isArray(response.data.data)) {
        logger.info(`✅ PASSED: Retrieved ${response.data.data.length} contacts`);
        passedTests++;
      } else {
        throw new Error('Failed to get contacts');
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 3: Get Contact by ID
    // ==========================================
    logger.info('\n[TEST 3] GET /api/contacts/:id - Get Contact by ID');
    try {
      if (!testContactId) throw new Error('No contact ID available');

      const response = await axios.get(`${API_URL}/api/contacts/${testContactId}`);

      if (response.status === 200 && response.data.success && response.data.data.id === testContactId) {
        logger.info(`✅ PASSED: Retrieved contact ${testContactId} with stats`);
        passedTests++;
      } else {
        throw new Error('Failed to get contact by ID');
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 4: Update Contact
    // ==========================================
    logger.info('\n[TEST 4] PUT /api/contacts/:id - Update Contact');
    try {
      if (!testContactId) throw new Error('No contact ID available');

      const response = await axios.put(`${API_URL}/api/contacts/${testContactId}`, {
        name: 'Test Kişi Updated',
        segment: 'B'
      });

      if (response.status === 200 && response.data.success && response.data.data.name === 'Test Kişi Updated') {
        logger.info(`✅ PASSED: Contact updated successfully`);
        passedTests++;
      } else {
        throw new Error('Failed to update contact');
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 5: Get Contacts by Consultant
    // ==========================================
    logger.info('\n[TEST 5] GET /api/consultants/:id/contacts - Get Contacts by Consultant');
    try {
      if (!testConsultantId) throw new Error('No consultant ID available');

      const response = await axios.get(`${API_URL}/api/consultants/${testConsultantId}/contacts`);

      if (response.status === 200 && response.data.success && Array.isArray(response.data.data)) {
        logger.info(`✅ PASSED: Retrieved ${response.data.data.length} contacts for consultant`);
        passedTests++;
      } else {
        throw new Error('Failed to get consultant contacts');
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 6: Filter Contacts by Segment
    // ==========================================
    logger.info('\n[TEST 6] GET /api/contacts?segment=B - Filter by Segment');
    try {
      const response = await axios.get(`${API_URL}/api/contacts?segment=B`);

      if (response.status === 200 && response.data.success) {
        logger.info(`✅ PASSED: Filtered contacts by segment B (found ${response.data.data.length})`);
        passedTests++;
      } else {
        throw new Error('Failed to filter contacts');
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 7: Search Contacts
    // ==========================================
    logger.info('\n[TEST 7] GET /api/contacts?search=Test - Search Contacts');
    try {
      const response = await axios.get(`${API_URL}/api/contacts?search=Test`);

      if (response.status === 200 && response.data.success) {
        logger.info(`✅ PASSED: Search found ${response.data.data.length} contacts`);
        passedTests++;
      } else {
        throw new Error('Failed to search contacts');
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 8: Validation - Duplicate Contact
    // ==========================================
    logger.info('\n[TEST 8] Validation - Create Duplicate Contact');
    try {
      const response = await axios.post(`${API_URL}/api/contacts`, {
        consultant_id: testConsultantId,
        name: 'Duplicate Test',
        number: '905551234567', // Same number as TEST 1
        segment: 'A'
      });

      logger.error(`❌ FAILED: Should have rejected duplicate contact`);
      failedTests++;
    } catch (error) {
      if (error.response && error.response.status === 400) {
        logger.info(`✅ PASSED: Correctly rejected duplicate contact`);
        passedTests++;
      } else {
        logger.error(`❌ FAILED: ${error.message}`);
        failedTests++;
      }
    }

    // ==========================================
    // TEST 9: Validation - Invalid Phone Number
    // ==========================================
    logger.info('\n[TEST 9] Validation - Invalid Phone Number');
    try {
      const response = await axios.post(`${API_URL}/api/contacts`, {
        consultant_id: testConsultantId,
        name: 'Invalid Phone',
        number: 'invalid-number',
        segment: 'A'
      });

      logger.error(`❌ FAILED: Should have rejected invalid phone`);
      failedTests++;
    } catch (error) {
      if (error.response && error.response.status === 400) {
        logger.info(`✅ PASSED: Correctly rejected invalid phone number`);
        passedTests++;
      } else {
        logger.error(`❌ FAILED: ${error.message}`);
        failedTests++;
      }
    }

    // ==========================================
    // TEST 10: Delete Contact
    // ==========================================
    logger.info('\n[TEST 10] DELETE /api/contacts/:id - Delete Contact');
    try {
      if (!testContactId) throw new Error('No contact ID available');

      const response = await axios.delete(`${API_URL}/api/contacts/${testContactId}`);

      if (response.status === 200 && response.data.success) {
        logger.info(`✅ PASSED: Contact deleted successfully`);
        passedTests++;
      } else {
        throw new Error('Failed to delete contact');
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
    logger.info('📊 CONTACTS API TEST SUMMARY');
    logger.info('='.repeat(70));
    logger.info(`✅ Passed: ${passedTests}`);
    logger.info(`❌ Failed: ${failedTests}`);
    logger.info(`📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(2)}%`);
    logger.info('='.repeat(70));

    if (failedTests === 0) {
      logger.info('🎉 ALL CONTACTS TESTS PASSED!');
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
runContactsTests();

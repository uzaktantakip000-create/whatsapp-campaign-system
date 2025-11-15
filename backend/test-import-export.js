require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const logger = require('./src/utils/logger');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * Contact Import/Export Integration Test
 */

let testConsultantId = null;

async function runImportExportTests() {
  logger.info('='.repeat(70));
  logger.info('🧪 TESTING CONTACT IMPORT/EXPORT ENDPOINTS');
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
        name: 'Test Consultant for Import/Export',
        email: `import.test.${Date.now()}@example.com`,
        instance_name: `import_test_${Date.now()}`,
        daily_limit: 200
      });

      if (response.status === 201) {
        testConsultantId = response.data.data.id;
        logger.info(`✅ Test consultant created with ID ${testConsultantId}`);

        // Set to active
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
    // TEST 1: Create test CSV file
    // ==========================================
    logger.info('\n[TEST 1] Creating test CSV file');
    try {
      const csvContent = `consultant_id,name,number,segment
${testConsultantId},Test Contact 1,905551234567,A
${testConsultantId},Test Contact 2,905551234568,B
${testConsultantId},Test Contact 3,905551234569,C
${testConsultantId},Test Contact 4,905551234570,A`;

      const testCsvPath = path.join(__dirname, 'test-contacts.csv');
      fs.writeFileSync(testCsvPath, csvContent);

      if (fs.existsSync(testCsvPath)) {
        logger.info(`✅ PASSED: CSV file created at ${testCsvPath}`);
        passedTests++;
      } else {
        throw new Error('Failed to create CSV file');
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 2: Import contacts (valid CSV)
    // ==========================================
    logger.info('\n[TEST 2] POST /api/contacts/import - Import Valid CSV');
    try {
      const testCsvPath = path.join(__dirname, 'test-contacts.csv');
      const formData = new FormData();
      formData.append('file', fs.createReadStream(testCsvPath));

      const response = await axios.post(
        `${API_URL}/api/contacts/import`,
        formData,
        {
          headers: formData.getHeaders()
        }
      );

      if (response.status === 200 && response.data.success) {
        const { imported, duplicates, errors } = response.data.data;
        logger.info(`✅ PASSED: Imported ${imported} contacts, ${duplicates} duplicates, ${errors} errors`);

        if (imported === 4 && duplicates === 0 && errors === 0) {
          logger.info(`✅ All 4 contacts imported successfully`);
          passedTests++;
        } else {
          throw new Error(`Unexpected import results: ${imported}/${duplicates}/${errors}`);
        }
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.response?.data?.message || error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 3: Import duplicate contacts
    // ==========================================
    logger.info('\n[TEST 3] Import Duplicate Contacts - Should Skip');
    try {
      const testCsvPath = path.join(__dirname, 'test-contacts.csv');
      const formData = new FormData();
      formData.append('file', fs.createReadStream(testCsvPath));

      const response = await axios.post(
        `${API_URL}/api/contacts/import`,
        formData,
        {
          headers: formData.getHeaders()
        }
      );

      if (response.status === 200 && response.data.success) {
        const { imported, duplicates, errors } = response.data.data;

        if (imported === 0 && duplicates === 4 && errors === 0) {
          logger.info(`✅ PASSED: All 4 contacts marked as duplicates (imported=0, duplicates=4)`);
          passedTests++;
        } else {
          throw new Error(`Unexpected results: imported=${imported}, duplicates=${duplicates}`);
        }
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 4: Import invalid CSV (missing fields)
    // ==========================================
    logger.info('\n[TEST 4] Import Invalid CSV - Missing Required Fields');
    try {
      const invalidCsvContent = `consultant_id,name
${testConsultantId},Invalid Contact`;

      const invalidCsvPath = path.join(__dirname, 'test-invalid.csv');
      fs.writeFileSync(invalidCsvPath, invalidCsvContent);

      const formData = new FormData();
      formData.append('file', fs.createReadStream(invalidCsvPath));

      const response = await axios.post(
        `${API_URL}/api/contacts/import`,
        formData,
        {
          headers: formData.getHeaders()
        }
      );

      if (response.status === 400 && !response.data.success) {
        logger.info(`✅ PASSED: Invalid CSV correctly rejected`);
        passedTests++;
      } else {
        throw new Error('Should have rejected invalid CSV');
      }

      // Cleanup
      fs.unlinkSync(invalidCsvPath);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        logger.info(`✅ PASSED: Invalid CSV correctly rejected`);
        passedTests++;

        // Cleanup
        const invalidCsvPath = path.join(__dirname, 'test-invalid.csv');
        if (fs.existsSync(invalidCsvPath)) {
          fs.unlinkSync(invalidCsvPath);
        }
      } else {
        logger.error(`❌ FAILED: ${error.message}`);
        failedTests++;
      }
    }

    // ==========================================
    // TEST 5: Import without file
    // ==========================================
    logger.info('\n[TEST 5] Import Without File - Should Fail');
    try {
      const response = await axios.post(`${API_URL}/api/contacts/import`, {});

      logger.error(`❌ FAILED: Should have rejected request without file`);
      failedTests++;
    } catch (error) {
      if (error.response && error.response.status === 400) {
        logger.info(`✅ PASSED: Request without file correctly rejected`);
        passedTests++;
      } else {
        logger.error(`❌ FAILED: ${error.message}`);
        failedTests++;
      }
    }

    // ==========================================
    // TEST 6: Export all contacts
    // ==========================================
    logger.info('\n[TEST 6] GET /api/contacts/export - Export All Contacts');
    try {
      const response = await axios.get(`${API_URL}/api/contacts/export`, {
        responseType: 'text'
      });

      if (response.status === 200 && response.headers['content-type'].includes('text/csv')) {
        const csvData = response.data;
        const lines = csvData.split('\n').filter(line => line.trim());

        // Header + 4 contacts
        if (lines.length >= 5) {
          logger.info(`✅ PASSED: Exported ${lines.length - 1} contacts (CSV format)`);
          logger.info(`   Headers: ${lines[0].substring(0, 60)}...`);
          passedTests++;
        } else {
          throw new Error(`Expected at least 5 lines, got ${lines.length}`);
        }
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 7: Export with filters (segment)
    // ==========================================
    logger.info('\n[TEST 7] Export with Segment Filter (segment=A)');
    try {
      const response = await axios.get(`${API_URL}/api/contacts/export?segment=A`, {
        responseType: 'text'
      });

      if (response.status === 200) {
        const csvData = response.data;
        const lines = csvData.split('\n').filter(line => line.trim());

        // Should have header + 2 contacts with segment A
        if (lines.length >= 2) {
          logger.info(`✅ PASSED: Exported filtered contacts (segment A)`);
          passedTests++;
        } else {
          throw new Error('No contacts exported with filter');
        }
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.message}`);
      failedTests++;
    }

    // ==========================================
    // TEST 8: Export with search filter
    // ==========================================
    logger.info('\n[TEST 8] Export with Search Filter (search=Contact 1)');
    try {
      const response = await axios.get(`${API_URL}/api/contacts/export?search=Contact 1`, {
        responseType: 'text'
      });

      if (response.status === 200) {
        const csvData = response.data;
        const lines = csvData.split('\n').filter(line => line.trim());

        // Should have header + 1 contact matching "Contact 1"
        if (lines.length >= 2) {
          logger.info(`✅ PASSED: Exported contacts matching search`);
          passedTests++;
        } else {
          throw new Error('No contacts exported with search');
        }
      }
    } catch (error) {
      logger.error(`❌ FAILED: ${error.message}`);
      failedTests++;
    }

    // ==========================================
    // CLEANUP
    // ==========================================
    logger.info('\n[CLEANUP] Cleaning up test data');
    try {
      // Delete test consultant (cascade will delete contacts)
      if (testConsultantId) {
        await axios.delete(`${API_URL}/api/consultants/${testConsultantId}`);
        logger.info(`✅ Deleted test consultant ${testConsultantId}`);
      }

      // Delete test CSV file
      const testCsvPath = path.join(__dirname, 'test-contacts.csv');
      if (fs.existsSync(testCsvPath)) {
        fs.unlinkSync(testCsvPath);
        logger.info(`✅ Deleted test CSV file`);
      }
    } catch (error) {
      logger.warn(`⚠️  Cleanup warning: ${error.message}`);
    }

    // ==========================================
    // TEST SUMMARY
    // ==========================================
    logger.info('\n' + '='.repeat(70));
    logger.info('📊 IMPORT/EXPORT TEST SUMMARY');
    logger.info('='.repeat(70));
    logger.info(`✅ Passed: ${passedTests}`);
    logger.info(`❌ Failed: ${failedTests}`);
    logger.info(`📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(2)}%`);
    logger.info('='.repeat(70));

    if (failedTests === 0) {
      logger.info('🎉 ALL IMPORT/EXPORT TESTS PASSED!');
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
runImportExportTests();

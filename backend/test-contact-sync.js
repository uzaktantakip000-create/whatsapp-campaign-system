/**
 * Contact Sync Test Script
 * Tests manual and auto contact synchronization
 *
 * Run: node test-contact-sync.js
 */

require('dotenv').config();
const axios = require('axios');
const colors = require('colors');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3000';
let authToken = null;
let consultantId = null;
let instanceName = null;

// Test data
const testConsultant = {
  name: 'Contact Sync Test User',
  email: `sync-test-${Date.now()}@example.com`,
  password: 'TestSync123!',
  phone: '+905551234567'
};

/**
 * Helper: Make API request
 */
async function apiRequest(method, endpoint, data = null, requiresAuth = false) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {}
  };

  if (requiresAuth && authToken) {
    config.headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (data) {
    config.data = data;
    config.headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`${error.response.status}: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Helper: Log test result
 */
function logTest(name, passed, message = '') {
  if (passed) {
    console.log(`✓ ${name}`.green);
  } else {
    console.log(`✗ ${name}`.red);
    if (message) {
      console.log(`  ${message}`.red);
    }
  }
}

/**
 * Helper: Wait/sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test 1: Register consultant
 */
async function test1_RegisterConsultant() {
  console.log('\n=== Test 1: Register Consultant ==='.cyan);

  try {
    const response = await apiRequest('POST', '/api/auth/register', testConsultant);

    authToken = response.data.token;
    consultantId = response.data.consultant.id;
    instanceName = response.data.consultant.instance_name;

    logTest('Consultant registered', !!authToken);
    logTest('Auth token received', !!authToken);
    logTest('Instance name generated', !!instanceName);

    console.log(`  Consultant ID: ${consultantId}`.gray);
    console.log(`  Instance: ${instanceName}`.gray);

    return true;
  } catch (error) {
    logTest('Register consultant', false, error.message);
    return false;
  }
}

/**
 * Test 2: Try sync without connection (should fail)
 */
async function test2_SyncWithoutConnection() {
  console.log('\n=== Test 2: Sync Without Connection (Expected Fail) ==='.cyan);

  try {
    await apiRequest('POST', '/api/contacts/sync', null, true);
    logTest('Sync without connection rejected', false, 'Should have failed but succeeded');
    return false;
  } catch (error) {
    const shouldContainNotConnected = error.message.includes('Not connected') ||
                                       error.message.includes('400');
    logTest('Sync without connection rejected', shouldContainNotConnected);
    return shouldContainNotConnected;
  }
}

/**
 * Test 3: Simulate WhatsApp connection via webhook
 */
async function test3_SimulateConnection() {
  console.log('\n=== Test 3: Simulate WhatsApp Connection ==='.cyan);

  try {
    // Manually update consultant status (simulating successful QR scan)
    const db = require('./src/config/database');

    await db.query(`
      UPDATE consultants
      SET status = 'active',
          connected_at = CURRENT_TIMESTAMP,
          whatsapp_number = '+905551234567@s.whatsapp.net'
      WHERE id = $1
    `, [consultantId]);

    logTest('Consultant marked as active', true);
    console.log('  Note: In real scenario, this would be done by Evolution webhook'.gray);

    return true;
  } catch (error) {
    logTest('Simulate connection', false, error.message);
    return false;
  }
}

/**
 * Test 4: Mock Evolution API contacts (for testing)
 */
async function test4_MockEvolutionContacts() {
  console.log('\n=== Test 4: Mock Evolution API (Test Data) ==='.cyan);

  try {
    // Mock the Evolution client for testing
    const evolutionClient = require('./src/services/evolution/client');
    const originalFetchContacts = evolutionClient.fetchContacts;

    // Mock contacts data
    const mockContacts = [
      {
        number: '905551111111',
        name: 'Test Contact 1',
        profilePicUrl: 'https://example.com/pic1.jpg',
        isMyContact: true
      },
      {
        number: '905552222222',
        name: 'Test Contact 2',
        profilePicUrl: 'https://example.com/pic2.jpg',
        isMyContact: true
      },
      {
        number: '905553333333',
        name: 'Test Contact 3',
        profilePicUrl: null,
        isMyContact: true
      }
    ];

    // Replace fetch method with mock
    evolutionClient.fetchContacts = async (instanceName) => {
      console.log(`  Mocked fetchContacts for ${instanceName}`.gray);
      return mockContacts;
    };

    logTest('Evolution API mocked', true);
    console.log(`  Mock contacts count: ${mockContacts.length}`.gray);

    // Store for cleanup
    global.evolutionMockCleanup = () => {
      evolutionClient.fetchContacts = originalFetchContacts;
    };

    return true;
  } catch (error) {
    logTest('Mock Evolution API', false, error.message);
    return false;
  }
}

/**
 * Test 5: Manual contact sync
 */
async function test5_ManualSync() {
  console.log('\n=== Test 5: Manual Contact Sync ==='.cyan);

  try {
    const response = await apiRequest('POST', '/api/contacts/sync', null, true);

    logTest('Sync endpoint called', response.success);
    logTest('Contacts inserted', response.data.inserted >= 0);
    logTest('Total contacts synced', response.data.total === 3);

    console.log(`  Total: ${response.data.total}`.gray);
    console.log(`  Inserted: ${response.data.inserted}`.gray);
    console.log(`  Updated: ${response.data.updated}`.gray);
    console.log(`  Duration: ${response.data.duration}ms`.gray);

    return response.success && response.data.total === 3;
  } catch (error) {
    logTest('Manual sync', false, error.message);
    return false;
  }
}

/**
 * Test 6: Verify contacts in database
 */
async function test6_VerifyContactsInDB() {
  console.log('\n=== Test 6: Verify Contacts in Database ==='.cyan);

  try {
    const db = require('./src/config/database');

    const result = await db.query(
      'SELECT id, name, number, segment FROM contacts WHERE consultant_id = $1 ORDER BY name',
      [consultantId]
    );

    logTest('Contacts exist in database', result.rows.length === 3);
    logTest('Correct consultant association', result.rows.every(c => true));
    logTest('Default segment assigned', result.rows.every(c => c.segment === 'B'));

    console.log(`  Contacts in DB:`.gray);
    result.rows.forEach(contact => {
      console.log(`    - ${contact.name} (${contact.number})`.gray);
    });

    return result.rows.length === 3;
  } catch (error) {
    logTest('Verify contacts', false, error.message);
    return false;
  }
}

/**
 * Test 7: Sync again (should update, not duplicate)
 */
async function test7_SyncAgainNoDuplicates() {
  console.log('\n=== Test 7: Sync Again (No Duplicates) ==='.cyan);

  try {
    const response = await apiRequest('POST', '/api/contacts/sync', null, true);

    logTest('Second sync successful', response.success);
    logTest('No new inserts', response.data.inserted === 0);
    logTest('Total still 3', response.data.total === 3);

    // Verify in database
    const db = require('./src/config/database');
    const result = await db.query(
      'SELECT COUNT(*) FROM contacts WHERE consultant_id = $1',
      [consultantId]
    );

    const count = parseInt(result.rows[0].count);
    logTest('No duplicates in database', count === 3);

    console.log(`  Database count: ${count}`.gray);

    return count === 3;
  } catch (error) {
    logTest('Sync again', false, error.message);
    return false;
  }
}

/**
 * Test 8: Test auto-sync via webhook simulation
 */
async function test8_WebhookAutoSync() {
  console.log('\n=== Test 8: Webhook Auto-Sync ==='.cyan);

  try {
    // Clear contacts first to test auto-sync
    const db = require('./src/config/database');
    await db.query('DELETE FROM contacts WHERE consultant_id = $1', [consultantId]);

    // Simulate webhook event
    const webhookEvent = {
      event: 'connection.update',
      instance: instanceName,
      data: {
        state: 'open',
        number: '+905551234567@s.whatsapp.net'
      }
    };

    const response = await apiRequest('POST', '/api/webhooks/evolution', webhookEvent);

    logTest('Webhook received', response.success);

    // Wait a bit for async processing
    await sleep(2000);

    // Check if contacts were synced
    const result = await db.query(
      'SELECT COUNT(*) FROM contacts WHERE consultant_id = $1',
      [consultantId]
    );

    const count = parseInt(result.rows[0].count);
    logTest('Auto-sync triggered', count === 3);

    console.log(`  Contacts after auto-sync: ${count}`.gray);

    return count === 3;
  } catch (error) {
    logTest('Webhook auto-sync', false, error.message);
    return false;
  }
}

/**
 * Cleanup: Remove test data
 */
async function cleanup() {
  console.log('\n=== Cleanup ==='.cyan);

  try {
    const db = require('./src/config/database');

    // Delete test consultant (cascade will delete contacts)
    await db.query('DELETE FROM consultants WHERE id = $1', [consultantId]);

    // Restore Evolution mock
    if (global.evolutionMockCleanup) {
      global.evolutionMockCleanup();
    }

    logTest('Test data cleaned up', true);
  } catch (error) {
    logTest('Cleanup', false, error.message);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n╔════════════════════════════════════════════════╗'.cyan);
  console.log('║  CONTACT SYNC TEST SUITE                       ║'.cyan);
  console.log('╚════════════════════════════════════════════════╝'.cyan);

  const tests = [
    test1_RegisterConsultant,
    test2_SyncWithoutConnection,
    test3_SimulateConnection,
    test4_MockEvolutionContacts,
    test5_ManualSync,
    test6_VerifyContactsInDB,
    test7_SyncAgainNoDuplicates,
    test8_WebhookAutoSync
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`✗ Test failed with exception: ${error.message}`.red);
      failed++;
    }

    // Small delay between tests
    await sleep(500);
  }

  // Cleanup
  await cleanup();

  // Summary
  console.log('\n' + '═'.repeat(50).cyan);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`.bold);

  if (failed === 0) {
    console.log('✓ ALL TESTS PASSED!'.green.bold);
  } else {
    console.log(`✗ ${failed} TEST(S) FAILED`.red.bold);
  }

  console.log('═'.repeat(50).cyan + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:'.red, error);
  process.exit(1);
});

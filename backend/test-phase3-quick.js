/**
 * Quick Phase 3 Test Suite
 * Tests all Phase 3 endpoints
 */

const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:3000';
let authToken = '';
let consultantId = '';

// Test helpers
function logTest(message) {
  console.log('\n' + colors.cyan('▸ ' + message));
}

function logSuccess(message) {
  console.log(colors.green('  ✓ ' + message));
}

function logError(message) {
  console.log(colors.red('  ✗ ' + message));
}

async function test1_Authentication() {
  console.log(colors.bold('\n=== TEST 1: AUTHENTICATION ===\n'));

  try {
    // Register
    logTest('Registering new consultant...');
    const email = `phase3test_${Date.now()}@example.com`;
    const registerRes = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'Phase 3 Test User',
      email: email,
      password: 'Test123456',
      phone: '+905551234567'
    });

    logSuccess(`Registered successfully (ID: ${registerRes.data.data.consultant.id})`);
    consultantId = registerRes.data.data.consultant.id;

    // Login
    logTest('Logging in...');
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: email,
      password: 'Test123456'
    });

    authToken = loginRes.data.data.token;
    logSuccess(`Logged in successfully (Token received)`);

    return true;
  } catch (error) {
    logError(`Authentication failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function test2_Dashboard() {
  console.log(colors.bold('\n=== TEST 2: DASHBOARD API ===\n'));

  try {
    logTest('Fetching dashboard...');
    const res = await axios.get(`${BASE_URL}/api/consultants/dashboard`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    logSuccess(`Dashboard loaded successfully`);
    console.log(colors.gray(`  - Consultant: ${res.data.data.consultant.name}`));
    console.log(colors.gray(`  - Contacts: ${res.data.data.stats.contacts_count}`));
    console.log(colors.gray(`  - Campaigns: ${res.data.data.stats.campaigns_count}`));

    return true;
  } catch (error) {
    logError(`Dashboard failed: ${error.response?.data?.error || error.message}`);
    if (error.response?.data) {
      console.log(colors.gray(JSON.stringify(error.response.data, null, 2)));
    }
    return false;
  }
}

async function runTests() {
  console.log(colors.bold.yellow('\n╔════════════════════════════════════════╗'));
  console.log(colors.bold.yellow('║   PHASE 3 QUICK TEST SUITE            ║'));
  console.log(colors.bold.yellow('╚════════════════════════════════════════╝'));

  const results = {
    passed: 0,
    failed: 0
  };

  // Test 1: Authentication
  if (await test1_Authentication()) results.passed++;
  else results.failed++;

  // Test 2: Dashboard (only if auth passed)
  if (authToken) {
    if (await test2_Dashboard()) results.passed++;
    else results.failed++;
  } else {
    logError('Skipping Dashboard test (no auth token)');
    results.failed++;
  }

  // Results
  console.log(colors.bold('\n╔════════════════════════════════════════╗'));
  console.log(colors.bold('║           TEST RESULTS                ║'));
  console.log(colors.bold('╚════════════════════════════════════════╝'));
  console.log(colors.green(`\n✓ Passed: ${results.passed}`));
  console.log(colors.red(`✗ Failed: ${results.failed}`));
  console.log(colors.bold(`\nTotal: ${results.passed + results.failed} tests\n`));

  process.exit(results.failed > 0 ? 1 : 0);
}

runTests();

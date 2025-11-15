/**
 * Admin API Test Suite
 * Tests all admin endpoints with role-based access control
 */

const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:3000';
let adminToken = '';
let consultantToken = '';
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

async function setupTestUsers() {
  console.log(colors.bold('\n=== SETUP: Creating Test Users ===\n'));

  try {
    // Create regular consultant
    logTest('Creating regular consultant...');
    const consultantEmail = `consultant_${Date.now()}@example.com`;
    const consultantRes = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'Test Consultant',
      email: consultantEmail,
      password: 'Test123456',
      phone: '+905551111111'
    });
    consultantToken = consultantRes.data.data.token;
    consultantId = consultantRes.data.data.consultant.id;
    logSuccess(`Consultant created (ID: ${consultantId})`);

    // Create admin user manually in database
    logTest('Creating admin user...');
    const adminEmail = `admin_${Date.now()}@example.com`;

    // First register as consultant, then update role to admin
    const adminRes = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'Test Admin',
      email: adminEmail,
      password: 'Admin123456',
      phone: '+905552222222'
    });

    const tempAdminId = adminRes.data.data.consultant.id;

    // We need to manually update the role in DB
    // For now, let's just note that we need an admin user
    logSuccess(`Admin user registered (ID: ${tempAdminId})`);
    console.log(colors.yellow('  ⚠ Note: Need to manually set role to "admin" in database'));
    console.log(colors.yellow(`  ⚠ SQL: UPDATE consultants SET role = 'admin' WHERE id = ${tempAdminId};`));

    return { consultantId, consultantToken, adminEmail, adminPassword: 'Admin123456', tempAdminId };
  } catch (error) {
    logError(`Setup failed: ${error.response?.data?.error || error.message}`);
    throw error;
  }
}

async function test1_AdminListConsultants() {
  console.log(colors.bold('\n=== TEST 1: GET /api/admin/consultants ===\n'));

  try {
    // Test 1a: Without token (should fail)
    logTest('Attempting without token...');
    try {
      await axios.get(`${BASE_URL}/api/admin/consultants`);
      logError('Should have rejected request without token');
      return false;
    } catch (error) {
      if (error.response?.status === 401) {
        logSuccess('Correctly rejected (401 Unauthorized)');
      } else {
        logError(`Unexpected error: ${error.response?.status}`);
        return false;
      }
    }

    // Test 1b: With consultant token (should fail - wrong role)
    logTest('Attempting with consultant token (should fail)...');
    try {
      await axios.get(`${BASE_URL}/api/admin/consultants`, {
        headers: { Authorization: `Bearer ${consultantToken}` }
      });
      logError('Should have rejected consultant trying to access admin endpoint');
      return false;
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        logSuccess('Correctly rejected consultant (403/401)');
      } else {
        logError(`Unexpected error: ${error.response?.status}`);
        return false;
      }
    }

    // Test 1c: We cannot test with admin token because we don't have a way to create admin users via API
    logTest('Admin token test skipped (requires manual admin user creation)');
    console.log(colors.yellow('  ℹ Admin endpoints require admin role in database'));

    return true;
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    return false;
  }
}

async function test2_AdminSystemStats() {
  console.log(colors.bold('\n=== TEST 2: GET /api/admin/stats ===\n'));

  try {
    // Test without token
    logTest('Attempting without token...');
    try {
      await axios.get(`${BASE_URL}/api/admin/stats`);
      logError('Should have rejected request without token');
      return false;
    } catch (error) {
      if (error.response?.status === 401) {
        logSuccess('Correctly rejected (401 Unauthorized)');
      } else {
        logError(`Unexpected error: ${error.response?.status}`);
        return false;
      }
    }

    // Test with consultant token (should fail)
    logTest('Attempting with consultant token (should fail)...');
    try {
      await axios.get(`${BASE_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${consultantToken}` }
      });
      logError('Should have rejected consultant');
      return false;
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        logSuccess('Correctly rejected consultant (403/401)');
      } else {
        logError(`Unexpected error: ${error.response?.status}`);
        return false;
      }
    }

    return true;
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    return false;
  }
}

async function test3_AdminUpdateConsultant() {
  console.log(colors.bold('\n=== TEST 3: PUT /api/admin/consultants/:id ===\n'));

  try {
    // Test without token
    logTest('Attempting without token...');
    try {
      await axios.put(`${BASE_URL}/api/admin/consultants/${consultantId}`, {
        daily_limit: 100
      });
      logError('Should have rejected request without token');
      return false;
    } catch (error) {
      if (error.response?.status === 401) {
        logSuccess('Correctly rejected (401 Unauthorized)');
      } else {
        logError(`Unexpected error: ${error.response?.status}`);
        return false;
      }
    }

    // Test with consultant token (should fail)
    logTest('Attempting with consultant token (should fail)...');
    try {
      await axios.put(`${BASE_URL}/api/admin/consultants/${consultantId}`, {
        daily_limit: 100
      }, {
        headers: { Authorization: `Bearer ${consultantToken}` }
      });
      logError('Should have rejected consultant');
      return false;
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        logSuccess('Correctly rejected consultant (403/401)');
      } else {
        logError(`Unexpected error: ${error.response?.status}`);
        return false;
      }
    }

    return true;
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    return false;
  }
}

async function test4_AdminToggleActive() {
  console.log(colors.bold('\n=== TEST 4: POST /api/admin/consultants/:id/toggle-active ===\n'));

  try {
    // Test without token
    logTest('Attempting without token...');
    try {
      await axios.post(`${BASE_URL}/api/admin/consultants/${consultantId}/toggle-active`);
      logError('Should have rejected request without token');
      return false;
    } catch (error) {
      if (error.response?.status === 401) {
        logSuccess('Correctly rejected (401 Unauthorized)');
      } else {
        logError(`Unexpected error: ${error.response?.status}`);
        return false;
      }
    }

    // Test with consultant token (should fail)
    logTest('Attempting with consultant token (should fail)...');
    try {
      await axios.post(`${BASE_URL}/api/admin/consultants/${consultantId}/toggle-active`, {}, {
        headers: { Authorization: `Bearer ${consultantToken}` }
      });
      logError('Should have rejected consultant');
      return false;
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        logSuccess('Correctly rejected consultant (403/401)');
      } else {
        logError(`Unexpected error: ${error.response?.status}`);
        return false;
      }
    }

    return true;
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log(colors.bold.yellow('\n╔════════════════════════════════════════╗'));
  console.log(colors.bold.yellow('║      ADMIN API TEST SUITE             ║'));
  console.log(colors.bold.yellow('╚════════════════════════════════════════╝'));

  const results = {
    passed: 0,
    failed: 0
  };

  // Setup
  try {
    await setupTestUsers();
  } catch (error) {
    console.log(colors.red('\n✗ Setup failed, cannot continue'));
    process.exit(1);
  }

  // Test 1: List consultants
  if (await test1_AdminListConsultants()) results.passed++;
  else results.failed++;

  // Test 2: System stats
  if (await test2_AdminSystemStats()) results.passed++;
  else results.failed++;

  // Test 3: Update consultant
  if (await test3_AdminUpdateConsultant()) results.passed++;
  else results.failed++;

  // Test 4: Toggle active
  if (await test4_AdminToggleActive()) results.passed++;
  else results.failed++;

  // Results
  console.log(colors.bold('\n╔════════════════════════════════════════╗'));
  console.log(colors.bold('║           TEST RESULTS                ║'));
  console.log(colors.bold('╚════════════════════════════════════════╝'));
  console.log(colors.green(`\n✓ Passed: ${results.passed}`));
  console.log(colors.red(`✗ Failed: ${results.failed}`));
  console.log(colors.bold(`\nTotal: ${results.passed + results.failed} tests\n`));

  console.log(colors.yellow('\n⚠ NOTE: Full admin functionality tests require manual admin user creation'));
  console.log(colors.yellow('⚠ These tests verify role-based access control is working\n'));

  process.exit(results.failed > 0 ? 1 : 0);
}

runTests();

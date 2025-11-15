/**
 * Full Admin API Test Suite
 * Tests all admin endpoints with actual admin user
 */

const axios = require('axios');
const colors = require('colors');
const { Client } = require('pg');

const BASE_URL = 'http://localhost:3000';
let adminToken = '';
let consultantToken = '';
let consultantId = '';

// Database connection
const dbClient = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'whatsapp_campaign',
  user: process.env.DB_USER || 'campaign_user',
  password: process.env.DB_PASSWORD || 'CampaignDBPass2025'
});

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

async function setupDatabase() {
  console.log(colors.bold('\n=== SETUP: Database Connection ===\n'));

  try {
    await dbClient.connect();
    logSuccess('Database connected');
    return true;
  } catch (error) {
    logError(`Database connection failed: ${error.message}`);
    return false;
  }
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

    // Create admin user
    logTest('Creating admin user...');
    const adminEmail = `admin_${Date.now()}@example.com`;
    const adminRes = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'Test Admin',
      email: adminEmail,
      password: 'Admin123456',
      phone: '+905552222222'
    });

    const adminId = adminRes.data.data.consultant.id;
    logSuccess(`Admin user registered (ID: ${adminId})`);

    // Update role to admin in database
    logTest('Setting admin role in database...');
    await dbClient.query(
      "UPDATE consultants SET role = 'admin' WHERE id = $1",
      [adminId]
    );
    logSuccess('Admin role set');

    // Login as admin to get fresh token with admin role
    logTest('Logging in as admin...');
    const adminLoginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: adminEmail,
      password: 'Admin123456'
    });
    adminToken = adminLoginRes.data.data.token;
    logSuccess('Admin logged in successfully');

    return { consultantId, consultantToken, adminToken, adminId };
  } catch (error) {
    logError(`Setup failed: ${error.response?.data?.error || error.message}`);
    throw error;
  }
}

async function test1_AdminListConsultants() {
  console.log(colors.bold('\n=== TEST 1: GET /api/admin/consultants ===\n'));

  try {
    logTest('Fetching all consultants as admin...');
    const res = await axios.get(`${BASE_URL}/api/admin/consultants`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    logSuccess('Admin successfully fetched consultants list');
    console.log(colors.gray(`  - Total consultants: ${res.data.count}`));
    console.log(colors.gray(`  - Response includes: id, name, email, stats`));

    // Verify data structure
    if (res.data.success && res.data.data && Array.isArray(res.data.data)) {
      const consultant = res.data.data[0];
      if (consultant.stats &&
          typeof consultant.stats.contacts_count !== 'undefined' &&
          typeof consultant.stats.messages_sent_today !== 'undefined') {
        logSuccess('Data structure is correct (includes stats)');
      } else {
        logError('Data structure incomplete');
        return false;
      }
    }

    return true;
  } catch (error) {
    logError(`Test failed: ${error.response?.data?.error || error.message}`);
    if (error.response?.data) {
      console.log(colors.gray(JSON.stringify(error.response.data, null, 2)));
    }
    return false;
  }
}

async function test2_AdminSystemStats() {
  console.log(colors.bold('\n=== TEST 2: GET /api/admin/stats ===\n'));

  try {
    logTest('Fetching system statistics as admin...');
    const res = await axios.get(`${BASE_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    logSuccess('Admin successfully fetched system stats');
    console.log(colors.gray(`  - Total consultants: ${res.data.data.consultants.total}`));
    console.log(colors.gray(`  - Active consultants: ${res.data.data.consultants.active}`));
    console.log(colors.gray(`  - Total contacts: ${res.data.data.contacts.total}`));
    console.log(colors.gray(`  - Messages sent today: ${res.data.data.messages.sent_today}`));

    // Verify data structure
    if (res.data.data.consultants &&
        res.data.data.contacts &&
        res.data.data.messages &&
        res.data.data.campaigns &&
        res.data.data.spam_risk) {
      logSuccess('All system stats categories present');
    } else {
      logError('Incomplete system stats');
      return false;
    }

    return true;
  } catch (error) {
    logError(`Test failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function test3_AdminUpdateConsultant() {
  console.log(colors.bold('\n=== TEST 3: PUT /api/admin/consultants/:id ===\n'));

  try {
    logTest('Updating consultant daily_limit as admin...');
    const res = await axios.put(`${BASE_URL}/api/admin/consultants/${consultantId}`, {
      daily_limit: 150
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    logSuccess('Admin successfully updated consultant');
    console.log(colors.gray(`  - Updated consultant ID: ${res.data.data.id}`));
    console.log(colors.gray(`  - New daily_limit: ${res.data.data.daily_limit}`));

    if (res.data.data.daily_limit === 150) {
      logSuccess('Daily limit correctly updated');
    } else {
      logError('Daily limit not updated correctly');
      return false;
    }

    return true;
  } catch (error) {
    logError(`Test failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function test4_AdminToggleActive() {
  console.log(colors.bold('\n=== TEST 4: POST /api/admin/consultants/:id/toggle-active ===\n'));

  try {
    // Get current status
    logTest('Getting current active status...');
    const consultantRes = await axios.get(`${BASE_URL}/api/consultants/${consultantId}`);
    const currentStatus = consultantRes.data.data.is_active;
    logSuccess(`Current status: ${currentStatus}`);

    // Toggle status
    logTest('Toggling active status as admin...');
    const res = await axios.post(`${BASE_URL}/api/admin/consultants/${consultantId}/toggle-active`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    logSuccess('Admin successfully toggled status');
    console.log(colors.gray(`  - Previous status: ${currentStatus}`));
    console.log(colors.gray(`  - New status: ${res.data.data.is_active}`));

    if (res.data.data.is_active !== currentStatus) {
      logSuccess('Status correctly toggled');
    } else {
      logError('Status not toggled');
      return false;
    }

    // Toggle back
    logTest('Toggling back to original status...');
    await axios.post(`${BASE_URL}/api/admin/consultants/${consultantId}/toggle-active`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    logSuccess('Status toggled back');

    return true;
  } catch (error) {
    logError(`Test failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function runTests() {
  console.log(colors.bold.yellow('\n╔════════════════════════════════════════╗'));
  console.log(colors.bold.yellow('║   FULL ADMIN API TEST SUITE           ║'));
  console.log(colors.bold.yellow('╚════════════════════════════════════════╝'));

  const results = {
    passed: 0,
    failed: 0
  };

  // Setup database
  if (!await setupDatabase()) {
    console.log(colors.red('\n✗ Database connection failed, cannot continue'));
    process.exit(1);
  }

  // Setup users
  try {
    await setupTestUsers();
  } catch (error) {
    console.log(colors.red('\n✗ Setup failed, cannot continue'));
    await dbClient.end();
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

  // Cleanup
  await dbClient.end();

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

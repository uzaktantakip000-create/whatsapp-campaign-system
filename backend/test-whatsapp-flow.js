const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:3000';
let testResults = [];
let authToken = '';
let consultantId = '';

// Test user data
const testUser = {
  name: 'WhatsApp Test User',
  email: `whatsapp_test_${Date.now()}@example.com`,
  password: 'SecurePass123!',
  phone: '+905551234567'
};

/**
 * Log test result
 */
function logTest(name, passed, details = '') {
  testResults.push({ name, passed, details });
  const status = passed ? '✓'.green : '✗'.red;
  const message = passed ? name.green : name.red;
  console.log(`${status} ${message}`);
  if (details) {
    if (passed) {
      console.log(`  └─ ${details}`.gray);
    } else {
      console.log(`  └─ ${details}`.red);
    }
  }
}

/**
 * Test 1: Register and login
 */
async function testRegisterAndLogin() {
  try {
    console.log('\n🔐 Test 1: Register and login'.cyan);

    // Register
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, testUser);

    if (registerResponse.status === 201 && registerResponse.data.success) {
      authToken = registerResponse.data.data.token;
      consultantId = registerResponse.data.data.consultant.id;
      logTest('Register and login: Successful', true, `Consultant ID: ${consultantId}`);
    } else {
      logTest('Register and login: Failed', false, `Status: ${registerResponse.status}`);
    }
  } catch (error) {
    logTest('Register and login: Failed', false, error.response?.data?.error || error.message);
  }
}

/**
 * Test 2: Request QR code
 */
async function testRequestQRCode() {
  try {
    console.log('\n📱 Test 2: Request QR code'.cyan);

    const response = await axios.post(`${BASE_URL}/api/whatsapp/connect`, {}, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.status === 200 && response.data.success) {
      const { qrcode, instance_name, expires_in } = response.data.data;

      if (!qrcode || !qrcode.base64) {
        logTest('QR code: Failed', false, 'QR code data missing');
        return;
      }

      if (!instance_name) {
        logTest('QR code: Failed', false, 'Instance name missing');
        return;
      }

      logTest('QR code: Received successfully', true, `Instance: ${instance_name}`);
      logTest('QR code: Base64 image present', true, `Length: ${qrcode.base64.length} chars`);
      logTest('QR code: Expires in 45 seconds', expires_in === 45);
    } else {
      logTest('QR code: Failed', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('QR code: Failed', false, error.response?.data?.error || error.message);
  }
}

/**
 * Test 3: Check connection status (should be pending)
 */
async function testCheckStatusPending() {
  try {
    console.log('\n🔍 Test 3: Check connection status (pending)'.cyan);

    const response = await axios.get(`${BASE_URL}/api/whatsapp/status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.status === 200 && response.data.success) {
      const { status, instance_name } = response.data.data;

      // Status should be 'pending' after requesting QR code
      const isPending = status === 'pending' || status === 'offline';
      logTest('Status: Correct state', isPending, `Status: ${status}`);
      logTest('Status: Instance name present', !!instance_name, instance_name);
    } else {
      logTest('Status: Failed', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Status: Failed', false, error.response?.data?.error || error.message);
  }
}

/**
 * Test 4: Simulate webhook - connection update (state: open)
 */
async function testSimulateWebhookConnected() {
  try {
    console.log('\n🔗 Test 4: Simulate webhook (connected)'.cyan);

    // Get instance name
    const statusResponse = await axios.get(`${BASE_URL}/api/whatsapp/status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const instanceName = statusResponse.data.data.instance_name;

    // Simulate webhook from Evolution API
    const webhookPayload = {
      event: 'connection.update',
      instance: instanceName,
      data: {
        state: 'open',
        number: '+905551234567@s.whatsapp.net'
      }
    };

    const response = await axios.post(`${BASE_URL}/api/webhooks/evolution`, webhookPayload);

    if (response.status === 200 && response.data.success) {
      logTest('Webhook: Received successfully', true);

      // Wait a bit for database update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if consultant status was updated
      const newStatusResponse = await axios.get(`${BASE_URL}/api/whatsapp/status`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const newStatus = newStatusResponse.data.data.status;
      if (newStatus === 'active') {
        logTest('Webhook: Consultant status updated to active', true);
      } else {
        logTest('Webhook: Consultant status NOT updated', false, `Status: ${newStatus}`);
      }
    } else {
      logTest('Webhook: Failed', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Webhook: Failed', false, error.response?.data?.error || error.message);
  }
}

/**
 * Test 5: Check connection status (should be active)
 */
async function testCheckStatusActive() {
  try {
    console.log('\n✅ Test 5: Check connection status (active)'.cyan);

    const response = await axios.get(`${BASE_URL}/api/whatsapp/status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.status === 200 && response.data.success) {
      const { status, connected_at, whatsapp_number } = response.data.data;

      if (status !== 'active') {
        logTest('Status: Should be active', false, `Status: ${status}`);
        return;
      }

      if (!connected_at) {
        logTest('Status: connected_at missing', false);
        return;
      }

      logTest('Status: Active', true, `Connected at: ${connected_at}`);
      logTest('Status: WhatsApp number present', !!whatsapp_number);
    } else {
      logTest('Status: Failed', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Status: Failed', false, error.response?.data?.error || error.message);
  }
}

/**
 * Test 6: Disconnect from WhatsApp
 */
async function testDisconnect() {
  try {
    console.log('\n🔌 Test 6: Disconnect from WhatsApp'.cyan);

    const response = await axios.post(`${BASE_URL}/api/whatsapp/disconnect`, {}, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.status === 200 && response.data.success) {
      logTest('Disconnect: Successful', true);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify status is offline
      const statusResponse = await axios.get(`${BASE_URL}/api/whatsapp/status`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const status = statusResponse.data.data.status;
      if (status === 'offline') {
        logTest('Disconnect: Status updated to offline', true);
      } else {
        logTest('Disconnect: Status NOT updated', false, `Status: ${status}`);
      }
    } else {
      logTest('Disconnect: Failed', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Disconnect: Failed', false, error.response?.data?.error || error.message);
  }
}

/**
 * Test 7: Access whatsapp endpoint without token (should fail)
 */
async function testNoTokenAccess() {
  try {
    console.log('\n🚫 Test 7: Access without token (should fail)'.cyan);

    const response = await axios.post(`${BASE_URL}/api/whatsapp/connect`);

    // Should not reach here
    logTest('No token: Should be rejected', false, 'Access granted without token');
  } catch (error) {
    if (error.response?.status === 401) {
      logTest('No token: Correctly rejected', true);
    } else {
      logTest('No token: Wrong status', false, `Status: ${error.response?.status}`);
    }
  }
}

/**
 * Print summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY'.cyan.bold);
  console.log('='.repeat(50));

  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const total = testResults.length;
  const percentage = ((passed / total) * 100).toFixed(1);

  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`.green);
  console.log(`Failed: ${failed}`.red);
  console.log(`Success Rate: ${percentage}%`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:'.red.bold);
    testResults.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}`.red);
      if (r.details) {
        console.log(`    ${r.details}`.gray);
      }
    });
  }

  console.log('\n' + '='.repeat(50));

  if (percentage === 100) {
    console.log('🎉 All tests passed!'.green.bold);
  } else if (percentage >= 75) {
    console.log('⚠️  Most tests passed, some issues found'.yellow.bold);
  } else {
    console.log('❌ Many tests failed, WhatsApp flow needs attention'.red.bold);
  }

  console.log('='.repeat(50) + '\n');
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n' + '='.repeat(50));
  console.log('🧪 WHATSAPP FLOW TESTS'.cyan.bold);
  console.log('='.repeat(50));
  console.log(`Test User Email: ${testUser.email}`.gray);
  console.log('='.repeat(50));

  try {
    await testRegisterAndLogin();
    await testRequestQRCode();
    await testCheckStatusPending();
    await testSimulateWebhookConnected();
    await testCheckStatusActive();
    await testDisconnect();
    await testNoTokenAccess();
  } catch (error) {
    console.error('Test execution error:', error.message);
  }

  printSummary();
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

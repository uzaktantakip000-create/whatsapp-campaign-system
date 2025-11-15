const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:3000';
let testResults = [];
let authToken = '';
let consultantId = '';

// Test user data
const testUser = {
  name: 'Test Consultant',
  email: `test_${Date.now()}@example.com`,
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
  if (details && !passed) {
    console.log(`  └─ ${details}`.gray);
  }
}

/**
 * Test 1: Register new consultant
 */
async function testRegister() {
  try {
    console.log('\n📝 Test 1: Register new consultant'.cyan);

    const response = await axios.post(`${BASE_URL}/api/auth/register`, testUser);

    if (response.status === 201 && response.data.success) {
      const { consultant, token } = response.data.data;

      if (!consultant || !token) {
        logTest('Register: Response structure', false, 'Missing consultant or token');
        return;
      }

      if (consultant.email !== testUser.email) {
        logTest('Register: Email match', false, `Expected ${testUser.email}, got ${consultant.email}`);
        return;
      }

      if (!consultant.instance_name) {
        logTest('Register: Instance name generated', false, 'Instance name is missing');
        return;
      }

      // Save for later tests
      authToken = token;
      consultantId = consultant.id;

      logTest('Register: New consultant registered', true);
      logTest('Register: JWT token received', true);
      logTest('Register: Instance name auto-generated', true, consultant.instance_name);
    } else {
      logTest('Register: Failed', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Register: Failed', false, error.response?.data?.error || error.message);
  }
}

/**
 * Test 2: Register with duplicate email (should fail)
 */
async function testRegisterDuplicate() {
  try {
    console.log('\n🔄 Test 2: Register with duplicate email (should fail)'.cyan);

    const response = await axios.post(`${BASE_URL}/api/auth/register`, testUser);

    // Should not reach here
    logTest('Register: Duplicate email rejected', false, 'Duplicate registration succeeded (should fail)');
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error?.includes('already registered')) {
      logTest('Register: Duplicate email rejected', true);
    } else {
      logTest('Register: Duplicate email rejected', false, error.response?.data?.error || error.message);
    }
  }
}

/**
 * Test 3: Login with correct credentials
 */
async function testLogin() {
  try {
    console.log('\n🔑 Test 3: Login with correct credentials'.cyan);

    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });

    if (response.status === 200 && response.data.success) {
      const { consultant, token } = response.data.data;

      if (!token) {
        logTest('Login: Token received', false, 'No token in response');
        return;
      }

      if (consultant.id !== consultantId) {
        logTest('Login: Correct consultant', false, `ID mismatch: ${consultant.id} vs ${consultantId}`);
        return;
      }

      // Update token (should be fresh)
      authToken = token;

      logTest('Login: Successful with correct credentials', true);
      logTest('Login: JWT token received', true);
    } else {
      logTest('Login: Failed', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Login: Failed', false, error.response?.data?.error || error.message);
  }
}

/**
 * Test 4: Login with wrong password (should fail)
 */
async function testLoginWrongPassword() {
  try {
    console.log('\n❌ Test 4: Login with wrong password (should fail)'.cyan);

    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testUser.email,
      password: 'WrongPassword123!'
    });

    // Should not reach here
    logTest('Login: Wrong password rejected', false, 'Login succeeded with wrong password');
  } catch (error) {
    if (error.response?.status === 401) {
      logTest('Login: Wrong password rejected', true);
    } else {
      logTest('Login: Wrong password rejected', false, `Wrong status: ${error.response?.status}`);
    }
  }
}

/**
 * Test 5: Access protected route with valid token
 */
async function testProtectedRouteValid() {
  try {
    console.log('\n🔐 Test 5: Access protected route with valid token'.cyan);

    const response = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.status === 200 && response.data.success) {
      const consultant = response.data.data;

      if (consultant.id !== consultantId) {
        logTest('Protected route: Correct user data', false, 'ID mismatch');
        return;
      }

      if (consultant.password_hash) {
        logTest('Protected route: Password hash excluded', false, 'Password hash exposed');
        return;
      }

      logTest('Protected route: Access with valid token', true);
      logTest('Protected route: Sensitive data excluded', true);
    } else {
      logTest('Protected route: Failed', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Protected route: Failed', false, error.response?.data?.error || error.message);
  }
}

/**
 * Test 6: Access protected route without token (should fail)
 */
async function testProtectedRouteNoToken() {
  try {
    console.log('\n🚫 Test 6: Access protected route without token (should fail)'.cyan);

    const response = await axios.get(`${BASE_URL}/api/auth/me`);

    // Should not reach here
    logTest('Protected route: No token rejected', false, 'Access granted without token');
  } catch (error) {
    if (error.response?.status === 401) {
      logTest('Protected route: No token rejected', true);
    } else {
      logTest('Protected route: No token rejected', false, `Wrong status: ${error.response?.status}`);
    }
  }
}

/**
 * Test 7: Access protected route with invalid token (should fail)
 */
async function testProtectedRouteInvalidToken() {
  try {
    console.log('\n🚫 Test 7: Access protected route with invalid token (should fail)'.cyan);

    const response = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': 'Bearer invalid_token_12345'
      }
    });

    // Should not reach here
    logTest('Protected route: Invalid token rejected', false, 'Access granted with invalid token');
  } catch (error) {
    if (error.response?.status === 401) {
      logTest('Protected route: Invalid token rejected', true);
    } else {
      logTest('Protected route: Invalid token rejected', false, `Wrong status: ${error.response?.status}`);
    }
  }
}

/**
 * Test 8: Logout
 */
async function testLogout() {
  try {
    console.log('\n👋 Test 8: Logout'.cyan);

    const response = await axios.post(`${BASE_URL}/api/auth/logout`, {}, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.status === 200 && response.data.success) {
      logTest('Logout: Successful', true);
    } else {
      logTest('Logout: Failed', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Logout: Failed', false, error.response?.data?.error || error.message);
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
    console.log('❌ Many tests failed, authentication system needs attention'.red.bold);
  }

  console.log('='.repeat(50) + '\n');
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n' + '='.repeat(50));
  console.log('🧪 AUTHENTICATION TESTS'.cyan.bold);
  console.log('='.repeat(50));
  console.log(`Test User Email: ${testUser.email}`.gray);
  console.log('='.repeat(50));

  try {
    await testRegister();
    await testRegisterDuplicate();
    await testLogin();
    await testLoginWrongPassword();
    await testProtectedRouteValid();
    await testProtectedRouteNoToken();
    await testProtectedRouteInvalidToken();
    await testLogout();
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

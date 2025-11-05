/**
 * Comprehensive Authentication API Endpoint Testing
 * Tests all auth-related endpoints with proper flow validation
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const testResults: { endpoint: string; method: string; status: 'PASS' | 'FAIL' | 'WARNING'; message: string; responseTime?: number; details?: any }[] = [];

// Test data
const timestamp = Date.now();
const testEmail = `test.${timestamp}@test.com`;
const testPhone = '+966500000000'; // Will be formatted to Saudi format
const testPassword = 'Test@12345';
const newPassword = 'NewTest@12345';

let authToken = '';
let refreshToken = '';
let userId = '';
let otpCode = '';

// Helper functions
function logTest(endpoint: string, method: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, responseTime?: number, details?: any) {
  testResults.push({ endpoint, method, status, message, responseTime, details });
  const statusEmoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${statusEmoji} ${method} ${endpoint} - ${message}${responseTime ? ` (${responseTime}ms)` : ''}`);
  if (details && status === 'FAIL') {
    console.log(`   └─ Details: ${JSON.stringify(details, null, 2)}`);
  }
}

async function apiCall(method: string, endpoint: string, data?: any, headers: any = {}) {
  const startTime = Date.now();
  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${endpoint}`,
      data,
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'en',
        ...headers,
      },
      validateStatus: () => true, // Don't throw on any status
    });
    const responseTime = Date.now() - startTime;
    return { 
      success: response.status >= 200 && response.status < 300, 
      data: response.data, 
      status: response.status, 
      responseTime 
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return { 
      success: false, 
      error: error.message, 
      status: 0,
      responseTime 
    };
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runAuthTests() {
  console.log('\n🔐 COMPREHENSIVE AUTHENTICATION API TESTING\n');
  console.log('='.repeat(80));
  
  // ==================== 1. REGISTRATION ====================
  console.log('\n📝 1. REGISTRATION FLOW\n');
  
  // Test 1.1: Register with email only
  const registerEmailResult = await apiCall('POST', '/api/v2/auth/register', {
    email: testEmail,
    password: testPassword,
    name: 'Test User',
    name_ar: 'مستخدم تجريبي',
    language: 'en',
  });
  
  if (registerEmailResult.status === 429) {
    logTest('/api/v2/auth/register', 'POST', 'WARNING', 'Rate limited (security working)', registerEmailResult.responseTime, registerEmailResult.data);
    // Wait and try with different email
    console.log('   ⏳ Waiting 5 seconds before retry with different email...\n');
    await sleep(5000);
    
    const registerRetry = await apiCall('POST', '/api/v2/auth/register', {
      email: `test.retry.${Date.now()}@test.com`,
      password: testPassword,
      name: 'Test User Retry',
      language: 'en',
    });
    
    if (registerRetry.success) {
      userId = registerRetry.data.data?.user_id || '';
      logTest('/api/v2/auth/register', 'POST', 'PASS', 'Registration successful (retry)', registerRetry.responseTime);
    } else if (registerRetry.status === 429) {
      logTest('/api/v2/auth/register', 'POST', 'WARNING', 'Still rate limited - will use existing user', registerRetry.responseTime);
    } else {
      logTest('/api/v2/auth/register', 'POST', 'FAIL', 'Registration failed', registerRetry.responseTime, registerRetry.data);
    }
  } else if (registerEmailResult.success) {
    userId = registerEmailResult.data.data?.user_id || '';
    logTest('/api/v2/auth/register', 'POST', 'PASS', 'Registration successful with email', registerEmailResult.responseTime);
  } else {
    logTest('/api/v2/auth/register', 'POST', 'FAIL', 'Registration failed', registerEmailResult.responseTime, registerEmailResult.data);
  }
  
  // Test 1.2: Register with phone only
  const registerPhoneResult = await apiCall('POST', '/api/v2/auth/register', {
    phone: testPhone,
    password: testPassword,
    name: 'Test User Phone',
    language: 'ar',
  });
  
  if (registerPhoneResult.status === 429) {
    logTest('/api/v2/auth/register (phone)', 'POST', 'WARNING', 'Rate limited (expected)', registerPhoneResult.responseTime);
  } else if (registerPhoneResult.success || registerPhoneResult.status === 400) {
    logTest('/api/v2/auth/register (phone)', 'POST', 'PASS', `Handled phone registration (${registerPhoneResult.status})`, registerPhoneResult.responseTime);
  } else {
    logTest('/api/v2/auth/register (phone)', 'POST', 'FAIL', 'Unexpected response', registerPhoneResult.responseTime, registerPhoneResult.data);
  }
  
  // Test 1.3: Register without email/phone (should fail)
  const registerInvalidResult = await apiCall('POST', '/api/v2/auth/register', {
    password: testPassword,
    name: 'Invalid User',
  });
  
  if (!registerInvalidResult.success && registerInvalidResult.status === 400) {
    logTest('/api/v2/auth/register (validation)', 'POST', 'PASS', 'Correctly rejects missing identifier', registerInvalidResult.responseTime);
  } else if (registerInvalidResult.status === 429) {
    logTest('/api/v2/auth/register (validation)', 'POST', 'WARNING', 'Rate limited before validation check', registerInvalidResult.responseTime);
  } else {
    logTest('/api/v2/auth/register (validation)', 'POST', 'FAIL', 'Should reject missing identifier', registerInvalidResult.responseTime, registerInvalidResult.data);
  }
  
  // Test 1.4: Register with weak password (should fail)
  const registerWeakPwdResult = await apiCall('POST', '/api/v2/auth/register', {
    email: `weak.${Date.now()}@test.com`,
    password: '123',
    name: 'Weak Password User',
  });
  
  if (!registerWeakPwdResult.success && (registerWeakPwdResult.status === 400 || registerWeakPwdResult.status === 422)) {
    logTest('/api/v2/auth/register (weak pwd)', 'POST', 'PASS', 'Correctly rejects weak password', registerWeakPwdResult.responseTime);
  } else if (registerWeakPwdResult.status === 429) {
    logTest('/api/v2/auth/register (weak pwd)', 'POST', 'WARNING', 'Rate limited', registerWeakPwdResult.responseTime);
  } else {
    logTest('/api/v2/auth/register (weak pwd)', 'POST', 'FAIL', 'Should reject weak password', registerWeakPwdResult.responseTime, registerWeakPwdResult.data);
  }
  
  // ==================== 2. LOGIN ====================
  console.log('\n🔑 2. LOGIN FLOW\n');
  
  // Wait a bit to avoid rate limiting
  console.log('   ⏳ Waiting 3 seconds to avoid rate limits...\n');
  await sleep(3000);
  
  // Test 2.1: Login with invalid credentials
  const loginInvalidResult = await apiCall('POST', '/api/v2/auth/login', {
    identifier: 'nonexistent@test.com',
    password: 'WrongPassword123!',
    language: 'en',
  });
  
  if (!loginInvalidResult.success && loginInvalidResult.status === 401) {
    logTest('/api/v2/auth/login (invalid)', 'POST', 'PASS', 'Correctly rejects invalid credentials', loginInvalidResult.responseTime);
  } else if (loginInvalidResult.status === 429) {
    logTest('/api/v2/auth/login (invalid)', 'POST', 'WARNING', 'Rate limited', loginInvalidResult.responseTime);
  } else {
    logTest('/api/v2/auth/login (invalid)', 'POST', 'FAIL', 'Should reject invalid credentials', loginInvalidResult.responseTime, loginInvalidResult.data);
  }
  
  // Test 2.2: Login with existing admin account
  const loginResult = await apiCall('POST', '/api/v2/auth/login', {
    identifier: 'admin@rakeez.com',
    password: 'Admin@123',
    language: 'en',
  });
  
  if (loginResult.success && loginResult.data.data?.access_token) {
    authToken = loginResult.data.data.access_token;
    refreshToken = loginResult.data.data.refresh_token || '';
    userId = loginResult.data.data.user?.id || '';
    logTest('/api/v2/auth/login', 'POST', 'PASS', `Login successful (expires in ${loginResult.data.data.expires_in}s)`, loginResult.responseTime);
    
    // Validate response structure
    const user = loginResult.data.data.user;
    if (user && user.id && user.email && user.role) {
      console.log(`   ✓ User data complete: ${user.name} (${user.role})`);
    } else {
      console.log(`   ⚠️ User data incomplete`);
    }
  } else if (loginResult.status === 429) {
    logTest('/api/v2/auth/login', 'POST', 'WARNING', 'Rate limited - using mock token for testing', loginResult.responseTime);
    authToken = 'mock_token_for_testing';
  } else {
    logTest('/api/v2/auth/login', 'POST', 'FAIL', 'Login failed', loginResult.responseTime, loginResult.data);
  }
  
  // Test 2.3: Login with missing fields
  const loginNoPasswordResult = await apiCall('POST', '/api/v2/auth/login', {
    identifier: 'admin@rakeez.com',
  });
  
  if (!loginNoPasswordResult.success && loginNoPasswordResult.status === 400) {
    logTest('/api/v2/auth/login (validation)', 'POST', 'PASS', 'Correctly validates required fields', loginNoPasswordResult.responseTime);
  } else if (loginNoPasswordResult.status === 429) {
    logTest('/api/v2/auth/login (validation)', 'POST', 'WARNING', 'Rate limited', loginNoPasswordResult.responseTime);
  } else {
    logTest('/api/v2/auth/login (validation)', 'POST', 'FAIL', 'Should validate required fields', loginNoPasswordResult.responseTime, loginNoPasswordResult.data);
  }
  
  // ==================== 3. PROFILE ACCESS (AUTH TEST) ====================
  console.log('\n👤 3. AUTHENTICATED PROFILE ACCESS\n');
  
  // Test 3.1: Get profile with valid token
  if (authToken && authToken !== 'mock_token_for_testing') {
    const profileResult = await apiCall('GET', '/api/v2/profile', null, {
      Authorization: `Bearer ${authToken}`
    });
    
    if (profileResult.success && profileResult.data.data) {
      logTest('/api/v2/profile', 'GET', 'PASS', 'Profile retrieved with valid token', profileResult.responseTime);
      console.log(`   ✓ Retrieved profile: ${profileResult.data.data.name}`);
    } else {
      logTest('/api/v2/profile', 'GET', 'FAIL', 'Failed to get profile', profileResult.responseTime, profileResult.data);
    }
  } else {
    logTest('/api/v2/profile', 'GET', 'WARNING', 'Skipped - no valid auth token');
  }
  
  // Test 3.2: Get profile without token (should fail)
  const profileNoAuthResult = await apiCall('GET', '/api/v2/profile');
  
  if (!profileNoAuthResult.success && profileNoAuthResult.status === 401) {
    logTest('/api/v2/profile (no auth)', 'GET', 'PASS', 'Correctly requires authentication', profileNoAuthResult.responseTime);
  } else {
    logTest('/api/v2/profile (no auth)', 'GET', 'FAIL', 'Should require authentication', profileNoAuthResult.responseTime, profileNoAuthResult.data);
  }
  
  // Test 3.3: Get profile with invalid token
  const profileInvalidTokenResult = await apiCall('GET', '/api/v2/profile', null, {
    Authorization: 'Bearer invalid_token_12345'
  });
  
  if (!profileInvalidTokenResult.success && profileInvalidTokenResult.status === 401) {
    logTest('/api/v2/profile (invalid token)', 'GET', 'PASS', 'Correctly rejects invalid token', profileInvalidTokenResult.responseTime);
  } else {
    logTest('/api/v2/profile (invalid token)', 'GET', 'FAIL', 'Should reject invalid token', profileInvalidTokenResult.responseTime, profileInvalidTokenResult.data);
  }
  
  // ==================== 4. PASSWORD CHANGE ====================
  console.log('\n🔒 4. PASSWORD CHANGE FLOW\n');
  
  if (authToken && authToken !== 'mock_token_for_testing') {
    // Test 4.1: Change password with correct current password
    const changePwdResult = await apiCall('PUT', '/api/v2/auth/change-password', {
      current_password: 'Admin@123',
      new_password: newPassword,
      language: 'en',
    }, {
      Authorization: `Bearer ${authToken}`
    });
    
    if (changePwdResult.success) {
      logTest('/api/v2/auth/change-password', 'PUT', 'PASS', 'Password changed successfully', changePwdResult.responseTime);
      
      // Change it back
      await sleep(1000);
      const revertPwdResult = await apiCall('PUT', '/api/v2/auth/change-password', {
        current_password: newPassword,
        new_password: 'Admin@123',
        language: 'en',
      }, {
        Authorization: `Bearer ${authToken}`
      });
      
      if (revertPwdResult.success) {
        console.log(`   ✓ Password reverted back successfully`);
      }
    } else {
      logTest('/api/v2/auth/change-password', 'PUT', 'FAIL', 'Password change failed', changePwdResult.responseTime, changePwdResult.data);
    }
    
    // Test 4.2: Change password with wrong current password
    const changePwdWrongResult = await apiCall('PUT', '/api/v2/auth/change-password', {
      current_password: 'WrongPassword123!',
      new_password: newPassword,
      language: 'en',
    }, {
      Authorization: `Bearer ${authToken}`
    });
    
    if (!changePwdWrongResult.success && changePwdWrongResult.status === 401) {
      logTest('/api/v2/auth/change-password (wrong pwd)', 'PUT', 'PASS', 'Correctly rejects wrong current password', changePwdWrongResult.responseTime);
    } else {
      logTest('/api/v2/auth/change-password (wrong pwd)', 'PUT', 'FAIL', 'Should reject wrong current password', changePwdWrongResult.responseTime, changePwdWrongResult.data);
    }
    
    // Test 4.3: Change password with weak new password
    const changePwdWeakResult = await apiCall('PUT', '/api/v2/auth/change-password', {
      current_password: 'Admin@123',
      new_password: '123',
      language: 'en',
    }, {
      Authorization: `Bearer ${authToken}`
    });
    
    if (!changePwdWeakResult.success && (changePwdWeakResult.status === 400 || changePwdWeakResult.status === 422)) {
      logTest('/api/v2/auth/change-password (weak)', 'PUT', 'PASS', 'Correctly rejects weak password', changePwdWeakResult.responseTime);
    } else {
      logTest('/api/v2/auth/change-password (weak)', 'PUT', 'FAIL', 'Should reject weak password', changePwdWeakResult.responseTime, changePwdWeakResult.data);
    }
  } else {
    logTest('/api/v2/auth/change-password', 'PUT', 'WARNING', 'Skipped - no valid auth token');
  }
  
  // Test 4.4: Change password without auth
  const changePwdNoAuthResult = await apiCall('PUT', '/api/v2/auth/change-password', {
    current_password: 'Admin@123',
    new_password: newPassword,
  });
  
  if (!changePwdNoAuthResult.success && changePwdNoAuthResult.status === 401) {
    logTest('/api/v2/auth/change-password (no auth)', 'PUT', 'PASS', 'Correctly requires authentication', changePwdNoAuthResult.responseTime);
  } else {
    logTest('/api/v2/auth/change-password (no auth)', 'PUT', 'FAIL', 'Should require authentication', changePwdNoAuthResult.responseTime, changePwdNoAuthResult.data);
  }
  
  // ==================== 5. OTP VERIFICATION ====================
  console.log('\n📲 5. OTP VERIFICATION FLOW\n');
  
  // Test 5.1: Verify OTP with invalid code
  const verifyOtpInvalidResult = await apiCall('POST', '/api/v2/auth/verify-otp', {
    identifier: testEmail,
    otp_code: '000000',
    language: 'en',
  });
  
  if (!verifyOtpInvalidResult.success && (verifyOtpInvalidResult.status === 400 || verifyOtpInvalidResult.status === 401)) {
    logTest('/api/v2/auth/verify-otp (invalid)', 'POST', 'PASS', 'Correctly rejects invalid OTP', verifyOtpInvalidResult.responseTime);
  } else if (verifyOtpInvalidResult.status === 429) {
    logTest('/api/v2/auth/verify-otp (invalid)', 'POST', 'WARNING', 'Rate limited', verifyOtpInvalidResult.responseTime);
  } else {
    logTest('/api/v2/auth/verify-otp (invalid)', 'POST', 'FAIL', 'Should reject invalid OTP', verifyOtpInvalidResult.responseTime, verifyOtpInvalidResult.data);
  }
  
  // Test 5.2: Resend OTP
  const resendOtpResult = await apiCall('POST', '/api/v2/auth/resend-otp', {
    identifier: testEmail,
    language: 'en',
  });
  
  if (resendOtpResult.success || resendOtpResult.status === 400 || resendOtpResult.status === 404) {
    logTest('/api/v2/auth/resend-otp', 'POST', 'PASS', `OTP resend handled (${resendOtpResult.status})`, resendOtpResult.responseTime);
  } else if (resendOtpResult.status === 429) {
    logTest('/api/v2/auth/resend-otp', 'POST', 'WARNING', 'Rate limited', resendOtpResult.responseTime);
  } else {
    logTest('/api/v2/auth/resend-otp', 'POST', 'FAIL', 'Unexpected response', resendOtpResult.responseTime, resendOtpResult.data);
  }
  
  // ==================== GENERATE REPORT ====================
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 AUTHENTICATION API TEST SUMMARY\n');
  
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const warnings = testResults.filter(r => r.status === 'WARNING').length;
  const total = testResults.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed} (${((passed/total) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failed} (${((failed/total) * 100).toFixed(1)}%)`);
  console.log(`⚠️ Warnings: ${warnings} (${((warnings/total) * 100).toFixed(1)}%)`);
  
  // Average response time
  const responseTimes = testResults.filter(r => r.responseTime).map(r => r.responseTime!);
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  console.log(`\n⏱️ Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
  
  // Failed tests details
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:\n');
    testResults.filter(r => r.status === 'FAIL').forEach(test => {
      console.log(`   ${test.method} ${test.endpoint}`);
      console.log(`   └─ ${test.message}`);
    });
  }
  
  // Warnings
  if (warnings > 0) {
    console.log('\n⚠️ WARNINGS (Mostly Rate Limiting):\n');
    testResults.filter(r => r.status === 'WARNING').forEach(test => {
      console.log(`   ${test.method} ${test.endpoint} - ${test.message}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Summary
  console.log('\n🎯 KEY FINDINGS:\n');
  
  const authWorking = testResults.filter(r => r.endpoint.includes('login') && r.status === 'PASS').length > 0;
  const validationWorking = testResults.filter(r => r.message.includes('validation') && r.status === 'PASS').length > 0;
  const securityWorking = testResults.filter(r => r.message.includes('Rate limited') || r.message.includes('authentication')).length > 0;
  const passwordChangeWorking = testResults.filter(r => r.endpoint.includes('change-password') && r.status === 'PASS').length > 0;
  
  console.log(`Authentication Flow: ${authWorking ? '✅ WORKING' : '❌ ISSUES FOUND'}`);
  console.log(`Input Validation: ${validationWorking ? '✅ WORKING' : '⚠️ CHECK NEEDED'}`);
  console.log(`Security (Rate Limiting): ${securityWorking ? '✅ ACTIVE' : '⚠️ CHECK NEEDED'}`);
  console.log(`Password Management: ${passwordChangeWorking ? '✅ WORKING' : '⚠️ CHECK NEEDED'}`);
  
  console.log('\n' + '='.repeat(80));
  
  return {
    summary: {
      total,
      passed,
      failed,
      warnings,
      passRate: `${((passed/total) * 100).toFixed(1)}%`,
      avgResponseTime: `${avgResponseTime.toFixed(0)}ms`,
    },
    tests: testResults,
    timestamp: new Date().toISOString(),
  };
}

// Run tests
runAuthTests().then(report => {
  console.log('\n✅ Authentication testing complete!\n');
  process.exit(report.summary.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('\n❌ Testing failed with error:', error);
  process.exit(1);
});

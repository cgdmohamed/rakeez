/**
 * Comprehensive Customer API Endpoint Testing Script
 * Tests all customer-facing endpoints and generates an honest report
 */

import axios, { AxiosError } from 'axios';

const BASE_URL = 'http://localhost:5000';
const testResults: { endpoint: string; method: string; status: 'PASS' | 'FAIL' | 'SKIP'; message: string; responseTime?: number }[] = [];

// Test credentials
let authToken = '';
let refreshToken = '';
let testUserId = '';
let testAddressId = '';
let testBookingId = '';
let testQuotationId = '';
let testTicketId = '';

// Helper function to log results
function logTest(endpoint: string, method: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, responseTime?: number) {
  testResults.push({ endpoint, method, status, message, responseTime });
  const statusEmoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${statusEmoji} ${method} ${endpoint} - ${message}${responseTime ? ` (${responseTime}ms)` : ''}`);
}

// Helper to make API calls
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
    });
    const responseTime = Date.now() - startTime;
    return { success: true, data: response.data, status: response.status, responseTime };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status,
      responseTime 
    };
  }
}

async function runTests() {
  console.log('\n🧪 COMPREHENSIVE CUSTOMER API ENDPOINT TESTING\n');
  console.log('='.repeat(80));
  
  // ==================== 1. AUTH & REGISTRATION ====================
  console.log('\n📝 1. AUTH & REGISTRATION ENDPOINTS\n');
  
  // Test 1.1: Register
  const registerResult = await apiCall('POST', '/api/v2/auth/register', {
    email: `test.customer.${Date.now()}@test.com`,
    password: 'Test@12345',
    name: 'Test Customer',
    name_ar: 'عميل تجريبي',
    language: 'en',
  });
  
  if (registerResult.success) {
    logTest('/api/v2/auth/register', 'POST', 'PASS', 'Registration successful', registerResult.responseTime);
    authToken = registerResult.data.data?.token || '';
    testUserId = registerResult.data.data?.user?.id || '';
  } else {
    logTest('/api/v2/auth/register', 'POST', 'FAIL', `Registration failed: ${JSON.stringify(registerResult.error)}`, registerResult.responseTime);
  }
  
  // Test 1.2: Login with invalid credentials
  const loginFailResult = await apiCall('POST', '/api/v2/auth/login', {
    identifier: 'nonexistent@test.com',
    password: 'WrongPassword123',
    language: 'en',
  });
  
  if (!loginFailResult.success && loginFailResult.status === 401) {
    logTest('/api/v2/auth/login (invalid)', 'POST', 'PASS', 'Correctly rejects invalid credentials', loginFailResult.responseTime);
  } else {
    logTest('/api/v2/auth/login (invalid)', 'POST', 'FAIL', 'Should reject invalid credentials but didn\'t', loginFailResult.responseTime);
  }
  
  // Test 1.3: Login with valid credentials
  if (!authToken) {
    // Try to login with existing admin account
    const loginResult = await apiCall('POST', '/api/v2/auth/login', {
      identifier: 'admin@rakeez.com',
      password: 'Admin@123',
      language: 'en',
    });
    
    if (loginResult.success) {
      authToken = loginResult.data.data?.access_token || '';
      testUserId = loginResult.data.data?.user?.id || '';
      logTest('/api/v2/auth/login', 'POST', 'PASS', 'Login successful (using admin account)', loginResult.responseTime);
    } else {
      logTest('/api/v2/auth/login', 'POST', 'FAIL', `Login failed: ${JSON.stringify(loginResult.error)}`, loginResult.responseTime);
    }
  }
  
  // Test 1.4: Change password (requires authentication)
  if (authToken) {
    const changePasswordResult = await apiCall('PUT', '/api/v2/auth/change-password', {
      current_password: 'Admin@123',
      new_password: 'NewAdmin@123',
    }, { Authorization: `Bearer ${authToken}` });
    
    // Change it back
    if (changePasswordResult.success) {
      await apiCall('PUT', '/api/v2/auth/change-password', {
        current_password: 'NewAdmin@123',
        new_password: 'Admin@123',
      }, { Authorization: `Bearer ${authToken}` });
      logTest('/api/v2/auth/change-password', 'PUT', 'PASS', 'Password change successful', changePasswordResult.responseTime);
    } else {
      logTest('/api/v2/auth/change-password', 'PUT', 'FAIL', `Password change failed: ${JSON.stringify(changePasswordResult.error)}`, changePasswordResult.responseTime);
    }
  } else {
    logTest('/api/v2/auth/change-password', 'PUT', 'SKIP', 'Skipped - no auth token');
  }
  
  // ==================== 2. PROFILE ENDPOINTS ====================
  console.log('\n👤 2. PROFILE ENDPOINTS\n');
  
  // Test 2.1: Get profile
  if (authToken) {
    const profileResult = await apiCall('GET', '/api/v2/profile', null, { Authorization: `Bearer ${authToken}` });
    
    if (profileResult.success && profileResult.data.data) {
      logTest('/api/v2/profile', 'GET', 'PASS', 'Profile retrieved successfully', profileResult.responseTime);
    } else {
      logTest('/api/v2/profile', 'GET', 'FAIL', `Failed to get profile: ${JSON.stringify(profileResult.error)}`, profileResult.responseTime);
    }
  } else {
    logTest('/api/v2/profile', 'GET', 'SKIP', 'Skipped - no auth token');
  }
  
  // Test 2.2: Update profile
  if (authToken) {
    const updateProfileResult = await apiCall('PUT', '/api/v2/profile', {
      name: 'Updated Test Customer',
    }, { Authorization: `Bearer ${authToken}` });
    
    if (updateProfileResult.success) {
      logTest('/api/v2/profile', 'PUT', 'PASS', 'Profile updated successfully', updateProfileResult.responseTime);
    } else {
      logTest('/api/v2/profile', 'PUT', 'FAIL', `Failed to update profile: ${JSON.stringify(updateProfileResult.error)}`, updateProfileResult.responseTime);
    }
  } else {
    logTest('/api/v2/profile', 'PUT', 'SKIP', 'Skipped - no auth token');
  }
  
  // Test 2.3: Get notification settings
  if (authToken) {
    const notifResult = await apiCall('GET', '/api/v2/profile/notifications', null, { Authorization: `Bearer ${authToken}` });
    
    if (notifResult.success) {
      logTest('/api/v2/profile/notifications', 'GET', 'PASS', 'Notification settings retrieved', notifResult.responseTime);
    } else {
      logTest('/api/v2/profile/notifications', 'GET', 'FAIL', `Failed: ${JSON.stringify(notifResult.error)}`, notifResult.responseTime);
    }
  } else {
    logTest('/api/v2/profile/notifications', 'GET', 'SKIP', 'Skipped - no auth token');
  }
  
  // Test 2.4: Update notification settings
  if (authToken) {
    const updateNotifResult = await apiCall('PUT', '/api/v2/profile/notifications', {
      email_notifications: true,
      sms_notifications: false,
    }, { Authorization: `Bearer ${authToken}` });
    
    if (updateNotifResult.success) {
      logTest('/api/v2/profile/notifications', 'PUT', 'PASS', 'Notification settings updated', updateNotifResult.responseTime);
    } else {
      logTest('/api/v2/profile/notifications', 'PUT', 'FAIL', `Failed: ${JSON.stringify(updateNotifResult.error)}`, updateNotifResult.responseTime);
    }
  } else {
    logTest('/api/v2/profile/notifications', 'PUT', 'SKIP', 'Skipped - no auth token');
  }
  
  // ==================== 3. ADDRESS ENDPOINTS ====================
  console.log('\n📍 3. ADDRESS ENDPOINTS\n');
  
  // Test 3.1: Get addresses
  if (authToken) {
    const addressesResult = await apiCall('GET', '/api/v2/addresses', null, { Authorization: `Bearer ${authToken}` });
    
    if (addressesResult.success) {
      logTest('/api/v2/addresses', 'GET', 'PASS', `Retrieved ${addressesResult.data.data?.length || 0} addresses`, addressesResult.responseTime);
    } else {
      logTest('/api/v2/addresses', 'GET', 'FAIL', `Failed: ${JSON.stringify(addressesResult.error)}`, addressesResult.responseTime);
    }
  } else {
    logTest('/api/v2/addresses', 'GET', 'SKIP', 'Skipped - no auth token');
  }
  
  // Test 3.2: Create address
  if (authToken) {
    const createAddressResult = await apiCall('POST', '/api/v2/addresses', {
      street: 'King Fahd Road',
      city: 'Riyadh',
      district: 'Olaya',
      postal_code: '12345',
      latitude: 24.7136,
      longitude: 46.6753,
    }, { Authorization: `Bearer ${authToken}` });
    
    if (createAddressResult.success) {
      testAddressId = createAddressResult.data.data?.id || '';
      logTest('/api/v2/addresses', 'POST', 'PASS', 'Address created successfully', createAddressResult.responseTime);
    } else {
      logTest('/api/v2/addresses', 'POST', 'FAIL', `Failed: ${JSON.stringify(createAddressResult.error)}`, createAddressResult.responseTime);
    }
  } else {
    logTest('/api/v2/addresses', 'POST', 'SKIP', 'Skipped - no auth token');
  }
  
  // Test 3.3: Update address
  if (authToken && testAddressId) {
    const updateAddressResult = await apiCall('PUT', `/api/v2/addresses/${testAddressId}`, {
      street: 'Updated King Fahd Road',
    }, { Authorization: `Bearer ${authToken}` });
    
    if (updateAddressResult.success) {
      logTest(`/api/v2/addresses/:id`, 'PUT', 'PASS', 'Address updated successfully', updateAddressResult.responseTime);
    } else {
      logTest(`/api/v2/addresses/:id`, 'PUT', 'FAIL', `Failed: ${JSON.stringify(updateAddressResult.error)}`, updateAddressResult.responseTime);
    }
  } else {
    logTest(`/api/v2/addresses/:id`, 'PUT', 'SKIP', 'Skipped - no address ID');
  }
  
  // Test 3.4: Delete address
  if (authToken && testAddressId) {
    const deleteAddressResult = await apiCall('DELETE', `/api/v2/addresses/${testAddressId}`, null, { Authorization: `Bearer ${authToken}` });
    
    if (deleteAddressResult.success) {
      logTest(`/api/v2/addresses/:id`, 'DELETE', 'PASS', 'Address deleted successfully', deleteAddressResult.responseTime);
    } else {
      logTest(`/api/v2/addresses/:id`, 'DELETE', 'FAIL', `Failed: ${JSON.stringify(deleteAddressResult.error)}`, deleteAddressResult.responseTime);
    }
  } else {
    logTest(`/api/v2/addresses/:id`, 'DELETE', 'SKIP', 'Skipped - no address ID');
  }
  
  // ==================== 4. WALLET ENDPOINTS ====================
  console.log('\n💰 4. WALLET ENDPOINTS\n');
  
  // Test 4.1: Get wallet
  if (authToken) {
    const walletResult = await apiCall('GET', '/api/v2/wallet', null, { Authorization: `Bearer ${authToken}` });
    
    if (walletResult.success) {
      logTest('/api/v2/wallet', 'GET', 'PASS', `Wallet balance: ${walletResult.data.data?.balance || 0} SAR`, walletResult.responseTime);
    } else {
      logTest('/api/v2/wallet', 'GET', 'FAIL', `Failed: ${JSON.stringify(walletResult.error)}`, walletResult.responseTime);
    }
  } else {
    logTest('/api/v2/wallet', 'GET', 'SKIP', 'Skipped - no auth token');
  }
  
  // ==================== 5. REFERRAL ENDPOINTS ====================
  console.log('\n🔗 5. REFERRAL ENDPOINTS\n');
  
  // Test 5.1: Get referral stats
  if (authToken) {
    const referralStatsResult = await apiCall('GET', '/api/v2/referrals/stats', null, { Authorization: `Bearer ${authToken}` });
    
    if (referralStatsResult.success) {
      logTest('/api/v2/referrals/stats', 'GET', 'PASS', 'Referral stats retrieved', referralStatsResult.responseTime);
    } else {
      logTest('/api/v2/referrals/stats', 'GET', 'FAIL', `Failed: ${JSON.stringify(referralStatsResult.error)}`, referralStatsResult.responseTime);
    }
  } else {
    logTest('/api/v2/referrals/stats', 'GET', 'SKIP', 'Skipped - no auth token');
  }
  
  // Test 5.2: Get share link
  if (authToken) {
    const shareLinkResult = await apiCall('GET', '/api/v2/referrals/share-link', null, { Authorization: `Bearer ${authToken}` });
    
    if (shareLinkResult.success) {
      logTest('/api/v2/referrals/share-link', 'GET', 'PASS', 'Share link generated', shareLinkResult.responseTime);
    } else {
      logTest('/api/v2/referrals/share-link', 'GET', 'FAIL', `Failed: ${JSON.stringify(shareLinkResult.error)}`, shareLinkResult.responseTime);
    }
  } else {
    logTest('/api/v2/referrals/share-link', 'GET', 'SKIP', 'Skipped - no auth token');
  }
  
  // ==================== 6. SERVICE ENDPOINTS ====================
  console.log('\n🛠️ 6. SERVICE ENDPOINTS\n');
  
  // Test 6.1: Get service categories
  const categoriesResult = await apiCall('GET', '/api/v2/services/categories');
  
  if (categoriesResult.success) {
    const categoryCount = categoriesResult.data.data?.length || 0;
    logTest('/api/v2/services/categories', 'GET', 'PASS', `Retrieved ${categoryCount} categories`, categoriesResult.responseTime);
    
    // Test 6.2: Get services by category
    if (categoryCount > 0) {
      const firstCategory = categoriesResult.data.data[0];
      const servicesResult = await apiCall('GET', `/api/v2/services/categories/${firstCategory.id}/services`);
      
      if (servicesResult.success) {
        logTest('/api/v2/services/categories/:categoryId/services', 'GET', 'PASS', `Retrieved ${servicesResult.data.data?.length || 0} services`, servicesResult.responseTime);
      } else {
        logTest('/api/v2/services/categories/:categoryId/services', 'GET', 'FAIL', `Failed: ${JSON.stringify(servicesResult.error)}`, servicesResult.responseTime);
      }
    }
  } else {
    logTest('/api/v2/services/categories', 'GET', 'FAIL', `Failed: ${JSON.stringify(categoriesResult.error)}`, categoriesResult.responseTime);
  }
  
  // ==================== 7. SUBSCRIPTION PACKAGES ====================
  console.log('\n📦 7. SUBSCRIPTION PACKAGE ENDPOINTS\n');
  
  // Test 7.1: Get all packages
  const packagesResult = await apiCall('GET', '/api/v2/subscription-packages');
  
  if (packagesResult.success) {
    const packageCount = packagesResult.data.data?.length || 0;
    logTest('/api/v2/subscription-packages', 'GET', 'PASS', `Retrieved ${packageCount} packages`, packagesResult.responseTime);
    
    // Test 7.2: Get package by ID
    if (packageCount > 0) {
      const firstPackage = packagesResult.data.data[0];
      const packageDetailResult = await apiCall('GET', `/api/v2/subscription-packages/${firstPackage.id}`);
      
      if (packageDetailResult.success) {
        logTest('/api/v2/subscription-packages/:id', 'GET', 'PASS', 'Package details retrieved', packageDetailResult.responseTime);
      } else {
        logTest('/api/v2/subscription-packages/:id', 'GET', 'FAIL', `Failed: ${JSON.stringify(packageDetailResult.error)}`, packageDetailResult.responseTime);
      }
    }
  } else {
    logTest('/api/v2/subscription-packages', 'GET', 'FAIL', `Failed: ${JSON.stringify(packagesResult.error)}`, packagesResult.responseTime);
  }
  
  // ==================== 8. SPARE PARTS ====================
  console.log('\n🔧 8. SPARE PARTS ENDPOINTS\n');
  
  const sparePartsResult = await apiCall('GET', '/api/v2/spare-parts');
  
  if (sparePartsResult.success) {
    logTest('/api/v2/spare-parts', 'GET', 'PASS', `Retrieved ${sparePartsResult.data.data?.length || 0} spare parts`, sparePartsResult.responseTime);
  } else {
    logTest('/api/v2/spare-parts', 'GET', 'FAIL', `Failed: ${JSON.stringify(sparePartsResult.error)}`, sparePartsResult.responseTime);
  }
  
  // ==================== 9. CREDITS ====================
  console.log('\n💳 9. CREDIT ENDPOINTS\n');
  
  // Test 9.1: Get credit balance
  if (authToken) {
    const creditBalanceResult = await apiCall('GET', '/api/v2/credits/balance', null, { Authorization: `Bearer ${authToken}` });
    
    if (creditBalanceResult.success) {
      logTest('/api/v2/credits/balance', 'GET', 'PASS', `Credit balance retrieved`, creditBalanceResult.responseTime);
    } else {
      logTest('/api/v2/credits/balance', 'GET', 'FAIL', `Failed: ${JSON.stringify(creditBalanceResult.error)}`, creditBalanceResult.responseTime);
    }
  } else {
    logTest('/api/v2/credits/balance', 'GET', 'SKIP', 'Skipped - no auth token');
  }
  
  // Test 9.2: Get credit history
  if (authToken) {
    const creditHistoryResult = await apiCall('GET', '/api/v2/credits/history', null, { Authorization: `Bearer ${authToken}` });
    
    if (creditHistoryResult.success) {
      logTest('/api/v2/credits/history', 'GET', 'PASS', `Retrieved ${creditHistoryResult.data.data?.transactions?.length || 0} transactions`, creditHistoryResult.responseTime);
    } else {
      logTest('/api/v2/credits/history', 'GET', 'FAIL', `Failed: ${JSON.stringify(creditHistoryResult.error)}`, creditHistoryResult.responseTime);
    }
  } else {
    logTest('/api/v2/credits/history', 'GET', 'SKIP', 'Skipped - no auth token');
  }
  
  // ==================== 10. SUPPORT ====================
  console.log('\n💬 10. SUPPORT ENDPOINTS\n');
  
  // Test 10.1: Get FAQs (public)
  const faqsResult = await apiCall('GET', '/api/v2/support/faqs');
  
  if (faqsResult.success) {
    logTest('/api/v2/support/faqs', 'GET', 'PASS', `Retrieved ${faqsResult.data.data?.length || 0} FAQs`, faqsResult.responseTime);
  } else {
    logTest('/api/v2/support/faqs', 'GET', 'FAIL', `Failed: ${JSON.stringify(faqsResult.error)}`, faqsResult.responseTime);
  }
  
  // Test 10.2: Get support tickets
  if (authToken) {
    const ticketsResult = await apiCall('GET', '/api/v2/support/tickets', null, { Authorization: `Bearer ${authToken}` });
    
    if (ticketsResult.success) {
      logTest('/api/v2/support/tickets', 'GET', 'PASS', `Retrieved ${ticketsResult.data.data?.length || 0} tickets`, ticketsResult.responseTime);
    } else {
      logTest('/api/v2/support/tickets', 'GET', 'FAIL', `Failed: ${JSON.stringify(ticketsResult.error)}`, ticketsResult.responseTime);
    }
  } else {
    logTest('/api/v2/support/tickets', 'GET', 'SKIP', 'Skipped - no auth token');
  }
  
  // Test 10.3: Create support ticket
  if (authToken) {
    const createTicketResult = await apiCall('POST', '/api/v2/support/tickets', {
      subject: 'Test Ticket',
      message: 'This is a test support ticket',
      category: 'general',
    }, { Authorization: `Bearer ${authToken}` });
    
    if (createTicketResult.success) {
      testTicketId = createTicketResult.data.data?.id || '';
      logTest('/api/v2/support/tickets', 'POST', 'PASS', 'Support ticket created', createTicketResult.responseTime);
    } else {
      logTest('/api/v2/support/tickets', 'POST', 'FAIL', `Failed: ${JSON.stringify(createTicketResult.error)}`, createTicketResult.responseTime);
    }
  } else {
    logTest('/api/v2/support/tickets', 'POST', 'SKIP', 'Skipped - no auth token');
  }
  
  // ==================== 11. APP CONFIG ====================
  console.log('\n⚙️ 11. APP CONFIG ENDPOINTS\n');
  
  const appConfigResult = await apiCall('GET', '/api/v2/app/config');
  
  if (appConfigResult.success) {
    logTest('/api/v2/app/config', 'GET', 'PASS', 'App config retrieved', appConfigResult.responseTime);
  } else {
    logTest('/api/v2/app/config', 'GET', 'FAIL', `Failed: ${JSON.stringify(appConfigResult.error)}`, appConfigResult.responseTime);
  }
  
  // ==================== GENERATE REPORT ====================
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 TEST SUMMARY REPORT\n');
  
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const skipped = testResults.filter(r => r.status === 'SKIP').length;
  const total = testResults.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed} (${((passed/total) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failed} (${((failed/total) * 100).toFixed(1)}%)`);
  console.log(`⏭️ Skipped: ${skipped} (${((skipped/total) * 100).toFixed(1)}%)`);
  
  // Average response time
  const responseTimes = testResults.filter(r => r.responseTime).map(r => r.responseTime!);
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  console.log(`\n⏱️ Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
  
  // Failed tests details
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:\n');
    testResults.filter(r => r.status === 'FAIL').forEach(test => {
      console.log(`   ${test.method} ${test.endpoint}`);
      console.log(`   └─ ${test.message}\n`);
    });
  }
  
  // Performance concerns
  const slowTests = testResults.filter(r => r.responseTime && r.responseTime > 1000);
  if (slowTests.length > 0) {
    console.log('\n⚠️ SLOW ENDPOINTS (>1s):\n');
    slowTests.forEach(test => {
      console.log(`   ${test.method} ${test.endpoint} - ${test.responseTime}ms`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Export results to JSON
  const report = {
    summary: {
      total,
      passed,
      failed,
      skipped,
      passRate: `${((passed/total) * 100).toFixed(1)}%`,
      avgResponseTime: `${avgResponseTime.toFixed(0)}ms`,
    },
    tests: testResults,
    timestamp: new Date().toISOString(),
  };
  
  return report;
}

// Run tests
runTests().then(report => {
  console.log('\n✅ Testing complete!\n');
  process.exit(report.summary.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('\n❌ Testing failed with error:', error);
  process.exit(1);
});

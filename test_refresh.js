const axios = require('axios');

// Test configuration
const API_BASE = 'http://localhost:3000/v1';
const TEST_USER = {
  email: 'admin@example.com',
  password: 'password'
};

async function testRefreshEndpoint() {
  try {
    console.log('🔄 Testing JWT Refresh Endpoint...\n');

    // Step 1: Login to get initial token
    console.log('1. Logging in to get initial token...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, TEST_USER);
    
    const initialToken = loginResponse.data.token;
    const user = loginResponse.data.user;
    
    console.log('✅ Login successful');
    console.log(`   User: ${user.name} (${user.email})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Token: ${initialToken.substring(0, 20)}...`);

    // Step 2: Test the refresh endpoint
    console.log('\n2. Testing refresh endpoint...');
    const refreshResponse = await axios.post(
      `${API_BASE}/auth/refresh`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${initialToken}`
        }
      }
    );

    const newToken = refreshResponse.data.token;
    const refreshedUser = refreshResponse.data.user;

    console.log('✅ Token refresh successful');
    console.log(`   New token: ${newToken.substring(0, 20)}...`);
    console.log(`   User: ${refreshedUser.name} (${refreshedUser.email})`);
    console.log(`   Tokens are different: ${initialToken !== newToken}`);

    // Step 3: Verify the new token works
    console.log('\n3. Verifying new token works...');
    const meResponse = await axios.get(`${API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${newToken}`
      }
    });

    console.log('✅ New token verification successful');
    console.log(`   Current user: ${meResponse.data.name} (${meResponse.data.email})`);

    console.log('\n🎉 All tests passed! The refresh endpoint is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      console.log('\n💡 Note: If you see 429 errors, the rate limiting is working.');
      console.log('   Try again after a few seconds.');
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the backend server is running on port 3000');
      console.log('   Run: npm start');
    }
  }
}

// Run the test
testRefreshEndpoint();
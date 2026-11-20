// Test Users API Endpoint
const fetch = require('node-fetch');

async function testUsersAPI() {
    try {
        console.log('Testing /api/health endpoint...');
        const healthResponse = await fetch('http://localhost:5000/api/health');
        const healthData = await healthResponse.json();
        console.log('Health check:', healthData);

        console.log('\nTesting /api/users endpoint without auth...');
        const usersResponse = await fetch('http://localhost:5000/api/users');
        console.log('Users response status:', usersResponse.status);
        const usersData = await usersResponse.json();
        console.log('Users response:', usersData);

        // Test with a fake token to see the error
        console.log('\nTesting /api/users with fake auth...');
        const authResponse = await fetch('http://localhost:5000/api/users', {
            headers: {
                'Authorization': 'Bearer fake-token'
            }
        });
        console.log('Auth response status:', authResponse.status);
        const authData = await authResponse.json();
        console.log('Auth response:', authData);

    } catch (error) {
        console.error('Test error:', error);
    }
}

testUsersAPI();

const axios = require('axios');

async function testAPI() {
    try {
        console.log('Testing connection to http://localhost:5000/api/books...');
        // Note: This won't work without a token, but it should at least return 401 or 403, NOT a connection error.
        const response = await axios.get('http://localhost:5000/api/books').catch(err => err.response);
        
        if (response) {
            console.log('Status:', response.status);
            console.log('Data:', response.data);
        } else {
            console.log('No response received from server.');
        }
    } catch (error) {
        console.error('Connection failed:', error.message);
    }
}

testAPI();

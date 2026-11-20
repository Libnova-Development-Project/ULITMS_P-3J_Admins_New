const jwt = require('jsonwebtoken');
require('dotenv').config();

// Create a mock admin token
const token = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET || 'your-secret-key');
console.log('Mock Admin Token:', token);

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/books',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

console.log('Sending request with token to http://localhost:5000/api/books...');

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('BODY:', data.substring(0, 200) + '...');
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});

req.end();

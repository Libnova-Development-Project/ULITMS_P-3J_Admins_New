const http = require('http');

function test() {
  console.log('Sending request to http://localhost:5000/api/books...');
  const req = http.get('http://localhost:5000/api/books', (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('BODY:', data.substring(0, 100) + '...');
      process.exit(0);
    });
  });

  req.on('error', (e) => {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  });

  // Timeout after 5 seconds
  setTimeout(() => {
    console.error('TIMED OUT after 5 seconds');
    process.exit(1);
  }, 5000);
}

test();

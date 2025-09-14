// test-api.js - простой тест API сервера
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth?action=oauth',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  res.on('data', (chunk) => {
    console.log(`Body: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
  console.log('API сервер, вероятно, не запущен!');
});

req.write(JSON.stringify({ idToken: 'test' }));
req.end();
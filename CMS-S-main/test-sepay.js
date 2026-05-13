const https = require('https');

const options = {
  hostname: 'my.sepay.vn',
  path: '/userapi/transactions/list',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer FEAAGOAUI2ELST5FCDX3TKRVTYJGU7QPGYJ3MCDVHG8LM2W9HELR6NCV0PZVJHOC',
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(JSON.stringify(JSON.parse(data), null, 2));
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.end();

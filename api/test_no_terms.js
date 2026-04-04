const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/demo-invoice/modern',
  method: 'GET',
};

// we can just curl it. Oh wait, the demo-invoice endpoint always uses the mock data which now has terms.

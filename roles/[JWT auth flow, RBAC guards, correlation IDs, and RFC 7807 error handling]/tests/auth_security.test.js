const assert = require('node:assert/strict');
const test = require('node:test');
const supertest = require('C:/Users/ADMIN/Downloads/BEA HMS 2.0/Hospital-Management-System-main/Hospital-Management-System-main/server/node_modules/supertest');
const { app } = require('C:/Users/ADMIN/Downloads/BEA HMS 2.0/Hospital-Management-System-main/Hospital-Management-System-main/server/server.js');

let adminToken;
let receptionistToken;

async function request(method, path, { body, token } = {}) {
  let req = supertest(app)[method.toLowerCase()](path);
  if (token) req = req.set('Authorization', `Bearer ${token}`);
  if (body !== undefined) req = req.send(body);
  const res = await req;
  return { status: res.status, body: res.body };
}

test.before(async () => {
  const adminRes = await request('POST', '/api/v1/auth/login', { body: { email: 'admin@bea-hms.com', password: 'Admin@123' } });
  adminToken = adminRes.body.accessToken;
  const receptRes = await request('POST', '/api/v1/auth/login', { body: { email: 'receptionist@bea-hms.com', password: 'Recept@123' } });
  receptionistToken = receptRes.body.accessToken;
});

test('FR-02: invalid login returns RFC 7807 validation response', async () => {
  const response = await request('POST', '/api/v1/auth/login', { body: { email: 'admin@bea-hms.com' } });
  assert.equal(response.status, 400);
  assert.equal(response.body.title, 'Bad Request');
});

test('TC-09 API security: protected patient route rejects a missing bearer token', async () => {
  const response = await request('GET', '/api/v1/patients');
  assert.equal(response.status, 401);
  assert.equal(response.body.title, 'Unauthorized');
});

test('TC-10 API validation: patient registration requires both name and date of birth', async () => {
  const response = await request('POST', '/api/v1/patients', {
    token: receptionistToken,
    body: { name: 'Missing Date of Birth' }
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.title, 'Validation Failed');
});

test('TC-11 API validation: patient registration rejects malformed email address', async () => {
  const response = await request('POST', '/api/v1/patients', {
    token: receptionistToken,
    body: { name: 'Invalid Email', dateOfBirth: '2000-01-01', email: 'invalid-email' }
  });
  assert.equal(response.status, 400);
  assert.match(response.body.detail, /email/i);
});

test('TC-12 API validation: administrator cannot create an unsupported user role', async () => {
  const response = await request('POST', '/api/v1/users', {
    token: adminToken,
    body: { name: 'Invalid Role', email: 'invalid.role@example.com', password: 'Secure@123', role: 'VISITOR' }
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.title, 'Validation Failed');
});

test('TC-13 API security: receptionist cannot create administrative users', async () => {
  const response = await request('POST', '/api/v1/users', {
    token: receptionistToken,
    body: { name: 'Blocked User', email: 'blocked.user@example.com', password: 'Secure@123', role: 'ADMIN' }
  });
  assert.equal(response.status, 403);
});

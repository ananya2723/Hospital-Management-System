const assert = require('node:assert/strict');
const test = require('node:test');
const supertest = require('C:/Users/ADMIN/Downloads/BEA HMS 2.0/Hospital-Management-System-main/Hospital-Management-System-main/server/node_modules/supertest');
const { app } = require('C:/Users/ADMIN/Downloads/BEA HMS 2.0/Hospital-Management-System-main/Hospital-Management-System-main/server/server.js');

let adminToken;
let createdBill;

async function request(method, path, { body, token, headers = {} } = {}) {
  let req = supertest(app)[method.toLowerCase()](path);
  if (token) req = req.set('Authorization', `Bearer ${token}`);
  Object.entries(headers).forEach(([k, v]) => { req = req.set(k, v); });
  if (body !== undefined) req = req.send(body);
  const res = await req;
  return { status: res.status, body: res.body };
}

test.before(async () => {
  const adminRes = await request('POST', '/api/v1/auth/login', { body: { email: 'admin@bea-hms.com', password: 'Admin@123' } });
  adminToken = adminRes.body.accessToken;
});

test('FR-08: billing is idempotent and rejects overpayment', async () => {
  const bill = await request('POST', '/api/v1/bills', {
    token: adminToken,
    body: { patientId: 'p-101', patientName: 'Rajesh Kumar', items: [{ description: 'Lab & Diagnostic Suite', amount: 500 }] }
  });
  assert.equal(bill.status, 201);
  createdBill = bill.body;

  // Overpayment rejection
  const overpayment = await request('POST', `/api/v1/bills/${createdBill.id}/pay`, {
    token: adminToken,
    headers: { 'Idempotency-Key': 'overpay-key-1' },
    body: { amount: 600 }
  });
  assert.equal(overpayment.status, 400);

  // Initial valid payment
  const first = await request('POST', `/api/v1/bills/${createdBill.id}/pay`, {
    token: adminToken,
    headers: { 'Idempotency-Key': 'payment-key-1' },
    body: { amount: 500, paymentMethod: 'UPI' }
  });
  assert.equal(first.status, 201);
  assert.equal(first.body.isDuplicateReplay, false);

  // Idempotent duplicate replay
  const replay = await request('POST', `/api/v1/bills/${createdBill.id}/pay`, {
    token: adminToken,
    headers: { 'Idempotency-Key': 'payment-key-1' },
    body: { amount: 500 }
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.isDuplicateReplay, true);
});

test('TC-15 API validation: payment requires an idempotency key', async () => {
  const response = await request('POST', '/api/v1/bills/bill-001/pay', {
    token: adminToken,
    body: { amount: 1 }
  });
  assert.equal(response.status, 400);
  assert.match(response.body.detail, /Idempotency-Key/);
});

test('TC-17 API integration: administrator can retrieve KPI reporting data', async () => {
  const response = await request('GET', '/api/v1/reports/kpis', { token: adminToken });
  assert.equal(response.status, 200);
  assert.equal(typeof response.body.totalRevenue, 'number');
  assert.equal(typeof response.body.totalPatients, 'number');
});

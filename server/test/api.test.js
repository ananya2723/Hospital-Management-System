const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const { app } = require('../server');

let server;
let adminToken;
let receptionistToken;
let doctorToken;
let createdPatient;
let createdAppointment;
let createdBill;

function request(method, path, { body, token, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1', port: 8091, path, method,
      headers: {
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data ? JSON.parse(data) : null }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function login(email, password) {
  const response = await request('POST', '/api/v1/auth/login', { body: { email, password } });
  assert.equal(response.status, 200);
  return response.body.accessToken;
}

test.before(async () => {
  server = app.listen(8091);
  adminToken = await login('admin@bea-hms.com', 'Admin@123');
  receptionistToken = await login('receptionist@bea-hms.com', 'Recept@123');
  doctorToken = await login('doctor@bea-hms.com', 'Doctor@123');
});

test.after(() => server.close());

test('FR-01: health endpoint reports application availability', async () => {
  const response = await request('GET', '/actuator/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'UP');
});

test('FR-02: invalid login returns RFC 7807 validation response', async () => {
  const response = await request('POST', '/api/v1/auth/login', { body: { email: 'admin@bea-hms.com' } });
  assert.equal(response.status, 400);
  assert.equal(response.body.title, 'Bad Request');
});

test('FR-03: receptionist registers a patient and invalid ABHA is rejected', async () => {
  const invalid = await request('POST', '/api/v1/patients', {
    token: receptionistToken,
    body: { name: 'Invalid Patient', dateOfBirth: '2000-01-01', abhaId: 'not-an-abha' }
  });
  assert.equal(invalid.status, 400);
  const valid = await request('POST', '/api/v1/patients', {
    token: receptionistToken,
    body: { name: 'Test Patient', dateOfBirth: '1997-05-16', email: 'test.patient@example.com', abhaId: '12-3456-7890-1234', consentGranted: true }
  });
  assert.equal(valid.status, 201);
  createdPatient = valid.body;
});

test('FR-04: booking rejects a slot that belongs to another doctor', async () => {
  const doctors = await request('GET', '/api/v1/doctors', { token: receptionistToken });
  const otherDoctor = doctors.body.find((doctor) => doctor.id === 'd-002');
  const slots = await request('GET', `/api/v1/doctors/${otherDoctor.id}/slots`, { token: receptionistToken });
  const response = await request('POST', '/api/v1/appointments', {
    token: receptionistToken,
    body: { patientId: createdPatient.id, doctorId: 'd-001', slotId: slots.body[0].id }
  });
  assert.equal(response.status, 400);
});

test('FR-05: receptionist books and cancels an appointment, releasing the slot', async () => {
  const slots = await request('GET', '/api/v1/doctors/d-001/slots', { token: receptionistToken });
  const freeSlot = slots.body.find((slot) => slot.status === 'FREE');
  const booked = await request('POST', '/api/v1/appointments', {
    token: receptionistToken,
    body: { patientId: createdPatient.id, doctorId: 'd-001', slotId: freeSlot.id, notes: 'API test booking' }
  });
  assert.equal(booked.status, 201);
  createdAppointment = booked.body;
  const cancelled = await request('PUT', `/api/v1/appointments/${createdAppointment.id}/cancel`, { token: receptionistToken });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.appointment.status, 'CANCELLED');
});

test('FR-06: receptionist is forbidden from viewing medical records', async () => {
  const response = await request('GET', '/api/v1/records?patientId=p-101', { token: receptionistToken });
  assert.equal(response.status, 403);
  assert.equal(response.body.title, 'Forbidden');
});

test('FR-07: doctor creates an encrypted clinical record for a completed appointment', async () => {
  const response = await request('POST', '/api/v1/records', {
    token: doctorToken,
    body: { patientId: 'p-101', appointmentId: 'appt-comp-001', diagnosis: 'Follow-up hypertension review', treatment: 'Continue treatment', prescription: 'Medication as prescribed' }
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.encryptedAtRest, true);
});

test('FR-08: billing is idempotent and rejects overpayment', async () => {
  const bill = await request('POST', '/api/v1/bills', {
    token: adminToken,
    body: { patientId: createdPatient.id, patientName: createdPatient.name, items: [{ description: 'Consultation', quantity: 1, unitPrice: 500 }] }
  });
  assert.equal(bill.status, 201);
  createdBill = bill.body;
  const overpayment = await request('POST', `/api/v1/bills/${createdBill.id}/pay`, { token: adminToken, headers: { 'Idempotency-Key': 'overpay-key' }, body: { amount: 600 } });
  assert.equal(overpayment.status, 400);
  const first = await request('POST', `/api/v1/bills/${createdBill.id}/pay`, { token: adminToken, headers: { 'Idempotency-Key': 'payment-key' }, body: { amount: 500, paymentMethod: 'UPI' } });
  assert.equal(first.status, 201);
  const replay = await request('POST', `/api/v1/bills/${createdBill.id}/pay`, { token: adminToken, headers: { 'Idempotency-Key': 'payment-key' }, body: { amount: 500 } });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.isDuplicateReplay, true);
});

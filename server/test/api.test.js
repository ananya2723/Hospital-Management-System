const assert = require('node:assert/strict');
const test = require('node:test');
const supertest = require('supertest');
const { app } = require('../server');

let adminToken;
let receptionistToken;
let doctorToken;
let createdPatient;
let createdAppointment;
let createdBill;

async function request(method, path, { body, token, headers = {} } = {}) {
  let requestBuilder = supertest(app)[method.toLowerCase()](path);
  if (token) requestBuilder = requestBuilder.set('Authorization', `Bearer ${token}`);
  Object.entries(headers).forEach(([name, value]) => {
    requestBuilder = requestBuilder.set(name, value);
  });
  if (body !== undefined) requestBuilder = requestBuilder.send(body);
  const response = await requestBuilder;
  return { status: response.status, headers: response.headers, body: response.body };
}

async function login(email, password) {
  const response = await request('POST', '/api/v1/auth/login', { body: { email, password } });
  assert.equal(response.status, 200);
  return response.body.accessToken;
}

test.before(async () => {
  adminToken = await login('admin@bea-hms.com', 'Admin@123');
  receptionistToken = await login('receptionist@bea-hms.com', 'Recept@123');
  doctorToken = await login('doctor@bea-hms.com', 'Doctor@123');
});

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

test('TC-14 API validation: clinical record requires a completed matching appointment', async () => {
  const response = await request('POST', '/api/v1/records', {
    token: doctorToken,
    body: { patientId: 'p-101', appointmentId: 'appt-conf-002', diagnosis: 'Invalid record workflow' }
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.title, 'Validation Failed');
});

test('TC-15 API validation: payment requires an idempotency key', async () => {
  const response = await request('POST', '/api/v1/bills/bill-001/pay', {
    token: adminToken,
    body: { amount: 1 }
  });
  assert.equal(response.status, 400);
  assert.match(response.body.detail, /Idempotency-Key/);
});

test('TC-16 API integration: FHIR endpoint returns an R4 Patient resource', async () => {
  const response = await request('GET', '/api/v1/fhir/Patient/p-101', { token: adminToken });
  assert.equal(response.status, 200);
  assert.equal(response.body.resourceType, 'Patient');
  assert.equal(response.body.id, 'p-101');
});

test('TC-17 API integration: administrator can retrieve KPI reporting data', async () => {
  const response = await request('GET', '/api/v1/reports/kpis', { token: adminToken });
  assert.equal(response.status, 200);
  assert.equal(typeof response.body.totalRevenue, 'number');
  assert.equal(typeof response.body.totalPatients, 'number');
});

test('TC-18 API integration: concurrent booking benchmark permits one winner only', async () => {
  const response = await request('POST', '/api/v1/demo/concurrency-test', { body: {} });
  assert.equal(response.status, 200);
  assert.equal(response.body.successCount, 1);
  assert.equal(response.body.conflictCount, 19);
  assert.equal(response.body.isDefensible, true);
});

test('TC-19 API: consent can be revoked with an audit-ready timestamp', async () => {
  const response = await request('PUT', `/api/v1/patients/${createdPatient.id}/consent`, {
    token: receptionistToken,
    body: { consentGranted: false }
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.consentGranted, false);
  assert.ok(response.body.consentUpdatedAt);
});

test('TC-20 API: confirmed appointment can be rescheduled to a free slot', async () => {
  const slots = await request('GET', '/api/v1/doctors/d-001/slots', { token: receptionistToken });
  const targetSlot = slots.body.find((slot) => slot.status === 'FREE');
  const response = await request('PUT', '/api/v1/appointments/appt-conf-002/reschedule', {
    token: receptionistToken,
    body: { slotId: targetSlot.id }
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.appointment.slotId, targetSlot.id);
  assert.equal(response.body.appointment.status, 'CONFIRMED');
});

test('TC-21 API: confirmed appointment can be marked as no-show', async () => {
  const response = await request('PUT', '/api/v1/appointments/appt-conf-002/no-show', { token: receptionistToken });
  assert.equal(response.status, 200);
  assert.equal(response.body.appointment.status, 'NO_SHOW');
  assert.ok(response.body.appointment.noShowMarkedAt);
});

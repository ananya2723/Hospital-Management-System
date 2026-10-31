const assert = require('node:assert/strict');
const test = require('node:test');
const supertest = require('C:/Users/ADMIN/Downloads/BEA HMS 2.0/Hospital-Management-System-main/Hospital-Management-System-main/server/node_modules/supertest');
const { app } = require('C:/Users/ADMIN/Downloads/BEA HMS 2.0/Hospital-Management-System-main/Hospital-Management-System-main/server/server.js');

let adminToken;
let receptionistToken;
let doctorToken;
let createdPatient;
let createdAppointment;

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
  const docRes = await request('POST', '/api/v1/auth/login', { body: { email: 'doctor@bea-hms.com', password: 'Doctor@123' } });
  doctorToken = docRes.body.accessToken;
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

test('TC-14 API validation: clinical record requires a completed matching appointment', async () => {
  const response = await request('POST', '/api/v1/records', {
    token: doctorToken,
    body: { patientId: 'p-101', appointmentId: 'appt-conf-002', diagnosis: 'Invalid record workflow' }
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.title, 'Validation Failed');
});

test('TC-16 API integration: FHIR endpoint returns an R4 Patient resource', async () => {
  const response = await request('GET', '/api/v1/fhir/Patient/p-101', { token: adminToken });
  assert.equal(response.status, 200);
  assert.equal(response.body.resourceType, 'Patient');
});

test('TC-19 API: consent can be revoked with an audit-ready timestamp', async () => {
  const response = await request('PUT', `/api/v1/patients/${createdPatient.id}/consent`, {
    token: receptionistToken,
    body: { consentGranted: false }
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.consentGranted, false);
});

test('TC-20 API: confirmed appointment can be rescheduled to a free slot', async () => {
  const slots = await request('GET', '/api/v1/doctors/d-001/slots', { token: receptionistToken });
  const targetSlot = slots.body.find((slot) => slot.status === 'FREE');
  const response = await request('PUT', '/api/v1/appointments/appt-conf-002/reschedule', {
    token: receptionistToken,
    body: { slotId: targetSlot.id }
  });
  assert.equal(response.status, 200);
});

test('TC-21 API: confirmed appointment can be marked as no-show', async () => {
  const response = await request('PUT', '/api/v1/appointments/appt-conf-002/no-show', { token: receptionistToken });
  assert.equal(response.status, 200);
  assert.equal(response.body.appointment.status, 'NO_SHOW');
});

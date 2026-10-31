// Role 3: Appointment Scheduling, Atomic Slots, Encrypted EMR & FHIR R4
// Extracted from server/server.js

const crypto = require('node:crypto');

// 1. AES-256-GCM Sensitive Field Encryption at Rest
const ENCRYPTION_KEY = Buffer.from(
  (process.env.ENCRYPTION_KEY || 'bea-hms-clinical-aes256-secret-key-32b').slice(0, 32),
  'utf-8'
);

function encryptAesGcm(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(12); // 96-bit standard IV
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(String(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex'); // 128-bit authentication tag
  return Buffer.from(JSON.stringify({ iv: iv.toString('hex'), authTag, ciphertext: encrypted })).toString('base64');
}

function decryptAesGcm(base64Payload) {
  if (!base64Payload) return base64Payload;
  try {
    const raw = Buffer.from(base64Payload, 'base64').toString('utf8');
    const { iv, authTag, ciphertext } = JSON.parse(raw);
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return '[Decryption Error / Tampered Payload]';
  }
}

// 2. Atomic Slot Reservation & Release Algorithms
function atomicReserveSlot(slotId, db) {
  const slot = db.doctorSlots.find(s => s.id === slotId);
  if (!slot) return { success: false, reason: 'NOT_FOUND' };
  if (slot.status !== 'FREE') {
    return { success: false, reason: 'SLOT_UNAVAILABLE' };
  }
  slot.status = 'RESERVED';
  return { success: true, slot };
}

function atomicReleaseSlot(slotId, db) {
  const slot = db.doctorSlots.find(s => s.id === slotId);
  if (!slot) return { success: false, reason: 'NOT_FOUND' };
  slot.status = 'FREE';
  return { success: true, slot };
}

// 3. Appointment Lifecycle Workflow Handlers
function registerAppointmentRoutes(app, db, authenticateToken, requireRole, sendRfc7807) {
  // Book Appointment
  app.post('/api/v1/appointments', authenticateToken, requireRole('ADMIN', 'RECEPTIONIST'), (req, res) => {
    const { patientId, doctorId, slotId, notes } = req.body;
    const patient = db.patients.find(p => p.id === patientId && !p.deletedAt);
    if (!patient) return sendRfc7807(res, 400, 'Bad Request', 'Patient not found', req);

    const doctor = db.doctors.find(d => d.id === doctorId);
    if (!doctor) return sendRfc7807(res, 400, 'Bad Request', 'Doctor not found', req);

    const slot = db.doctorSlots.find(s => s.id === slotId);
    if (!slot || slot.doctorId !== doctorId) {
      return sendRfc7807(res, 400, 'Bad Request', 'Slot does not belong to the selected doctor', req);
    }

    const reservation = atomicReserveSlot(slotId, db);
    if (!reservation.success) {
      return sendRfc7807(res, 409, 'Conflict', 'Requested appointment slot is already reserved', req);
    }

    const newAppointment = {
      id: 'appt-' + crypto.randomUUID().slice(0, 8),
      patientId,
      patientName: patient.name,
      doctorId,
      doctorName: doctor.name,
      slotId,
      slotStart: slot.slotStart,
      status: 'CONFIRMED',
      notes: notes || '',
      bookedAt: new Date().toISOString()
    };
    db.appointments.unshift(newAppointment);
    res.status(201).json(newAppointment);
  });

  // Cancel Appointment
  app.put('/api/v1/appointments/:id/cancel', authenticateToken, requireRole('ADMIN', 'RECEPTIONIST'), (req, res) => {
    const appt = db.appointments.find(a => a.id === req.params.id);
    if (!appt) return sendRfc7807(res, 404, 'Not Found', 'Appointment not found', req);

    if (appt.status === 'CANCELLED' || appt.status === 'COMPLETED') {
      return sendRfc7807(res, 400, 'Invalid State Transition', `Cannot cancel appointment in '${appt.status}' state`, req);
    }

    appt.status = 'CANCELLED';
    atomicReleaseSlot(appt.slotId, db);
    res.json({ message: 'Appointment cancelled and doctor slot released', appointment: appt });
  });

  // Reschedule Appointment (Compensating workflow: reserve new before releasing old)
  app.put('/api/v1/appointments/:id/reschedule', authenticateToken, requireRole('ADMIN', 'RECEPTIONIST'), (req, res) => {
    const appt = db.appointments.find(a => a.id === req.params.id);
    if (!appt) return sendRfc7807(res, 404, 'Not Found', 'Appointment not found', req);
    if (appt.status !== 'CONFIRMED') {
      return sendRfc7807(res, 400, 'Invalid State Transition', `Cannot reschedule appointment in '${appt.status}' state`, req);
    }

    const { slotId } = req.body;
    if (!slotId || slotId === appt.slotId) {
      return sendRfc7807(res, 400, 'Validation Failed', 'A different target slotId is required', req);
    }

    const targetSlot = db.doctorSlots.find(s => s.id === slotId);
    if (!targetSlot || targetSlot.doctorId !== appt.doctorId || targetSlot.status !== 'FREE') {
      return sendRfc7807(res, 409, 'Conflict', 'Target slot is unavailable or belongs to a different doctor', req);
    }

    const reservation = atomicReserveSlot(targetSlot.id, db);
    if (!reservation.success) {
      return sendRfc7807(res, 409, 'Conflict', 'Target slot could not be reserved', req);
    }

    const previousSlotId = appt.slotId;
    atomicReleaseSlot(previousSlotId, db);

    appt.slotId = targetSlot.id;
    appt.slotStart = targetSlot.slotStart;
    appt.rescheduledAt = new Date().toISOString();

    res.json({ message: 'Appointment rescheduled and previous slot released', appointment: appt, previousSlotId });
  });

  // Mark No-Show
  app.put('/api/v1/appointments/:id/no-show', authenticateToken, requireRole('ADMIN', 'DOCTOR', 'RECEPTIONIST'), (req, res) => {
    const appt = db.appointments.find(a => a.id === req.params.id);
    if (!appt) return sendRfc7807(res, 404, 'Not Found', 'Appointment not found', req);
    if (appt.status !== 'CONFIRMED') {
      return sendRfc7807(res, 400, 'Invalid State Transition', `Cannot mark appointment in '${appt.status}' state as no-show`, req);
    }
    appt.status = 'NO_SHOW';
    appt.noShowMarkedAt = new Date().toISOString();
    res.json({ message: 'Appointment marked as no-show', appointment: appt });
  });

  // Complete Appointment
  app.put('/api/v1/appointments/:id/complete', authenticateToken, requireRole('ADMIN', 'DOCTOR'), (req, res) => {
    const appt = db.appointments.find(a => a.id === req.params.id);
    if (!appt) return sendRfc7807(res, 404, 'Not Found', 'Appointment not found', req);
    if (appt.status !== 'CONFIRMED') {
      return sendRfc7807(res, 400, 'Invalid State Transition', `Cannot complete appointment in '${appt.status}' status`, req);
    }
    appt.status = 'COMPLETED';
    res.json({ message: 'Appointment marked as COMPLETED', appointment: appt });
  });
}

module.exports = {
  encryptAesGcm,
  decryptAesGcm,
  atomicReserveSlot,
  atomicReleaseSlot,
  registerAppointmentRoutes
};

import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { 
  UserPlus, 
  Search, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  UserCheck, 
  FileCheck2, 
  Trash2,
  RefreshCw,
  Send
} from 'lucide-react';

export default function ReceptionistPortal() {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Registration Modal State
  const [showRegModal, setShowRegModal] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    dateOfBirth: '',
    gender: 'Male',
    phone: '',
    address: '',
    medicalHistory: '',
    abhaId: '',
    email: '',
    consentGranted: true
  });

  // Booking Flow State
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [bookingSagaStatus, setBookingSagaStatus] = useState(null); // 'IDLE', 'PENDING', 'CONFIRMED', 'REJECTED'
  const [bookingError, setBookingError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [patRes, docRes, apptRes] = await Promise.all([
        api.get('/patients'),
        api.get('/doctors'),
        api.get('/appointments')
      ]);
      setPatients(patRes.data.content || patRes.data);
      setDoctors(docRes.data);
      setAppointments(apptRes.data);
      if (docRes.data.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(docRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load receptionist data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch Slots when Doctor or Date changes
  useEffect(() => {
    if (selectedDoctorId && selectedDate) {
      api.get(`/doctors/${selectedDoctorId}/slots?date=${selectedDate}`)
        .then(res => setAvailableSlots(res.data.filter(s => s.status === 'FREE')))
        .catch(err => console.error('Error fetching slots', err));
    }
  }, [selectedDoctorId, selectedDate]);

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/patients', newPatient);
      setShowRegModal(false);
      setNewPatient({
        name: '',
        dateOfBirth: '',
        gender: 'Male',
        phone: '',
        address: '',
        medicalHistory: '',
        abhaId: '',
        email: '',
        consentGranted: true
      });
      fetchData();
      alert(`Patient ${res.data.name} registered successfully! DPDP Consent logged.`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to register patient');
    }
  };

  const handleSoftDelete = async (patientId, name) => {
    if (!window.confirm(`Are you sure you want to soft-delete patient ${name}? Their record will be flagged with deleted_at.`)) return;
    try {
      await api.delete(`/patients/${patientId}`);
      fetchData();
      alert(`Patient ${name} soft-deleted.`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Delete failed');
    }
  };

  // Live SAGA Booking Implementation
  const handleExecuteBookingSaga = async () => {
    if (!selectedPatient || !selectedDoctorId || !selectedSlotId) {
      alert('Please select patient, doctor and an available slot.');
      return;
    }

    setBookingError(null);
    setBookingSagaStatus('PENDING'); // Step 1: Saga begins

    try {
      // Simulate saga lifecycle delay for UI demonstration
      await new Promise(r => setTimeout(r, 600));

      const res = await api.post('/appointments', {
        patientId: selectedPatient.id,
        doctorId: selectedDoctorId,
        slotId: selectedSlotId,
        notes: 'Outpatient consultation'
      });

      setBookingSagaStatus('CONFIRMED'); // Step 2: Atomic lock success -> Confirmed
      setTimeout(() => {
        setShowBookModal(false);
        setBookingSagaStatus(null);
        setSelectedSlotId('');
        fetchData();
      }, 1200);
    } catch (err) {
      setBookingSagaStatus('REJECTED');
      setBookingError(err.response?.data?.detail || 'Slot was taken or reservation failed.');
    }
  };

  const handleCancelAppointment = async (apptId) => {
    if (!window.confirm('Cancel this appointment? The doctor slot will be released atomically.')) return;
    try {
      await api.put(`/appointments/${apptId}/cancel`);
      fetchData();
      alert('Appointment cancelled. Compensating action freed the slot in doctor-service.');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to cancel appointment');
    }
  };

  const handleMarkNoShow = async (apptId) => {
    if (!window.confirm('Mark this confirmed appointment as a no-show?')) return;
    try {
      await api.put(`/appointments/${apptId}/no-show`);
      fetchData();
      alert('Appointment marked as no-show and added to the audit trail.');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to mark appointment as no-show');
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.phone.includes(searchTerm)
  );

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1440px', margin: '0 auto' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Reception & Patient Desk</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Patient onboarding, DPDP Act 2023 compliance, slot selection, and atomic saga booking.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={fetchData} className="btn btn-secondary">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={() => setShowRegModal(true)} className="btn btn-primary">
            <UserPlus size={16} /> New Patient Registration
          </button>
        </div>
      </div>

      {/* Main Grid: Patients Directory & Appointments */}
      <div className="grid-2" style={{ alignItems: 'start', marginBottom: '32px' }}>
        {/* Left Column: Patients Directory */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Patient Registry</h3>
            <span className="badge badge-primary">{filteredPatients.length} Active Patients</span>
          </div>

          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search patient by name or phone..."
              className="form-input"
              style={{ paddingLeft: '38px' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            {filteredPatients.map(p => (
              <div 
                key={p.id}
                style={{
                  padding: '14px',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--bg-surface-elevated)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    DOB: {p.dateOfBirth} · {p.gender} · {p.phone}
                  </div>
                  {p.abhaId && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '2px' }}>
                      ABHA ID: {p.abhaId}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setSelectedPatient(p);
                      setShowBookModal(true);
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    <Calendar size={14} /> Book Slot
                  </button>
                  <button
                    onClick={() => handleSoftDelete(p.id, p.name)}
                    className="btn btn-secondary btn-sm"
                    title="Soft Delete"
                    style={{ color: 'var(--danger)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Today's Appointments & Saga State */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Appointment Queue & Status</h3>
            <span className="badge badge-accent">{appointments.length} Total</span>
          </div>

          <div style={{ maxHeight: '475px', overflowY: 'auto' }}>
            {appointments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No appointments booked yet.</p>
            ) : (
              appointments.map(a => (
                <div
                  key={a.id}
                  style={{
                    padding: '14px',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-surface-elevated)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700 }}>{a.patientName}</span>
                      <span className={`badge ${
                        a.status === 'CONFIRMED' ? 'badge-primary' :
                        a.status === 'COMPLETED' ? 'badge-success' :
                        a.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'
                      }`}>
                        {a.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Physician: {a.doctorName} · {a.slotStart ? a.slotStart.slice(11, 16) : '09:00'} hrs · Fee: ₹{a.feeAtBooking}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)' }}>
                      ID: {a.id}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {a.status === 'CONFIRMED' && (
                      <>
                        <button
                          onClick={() => handleCancelAppointment(a.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--danger)', borderColor: 'var(--danger-light)' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleMarkNoShow(a.id)}
                          className="btn btn-secondary btn-sm"
                          title="Mark patient as no-show"
                        >
                          <AlertTriangle size={14} /> No-show
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Patient Registration Modal */}
      {showRegModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px' }}>Register New Patient (DPDP Act Compliant)</h2>
            <form onSubmit={handleRegisterPatient}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Patient Name"
                    value={newPatient.name}
                    onChange={e => setNewPatient({ ...newPatient, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={newPatient.dateOfBirth}
                    onChange={e => setNewPatient({ ...newPatient, dateOfBirth: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    className="form-select"
                    value={newPatient.gender}
                    onChange={e => setNewPatient({ ...newPatient, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    className="form-input"
                    placeholder="+91 98765 43210"
                    value={newPatient.phone}
                    onChange={e => setNewPatient({ ...newPatient, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Email Address (for notifications)</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="patient@example.com"
                    value={newPatient.email}
                    onChange={e => setNewPatient({ ...newPatient, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ABHA ID (Ayushman Bharat)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="14-digit format: 91-XXXX-XXXX-XXXX"
                    value={newPatient.abhaId}
                    onChange={e => setNewPatient({ ...newPatient, abhaId: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Residential Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Street, City, Pin"
                  value={newPatient.address}
                  onChange={e => setNewPatient({ ...newPatient, address: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Known Allergies & Medical History</label>
                <textarea
                  rows={2}
                  className="form-textarea"
                  placeholder="Known allergies, existing chronic medications..."
                  value={newPatient.medicalHistory}
                  onChange={e => setNewPatient({ ...newPatient, medicalHistory: e.target.value })}
                />
              </div>

              {/* DPDP Act 2023 Consent Checkbox */}
              <div style={{
                background: 'var(--primary-light)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                marginBottom: '20px'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={newPatient.consentGranted}
                    onChange={e => setNewPatient({ ...newPatient, consentGranted: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>
                    <strong>DPDP Act 2023 Consent:</strong> Patient explicitly consents to storage and encrypted processing of medical data for clinical diagnosis and treatment purposes.
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowRegModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Register & Record Consent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Saga Modal */}
      {showBookModal && selectedPatient && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '650px' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Book Appointment Saga</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '20px' }}>
              Booking for <strong>{selectedPatient.name}</strong> ({selectedPatient.phone})
            </p>

            <div className="grid-2" style={{ marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Select Physician</label>
                <select
                  className="form-select"
                  value={selectedDoctorId}
                  onChange={e => setSelectedDoctorId(e.target.value)}
                >
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialization} · ₹{d.consultationFee})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Appointment Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                />
              </div>
            </div>

            {/* Slot Picker */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Available Time Slots (Atomic Database Lock)</label>
              {availableSlots.length === 0 ? (
                <div style={{ padding: '16px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No free slots available for this doctor on {selectedDate}. Ask the doctor to generate slots.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {availableSlots.map(s => {
                    const timeLabel = s.slotStart.slice(11, 16);
                    const isSelected = selectedSlotId === s.id;
                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => setSelectedSlotId(s.id)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                          background: isSelected ? 'var(--primary-light)' : 'var(--bg-surface-elevated)',
                          color: isSelected ? 'var(--primary-text)' : 'var(--text-main)',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        {timeLabel} hrs
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Saga Lifecycle Visualizer */}
            {bookingSagaStatus && (
              <div style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  BOOKING SAGA COORDINATOR:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`badge ${bookingSagaStatus === 'PENDING' ? 'badge-warning' : 'badge-primary'}`}>
                      1. PENDING (Requested)
                    </span>
                  </div>
                  <span>→</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`badge ${
                      bookingSagaStatus === 'CONFIRMED' ? 'badge-success' :
                      bookingSagaStatus === 'REJECTED' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      2. ATOMIC SLOT LOCK
                    </span>
                  </div>
                  <span>→</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`badge ${bookingSagaStatus === 'CONFIRMED' ? 'badge-success' : 'badge-primary'}`}>
                      3. {bookingSagaStatus === 'CONFIRMED' ? 'CONFIRMED' : 'RESULT'}
                    </span>
                  </div>
                </div>

                {bookingError && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '10px' }}>
                    ❌ {bookingError}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowBookModal(false);
                  setBookingSagaStatus(null);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedSlotId || bookingSagaStatus === 'PENDING'}
                onClick={handleExecuteBookingSaga}
                className="btn btn-primary"
              >
                {bookingSagaStatus === 'PENDING' ? 'Reserving Slot Atomically...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

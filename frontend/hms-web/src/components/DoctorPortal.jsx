import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
  Stethoscope, 
  Clock, 
  FileText, 
  ShieldCheck, 
  Lock, 
  Eye, 
  CheckCircle, 
  Calendar, 
  PlusCircle,
  AlertCircle,
  RefreshCw,
  FileCheck
} from 'lucide-react';

export default function DoctorPortal() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Clinical Consultation Inputs
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [prescription, setPrescription] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [rawDbInspect, setRawDbInspect] = useState(null);
  const [showCiphertextToggle, setShowCiphertextToggle] = useState(false);

  // Slot Generator Inputs
  const [genDate, setGenDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [intervalMin, setIntervalMin] = useState(15);
  const [genMessage, setGenMessage] = useState(null);

  const fetchDoctorData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments');
      setAppointments(res.data);
      if (res.data.length > 0 && !selectedAppt) {
        handleSelectAppointment(res.data[0]);
      }
    } catch (err) {
      console.error('Error fetching doctor appointments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorData();
  }, []);

  const handleSelectAppointment = async (appt) => {
    setSelectedAppt(appt);
    setRawDbInspect(null);
    try {
      // Fetches patient medical records (Ownership rule enforced)
      const res = await api.get(`/records?patientId=${appt.patientId}`);
      setPatientHistory(res.data);

      if (res.data.length > 0) {
        // Fetch raw DB ciphertext for the inspection demo
        const rawRes = await api.get(`/records/${res.data[0].id}/raw-db`);
        setRawDbInspect(rawRes.data);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        alert('Access Denied: Doctor-patient ownership rule prevented record access.');
      }
      setPatientHistory([]);
    }
  };

  const handleSaveConsultation = async (e) => {
    e.preventDefault();
    if (!selectedAppt) return;

    try {
      const res = await api.post('/records', {
        patientId: selectedAppt.patientId,
        appointmentId: selectedAppt.id,
        diagnosis,
        treatment,
        prescription,
        notes: clinicalNotes
      });

      // Mark appointment as COMPLETED
      await api.put(`/appointments/${selectedAppt.id}/complete`);

      alert('Clinical record saved with AES-256-GCM encryption & consultation completed! Bill generated automatically.');
      setDiagnosis('');
      setTreatment('');
      setPrescription('');
      setClinicalNotes('');
      fetchDoctorData();
      handleSelectAppointment(selectedAppt);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save record');
    }
  };

  const handleGenerateSlots = async (e) => {
    e.preventDefault();
    try {
      // Find doctor id
      const docs = await api.get('/doctors');
      const doc = docs.data[0];
      const res = await api.post(`/doctors/${doc.id}/slots/generate`, {
        date: genDate,
        startTime,
        endTime,
        intervalMinutes: Number(intervalMin)
      });
      setGenMessage(res.data.message);
      setTimeout(() => setGenMessage(null), 5000);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to generate slots');
    }
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1440px', margin: '0 auto' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Physician Clinical Workspace</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Encrypted EHR consultation, prescription management, and atomic schedule slot generation.
          </p>
        </div>
        <button onClick={fetchDoctorData} className="btn btn-secondary">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="grid-3" style={{ alignItems: 'start', marginBottom: '32px' }}>
        {/* Left Column: Appointment Queue */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Patient Queue</h3>
            <span className="badge badge-primary">{appointments.length} Consultations</span>
          </div>

          <div style={{ maxHeight: '550px', overflowY: 'auto' }}>
            {appointments.map(a => {
              const isSelected = selectedAppt?.id === a.id;
              return (
                <div
                  key={a.id}
                  onClick={() => handleSelectAppointment(a)}
                  style={{
                    padding: '14px',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                    background: isSelected ? 'var(--primary-light)' : 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '10px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{a.patientName}</span>
                    <span className={`badge ${
                      a.status === 'CONFIRMED' ? 'badge-primary' :
                      a.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'
                    }`}>
                      {a.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Time: {a.slotStart ? a.slotStart.slice(11, 16) : '09:00'} hrs · Date: {a.appointmentDate}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Fee: ₹{a.feeAtBooking} (Snapshotted at booking)
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Column: Consultation Record Editor */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          {selectedAppt ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem' }}>Consultation: {selectedAppt.patientName}</h3>
                  <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    Appointment Ref: {selectedAppt.id} · Doctor-Patient Relationship Verified
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Lock size={12} /> AES-256-GCM SECURE
                  </span>
                  {selectedAppt.status === 'CONFIRMED' && (
                    <span className="badge badge-primary">ACTIVE CONSULTATION</span>
                  )}
                </div>
              </div>

              <form onSubmit={handleSaveConsultation}>
                <div className="form-group">
                  <label className="form-label">Clinical Diagnosis * (Encrypted at rest)</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Acute Bronchitis, Type 2 Diabetes, Migraine..."
                    value={diagnosis}
                    onChange={e => setDiagnosis(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Treatment Plan * (Encrypted at rest)</label>
                  <textarea
                    rows={2}
                    required
                    className="form-textarea"
                    placeholder="e.g. Fluid intake, steam inhalation, avoidance of cold exposure..."
                    value={treatment}
                    onChange={e => setTreatment(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Prescription (Rx) & Dosages * (Encrypted at rest)</label>
                  <textarea
                    rows={2}
                    required
                    className="form-textarea"
                    placeholder="e.g. Amoxicillin 500mg TDS x 5 days; Paracetamol 650mg SOS..."
                    value={prescription}
                    onChange={e => setPrescription(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Doctor's Clinical Notes</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Follow up in 2 weeks; review blood work..."
                    value={clinicalNotes}
                    onChange={e => setClinicalNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                  <button type="submit" className="btn btn-primary">
                    <FileCheck size={16} /> Save Encrypted Record & Mark Completed
                  </button>
                </div>
              </form>

              {/* Patient Prior Medical Records & Ciphertext Toggle */}
              <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Electronic Health Record (EHR) History</h4>
                  <button
                    type="button"
                    onClick={() => setShowCiphertextToggle(!showCiphertextToggle)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Eye size={14} /> {showCiphertextToggle ? 'Show Decrypted Clinical View' : 'Inspect Raw DB Ciphertext'}
                  </button>
                </div>

                {patientHistory.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No previous records found for this patient.</p>
                ) : (
                  patientHistory.map(rec => (
                    <div
                      key={rec.id}
                      style={{
                        padding: '16px',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '12px',
                        background: 'var(--bg-surface-elevated)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                          Diagnosis: {showCiphertextToggle && rawDbInspect ? rawDbInspect.rawDatabaseColumns.diagnosis : rec.diagnosis}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {rec.createdAt ? rec.createdAt.slice(0, 10) : 'Recent'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        <strong>Treatment:</strong> {showCiphertextToggle && rawDbInspect ? rawDbInspect.rawDatabaseColumns.treatment : rec.treatment}
                      </div>

                      <div style={{ fontSize: '0.85rem', color: 'var(--primary-text)', marginBottom: '4px' }}>
                        <strong>Rx (Prescription):</strong> {showCiphertextToggle && rawDbInspect ? rawDbInspect.rawDatabaseColumns.prescription : rec.prescription}
                      </div>

                      {showCiphertextToggle && (
                        <div style={{
                          marginTop: '10px',
                          padding: '10px',
                          background: 'rgba(0,0,0,0.05)',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          wordBreak: 'break-all'
                        }}>
                          🔒 <strong>Raw DB Storage Payload:</strong> Base64[12-byte IV + 16-byte GCM Tag + Ciphertext]. Cryptographically unreadable without HMS_DATA_KEY.
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              Select an appointment from the queue to start consultation.
            </div>
          )}
        </div>
      </div>

      {/* Doctor Slot Generator (Feature 2 & 7 from Implementation Guide) */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>Doctor Slot Schedule Generator</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Populates doctor_slots table with atomic reservation timestamps (replaces static availability strings).
            </p>
          </div>
          <span className="badge badge-accent">Atomic Slot Engine</span>
        </div>

        {genMessage && (
          <div style={{ padding: '12px 16px', background: 'var(--success-light)', color: 'var(--success-text)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontWeight: 600 }}>
            ✓ {genMessage}
          </div>
        )}

        <form onSubmit={handleGenerateSlots} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '180px' }}>
            <label className="form-label">Schedule Date</label>
            <input
              type="date"
              className="form-input"
              value={genDate}
              onChange={e => setGenDate(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0, minWidth: '120px' }}>
            <label className="form-label">Start Time</label>
            <input
              type="time"
              className="form-input"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0, minWidth: '120px' }}>
            <label className="form-label">End Time</label>
            <input
              type="time"
              className="form-input"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
            <label className="form-label">Interval (Minutes)</label>
            <select
              className="form-select"
              value={intervalMin}
              onChange={e => setIntervalMin(e.target.value)}
            >
              <option value={15}>15 Minutes</option>
              <option value={20}>20 Minutes</option>
              <option value={30}>30 Minutes</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>
            <PlusCircle size={16} /> Batch Generate Slots
          </button>
        </form>
      </div>
    </div>
  );
}

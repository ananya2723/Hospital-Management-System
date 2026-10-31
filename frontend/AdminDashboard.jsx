import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { 
  DollarSign, 
  Users, 
  Calendar, 
  AlertCircle, 
  Download, 
  UserPlus, 
  ShieldCheck, 
  TrendingUp, 
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

export default function AdminDashboard() {
  const [kpis, setKpis] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [docData, setDocData] = useState([]);
  const [users, setUsers] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // New User Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'DOCTOR',
    branchId: 101
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [kpiRes, revRes, docApptRes, usersRes, docListRes] = await Promise.all([
        api.get('/reports/kpis'),
        api.get('/reports/revenue'),
        api.get('/reports/appointments-by-doctor'),
        api.get('/users'),
        api.get('/doctors')
      ]);

      setKpis(kpiRes.data);
      setRevenueData(revRes.data);
      setDocData(docApptRes.data);
      setUsers(usersRes.data);
      setDoctors(docListRes.data);
    } catch (err) {
      console.error('Error fetching admin dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportCsv = async () => {
    try {
      const res = await api.get('/reports/export.csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `hms_executive_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export CSV: ' + err.message);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', newUser);
      setShowAddUserModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'DOCTOR', branchId: 101 });
      fetchData();
      alert('Staff user created successfully!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create user');
    }
  };

  if (loading && !kpis) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
        <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Aggregating CQRS Read-Model & Fact Tables...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1440px', margin: '0 auto' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Executive Management Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            System metrics, CQRS financial read models, user authorization, and branch performance.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={fetchData} className="btn btn-secondary">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={handleExportCsv} className="btn btn-secondary">
            <Download size={16} /> Export Fact CSV
          </button>
          <button onClick={() => setShowAddUserModal(true)} className="btn btn-primary">
            <UserPlus size={16} /> Add Staff Account
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: '32px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--success-light)', color: 'var(--success-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL REVENUE</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
              ₹{(kpis?.totalRevenue || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>Settled via Fact Bills</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>REGISTERED PATIENTS</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {kpis?.totalPatients || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>DPDP Act Consent Tracked</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-light)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL APPOINTMENTS</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {kpis?.totalAppointments || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>{kpis?.completedAppointments || 0} Consultations Done</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--warning-light)', color: 'var(--warning-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>NO-SHOW RATE</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {kpis?.noShowRatePercent || 0}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--warning-text)', fontWeight: 600 }}>No-Shows / (Completed + No-Show)</div>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid-2" style={{ marginBottom: '32px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem' }}>7-Day Revenue Trend (CQRS Fact Bills)</h3>
            <span className="badge badge-primary">Daily Aggregation</span>
          </div>
          <div style={{ width: '100%', height: '260px' }}>
            <ResponsiveContainer>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} contentStyle={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }} />
                <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Appointments Volume by Physician</h3>
            <span className="badge badge-success">Doctor Load</span>
          </div>
          <div style={{ width: '100%', height: '260px' }}>
            <ResponsiveContainer>
              <BarChart data={docData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="doctorName" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }} />
                <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Staff User Management Table */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>Authorized Staff & Role Management</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Enforces Spring Security @PreAuthorize role mapping and failed login lockouts.
            </p>
          </div>
          <span className="badge badge-primary">{users.length} Active Accounts</span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Branch</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.id}</td>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${
                      u.role === 'ADMIN' ? 'badge-danger' :
                      u.role === 'DOCTOR' ? 'badge-primary' :
                      u.role === 'RECEPTIONIST' ? 'badge-accent' : 'badge-warning'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td>Branch {u.branchId}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontWeight: 600 }}>
                      <CheckCircle size={14} /> ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Doctor Directory */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>Hospital Doctors Directory</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Cached in Redis with 10m TTL. Consultation fees are snapshotted on booking.
            </p>
          </div>
          <span className="badge badge-accent">{doctors.length} Physicians</span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Specialization</th>
                <th>Department</th>
                <th>Fee Snapshot</th>
                <th>Phone</th>
                <th>Branch</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600 }}>{d.name}</td>
                  <td><span className="badge badge-primary">{d.specialization}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{d.department}</td>
                  <td style={{ fontWeight: 700, color: 'var(--success-text)' }}>₹{d.consultationFee}</td>
                  <td>{d.phone}</td>
                  <td>Branch {d.branchId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px' }}>Add Hospital Staff Account</h2>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Dr. Rajesh Khanna"
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="e.g. rkhanna@bea-hms.com"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  required
                  className="form-input"
                  placeholder="Min 8 characters"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Assigned Role</label>
                  <select
                    className="form-select"
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    <option value="DOCTOR">DOCTOR</option>
                    <option value="RECEPTIONIST">RECEPTIONIST</option>
                    <option value="BILLING">BILLING</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Branch Assignment</label>
                  <select
                    className="form-select"
                    value={newUser.branchId}
                    onChange={e => setNewUser({ ...newUser, branchId: Number(e.target.value) })}
                  >
                    <option value={101}>Branch 101: Metro Central</option>
                    <option value={102}>Branch 102: North Campus</option>
                    <option value={103}>Branch 103: South Clinic</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowAddUserModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

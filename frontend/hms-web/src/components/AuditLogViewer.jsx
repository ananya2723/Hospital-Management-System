import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { 
  FileText, 
  Shield, 
  Lock, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Terminal
} from 'lucide-react';

export default function AuditLogViewer() {
  const [logs, setLogs] = useState([]);
  const [filterAction, setFilterAction] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit-logs');
      setLogs(res.data);
    } catch (err) {
      console.error('Error fetching audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    const matchAction = !filterAction || l.action.toLowerCase().includes(filterAction.toLowerCase());
    const matchRole = !filterRole || l.role === filterRole;
    return matchAction && matchRole;
  });

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1440px', margin: '0 auto' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Append-Only Security Audit Trail</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Written via Spring AOP @Audited aspect in REQUIRES_NEW transactions. Immutable record of who accessed or modified patient data.
          </p>
        </div>
        <button onClick={fetchLogs} className="btn btn-secondary">
          <RefreshCw size={16} /> Refresh Audit Trail
        </button>
      </div>

      {/* Compliance Callout */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={22} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>DPDP Act 2023 & HIPAA Compliance Rule (NFR-8)</div>
          <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            The audit_log table possesses no UPDATE or DELETE privileges. Every sensitive clinical EHR read, slot reservation, and billing action is permanently recorded with actor identity, timestamp, and originating IP address.
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px' }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Filter by action (e.g. RECORD_READ)..."
              className="form-input"
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter Role:</span>
            <select
              className="form-select"
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="DOCTOR">DOCTOR</option>
              <option value="RECEPTIONIST">RECEPTIONIST</option>
              <option value="BILLING">BILLING</option>
            </select>
          </div>

          <span className="badge badge-accent" style={{ marginLeft: 'auto' }}>
            {filteredLogs.length} Logged Security Events
          </span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Actor Role</th>
              <th>Actor ID</th>
              <th>Entity Type</th>
              <th>Entity ID</th>
              <th>Origin IP</th>
              <th>Branch</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(l => (
              <tr key={l.id}>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {l.timestamp ? l.timestamp.replace('T', ' ').slice(0, 19) : 'Just now'}
                </td>
                <td>
                  <span style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '0.825rem',
                    color: l.action.includes('DENIED') ? 'var(--danger)' :
                           l.action.includes('RECORD') ? 'var(--primary)' :
                           l.action.includes('PAYMENT') ? 'var(--success)' : 'var(--text-main)'
                  }}>
                    {l.action}
                  </span>
                </td>
                <td>
                  <span className={`badge ${
                    l.role === 'ADMIN' ? 'badge-danger' :
                    l.role === 'DOCTOR' ? 'badge-primary' :
                    l.role === 'RECEPTIONIST' ? 'badge-accent' : 'badge-warning'
                  }`}>
                    {l.role}
                  </span>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{l.userId}</td>
                <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>{l.entityType}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  {l.entityId || 'N/A'}
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{l.ipAddress}</td>
                <td>Branch {l.branchId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Mail, RefreshCw, Send, CheckCircle, Clock, Eye } from 'lucide-react';

export default function NotificationsCenter() {
  const [notifications, setNotifications] = useState([]);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Error fetching notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1440px', margin: '0 auto' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Notification Service & Mailpit Inbox</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Asynchronous event consumer listening to hms.events topic exchange (appointment.booked, bill.paid).
          </p>
        </div>
        <button onClick={fetchNotifications} className="btn btn-secondary">
          <RefreshCw size={16} /> Refresh Mailpit
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>Dispatched SMTP Outbox</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Simulates Mailpit running on localhost:1025 (SMTP) and localhost:8025 (Web UI).
            </p>
          </div>
          <span className="badge badge-primary">{notifications.length} Emails Dispatched</span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Notification Event</th>
                <th>Subject</th>
                <th>Sent At</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map(n => (
                <tr key={n.id}>
                  <td style={{ fontWeight: 600 }}>{n.recipientEmail}</td>
                  <td>
                    <span className={`badge ${
                      n.notificationType === 'BOOKING_CONFIRMATION' ? 'badge-primary' :
                      n.notificationType === 'BILL_RECEIPT' ? 'badge-success' :
                      n.notificationType === 'CANCELLATION' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {n.notificationType}
                    </span>
                  </td>
                  <td>{n.subject}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {n.sentAt ? n.sentAt.replace('T', ' ').slice(0, 19) : 'Just now'}
                  </td>
                  <td>
                    <span style={{ color: 'var(--success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                      <CheckCircle size={14} /> DELIVERED
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => setSelectedNotif(n)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Eye size={14} /> View Email
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email Body Preview Modal */}
      {selectedNotif && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem' }}>{selectedNotif.subject}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  To: {selectedNotif.recipientEmail} · Delivered via Mailpit SMTP
                </span>
              </div>
              <span className="badge badge-success">250 OK</span>
            </div>

            <div style={{
              background: 'var(--bg-surface-elevated)',
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              marginBottom: '20px'
            }}>
              {selectedNotif.body}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedNotif(null)} className="btn btn-primary">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

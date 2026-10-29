import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import AdminDashboard from './components/AdminDashboard';
import ReceptionistPortal from './components/ReceptionistPortal';
import DoctorPortal from './components/DoctorPortal';
import BillingPortal from './components/BillingPortal';
import AuditLogViewer from './components/AuditLogViewer';
import NotificationsCenter from './components/NotificationsCenter';
import VivaLab from './components/VivaLab';
import { Activity, ShieldCheck, Lock, ArrowRight, UserCheck } from 'lucide-react';

export default function App() {
  const { user, role, loading, login, quickSwitchRole, defaultAccounts } = useAuth();
  const [activeTab, setActiveTab] = useState('admin');

  // Manual login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(null);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app)',
        color: 'var(--text-main)',
        fontFamily: 'var(--font-heading)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Activity size={40} style={{ color: 'var(--primary)', animation: 'spin 1.5s linear infinite' }} />
          <h2 style={{ marginTop: '16px', fontSize: '1.25rem' }}>Initializing BEA HMS 2.0 Enterprise Platform...</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading JWT Security Context & Services...</p>
        </div>
      </div>
    );
  }

  // If unauthenticated, show login screen with quick 1-click demo buttons
  if (!user) {
    const handleManualLogin = async (e) => {
      e.preventDefault();
      setLoginError(null);
      try {
        await login(email, password);
      } catch (err) {
        setLoginError(err.response?.data?.detail || 'Invalid email or password');
      }
    };

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 30%, var(--primary-light) 0%, var(--bg-app) 70%)',
        padding: '24px'
      }}>
        <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '36px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(2, 132, 199, 0.35)',
              marginBottom: '16px'
            }}>
              <Activity size={32} />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>BEA HMS Enterprise 2.0</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              Microservices Gateway · Defense-in-Depth Security
            </p>
          </div>

          {loginError && (
            <div style={{
              background: 'var(--danger-light)',
              color: 'var(--danger-text)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.825rem',
              marginBottom: '20px',
              fontWeight: 600
            }}>
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleManualLogin} style={{ marginBottom: '24px' }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="admin@bea-hms.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
              Sign In with JWT <ArrowRight size={16} />
            </button>
          </form>

          {/* 1-Click Role Login for Quick Testing / Viva */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', marginBottom: '12px', letterSpacing: '0.04em' }}>
              ⚡ 1-CLICK DEMO AUTHENTICATION:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              <button
                type="button"
                onClick={() => quickSwitchRole('ADMIN')}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start' }}
              >
                <ShieldCheck size={14} style={{ color: 'var(--danger)' }} /> Admin Portal
              </button>
              <button
                type="button"
                onClick={() => quickSwitchRole('DOCTOR')}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start' }}
              >
                <UserCheck size={14} style={{ color: 'var(--primary)' }} /> Doctor Portal
              </button>
              <button
                type="button"
                onClick={() => quickSwitchRole('RECEPTIONIST')}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start' }}
              >
                <UserCheck size={14} style={{ color: 'var(--accent)' }} /> Receptionist
              </button>
              <button
                type="button"
                onClick={() => quickSwitchRole('BILLING')}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start' }}
              >
                <UserCheck size={14} style={{ color: 'var(--warning-text)' }} /> Billing Staff
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main style={{ flex: 1 }}>
        {activeTab === 'admin' && <AdminDashboard />}
        {activeTab === 'reception' && <ReceptionistPortal />}
        {activeTab === 'doctor' && <DoctorPortal />}
        {activeTab === 'billing' && <BillingPortal />}
        {activeTab === 'audit' && <AuditLogViewer />}
        {activeTab === 'mail' && <NotificationsCenter />}
        {activeTab === 'viva' && <VivaLab />}
      </main>
      <footer style={{
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-color)',
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-muted)'
      }}>
        BEA Hospital Management System Enterprise 2.0 · Built per Enterprise Implementation Guide & SOP 3.0.0 · 8 Business Services + Gateway
      </footer>
    </div>
  );
}

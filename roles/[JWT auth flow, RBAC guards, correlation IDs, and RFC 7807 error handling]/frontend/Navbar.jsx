import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Activity, 
  ShieldCheck, 
  Building2, 
  Moon, 
  Sun, 
  LogOut, 
  UserCheck, 
  Users, 
  Stethoscope, 
  CreditCard, 
  FileText, 
  Mail, 
  TerminalSquare
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, role, quickSwitchRole, logout, theme, toggleTheme, selectedBranch, setSelectedBranch } = useAuth();

  const navItems = [
    { id: 'admin', label: 'Admin Dashboard', icon: ShieldCheck, roles: ['ADMIN'] },
    { id: 'reception', label: 'Reception & Booking', icon: Users, roles: ['ADMIN', 'RECEPTIONIST'] },
    { id: 'doctor', label: 'Doctor Workspace', icon: Stethoscope, roles: ['ADMIN', 'DOCTOR'] },
    { id: 'billing', label: 'Billing & Invoicing', icon: CreditCard, roles: ['ADMIN', 'BILLING'] },
    { id: 'audit', label: 'Audit Trail', icon: FileText, roles: ['ADMIN'] },
    { id: 'mail', label: 'Mailpit Inbox', icon: Mail, roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'BILLING'] },
    { id: 'viva', label: 'Viva & Concurrency Lab', icon: TerminalSquare, roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'BILLING'] },
  ];

  const visibleNav = navItems.filter(item => !item.roles || item.roles.includes(role));

  const roleColors = {
    ADMIN: 'badge-danger',
    DOCTOR: 'badge-primary',
    RECEPTIONIST: 'badge-accent',
    BILLING: 'badge-warning'
  };

  return (
    <header style={{
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Top Banner: Quick Role Switcher for Viva & Evaluation */}
      <div style={{
        background: 'var(--bg-surface-elevated)',
        borderBottom: '1px solid var(--border-light)',
        padding: '6px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.8rem',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>⚡ QUICK ROLE SWITCHER:</span>
          {['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'BILLING'].map(r => (
            <button
              key={r}
              onClick={() => {
                quickSwitchRole(r);
                if (r === 'DOCTOR') setActiveTab('doctor');
                else if (r === 'RECEPTIONIST') setActiveTab('reception');
                else if (r === 'BILLING') setActiveTab('billing');
                else if (r === 'ADMIN') setActiveTab('admin');
              }}
              style={{
                background: role === r ? 'var(--primary)' : 'var(--bg-surface)',
                color: role === r ? '#fff' : 'var(--text-main)',
                border: '1px solid var(--border-color)',
                padding: '3px 10px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.75rem'
              }}
            >
              {r}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
            <Building2 size={15} />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(Number(e.target.value))}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                fontSize: '0.8rem'
              }}
            >
              <option value={101}>Branch 101: Metro Central (Bengaluru)</option>
              <option value={102}>Branch 102: North Campus (Indiranagar)</option>
              <option value={103}>Branch 103: South Clinic (Koramangala)</option>
            </select>
          </div>

          <button
            onClick={toggleTheme}
            title="Toggle Dark / Light Theme"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} style={{ color: '#f59e0b' }} />}
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 10px rgba(2, 132, 199, 0.35)'
          }}>
            <Activity size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                BEA HMS
              </span>
              <span style={{
                background: 'linear-gradient(135deg, #0284c7, #0d9488)',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                2.0 ENTERPRISE
              </span>
            </div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              Microservices Gateway & EHR Security
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto' }}>
          {visibleNav.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: isActive ? 'var(--primary-light)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Status & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {user && (
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{user.name}</span>
                <span className={`badge ${roleColors[role] || 'badge-primary'}`}>
                  {role}
                </span>
              </div>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)' }}>{user.email}</span>
            </div>
          )}
          <button
            onClick={logout}
            className="btn btn-secondary btn-sm"
            title="Sign Out"
            style={{ padding: '8px' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

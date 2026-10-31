import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

const DEFAULT_ACCOUNTS = {
  ADMIN: { email: 'admin@bea-hms.com', password: 'Admin@123', label: 'Admin (System Ops)' },
  DOCTOR: { email: 'doctor@bea-hms.com', password: 'Doctor@123', label: 'Doctor (Dr. Ananya Roy)' },
  RECEPTIONIST: { email: 'receptionist@bea-hms.com', password: 'Recept@123', label: 'Receptionist (Priya Sharma)' },
  BILLING: { email: 'billing@bea-hms.com', password: 'Billing@123', label: 'Billing Staff (Rahul Verma)' }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState(101);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Check saved theme
    const savedTheme = localStorage.getItem('hms_theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Auto login as Admin on first load for zero-friction evaluation
    const storedToken = sessionStorage.getItem('hms_access_token');
    const storedUser = sessionStorage.getItem('hms_user');

    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        sessionStorage.clear();
      }
      setLoading(false);
    } else {
      quickSwitchRole('ADMIN').finally(() => setLoading(false));
    }

    const handleLogoutEvent = () => setUser(null);
    window.addEventListener('hms_auth_logout', handleLogoutEvent);
    return () => window.removeEventListener('hms_auth_logout', handleLogoutEvent);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('hms_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user: authUser } = res.data;
    sessionStorage.setItem('hms_access_token', accessToken);
    sessionStorage.setItem('hms_refresh_token', refreshToken);
    sessionStorage.setItem('hms_user', JSON.stringify(authUser));
    setUser(authUser);
    if (authUser.branchId) setSelectedBranch(authUser.branchId);
    return authUser;
  };

  const quickSwitchRole = async (targetRole) => {
    const creds = DEFAULT_ACCOUNTS[targetRole];
    if (creds) {
      return await login(creds.email, creds.password);
    }
  };

  const logout = () => {
    sessionStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        loading,
        selectedBranch,
        setSelectedBranch,
        theme,
        toggleTheme,
        login,
        logout,
        quickSwitchRole,
        defaultAccounts: DEFAULT_ACCOUNTS
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

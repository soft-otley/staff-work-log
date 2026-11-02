/**
 * Authentication and Authorization Context
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  systemInitialized: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrapAdmin: (data: { username: string; fullName: string; password: string; email?: string }) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<{ success: boolean; message: string }>;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [systemInitialized, setSystemInitialized] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  const initAuth = async () => {
    try {
      setLoading(true);
      const res = await api.getMe();
      setUser(res.user);
      setSystemInitialized(res.systemInitialized);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('swl:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('swl:unauthorized', handleUnauthorized);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.login(username, password);
    setUser(res.user);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const bootstrapAdmin = async (data: { username: string; fullName: string; password: string; email?: string }) => {
    const res = await api.bootstrapAdmin(data);
    setUser(res.user);
    setSystemInitialized(true);
  };

  const changePassword = async (current: string, next: string) => {
    return api.changePassword(current, next);
  };

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
      setSystemInitialized(res.systemInitialized);
    } catch {
      // ignore
    }
  };

  const isAdmin = user?.role === 'Administrator';
  const isManager = user?.role === 'Manager' || isAdmin;
  const isStaff = user?.role === 'Staff';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        systemInitialized,
        login,
        logout,
        bootstrapAdmin,
        changePassword,
        isAdmin,
        isManager,
        isStaff,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, User } from '../api/client';
import { removeNativePushToken, syncNativePushToken } from '../mobile';

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { email: string; username: string; password: string; name: string }) => Promise<string | undefined>;
  logout: () => void;
  setUserState: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser() {
  const stored = localStorage.getItem('user');
  if (!stored) return null;
  try {
    return JSON.parse(stored) as User;
  } catch {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);

  useEffect(() => {
    if (user) void syncNativePushToken();
  }, [user]);

  const persist = (token: string, user: User, refreshToken?: string) => {
    localStorage.setItem('token', token);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  const setUserState = (u: User | null) => {
    if (u) localStorage.setItem('user', JSON.stringify(u));
    else localStorage.removeItem('user');
    setUser(u);
  };

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password });
    persist(res.token, res.user, res.refreshToken);
  }, []);

  const signup = useCallback(
    async (data: { email: string; username: string; password: string; name: string }) => {
      const res = await api.signup(data);
      if (res.recoveryCode) {
        localStorage.setItem('pendingRecoveryCode', res.recoveryCode);
        window.dispatchEvent(new Event('recovery-code-created'));
      }
      persist(res.token, res.user, res.refreshToken);
      return res.recoveryCode;
    },
    [],
  );

  const logout = useCallback(() => {
    void removeNativePushToken();
    const token = localStorage.getItem('token');
    if (token) {
      api.logout().catch(() => undefined);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, setUserState }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

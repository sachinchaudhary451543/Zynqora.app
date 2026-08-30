import React, { createContext, useContext, useState, useCallback } from 'react';
import { api, User } from '../api/client';

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { email: string; username: string; password: string; name: string }) => Promise<void>;
  logout: () => void;
  setUserState: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const persist = (token: string, user: User) => {
    localStorage.setItem('token', token);
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
    persist(res.token, res.user);
  }, []);

  const signup = useCallback(
    async (data: { email: string; username: string; password: string; name: string }) => {
      const res = await api.signup(data);
      persist(res.token, res.user);
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
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

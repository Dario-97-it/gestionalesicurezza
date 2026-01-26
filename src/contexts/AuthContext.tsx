import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, setTokens, clearTokens } from '../lib/api';
import type { User, Client, AuthState } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: {
      id: 1,
      email: 'd.padalino@msn.com',
      name: 'Dario Padalino (Admin)',
      role: 'admin',
    },
    client: {
      id: 1,
      name: 'Security Tools',
      plan: 'enterprise',
      subscriptionStatus: 'active',
    },
    isAuthenticated: true,
    isLoading: false,
  });

  const refreshAuth = useCallback(async () => {
    // Funzione vuota per bypassare il refresh
  }, []);

  useEffect(() => {
    // Non fare nulla al mount
  }, []);

  const login = async (email: string, password: string) => {
    // Funzione vuota per bypassare il login
  };

  const logout = async () => {
    // Funzione vuota per bypassare il logout
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

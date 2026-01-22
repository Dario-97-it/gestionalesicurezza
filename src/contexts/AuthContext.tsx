import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, setAccessToken } from '../lib/api';
import type { User, Client, AuthState } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    client: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const refreshAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setState({
          user: null,
          client: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      setAccessToken(token);
      const { user, client } = await authApi.me();
      setState({
        user,
        client,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Auth refresh failed:', error);
      setAccessToken(null);
      setState({
        user: null,
        client: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const { user, client, accessToken } = await authApi.login(email, password);
      setAccessToken(accessToken);
      setState({
        user,
        client,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAccessToken(null);
      setState({
        user: null,
        client: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
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

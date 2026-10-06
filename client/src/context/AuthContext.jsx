import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(apiClient.getUser());
  const [token, setToken] = useState(apiClient.getToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      if (token) {
        try {
          const profile = await apiClient.getProfile();
          setUser(profile);
          apiClient.setUser(profile);
        } catch (err) {
          console.warn('Session check failed, clearing auth:', err);
          logout();
        }
      }
      setLoading(false);
    }

    const handleExpired = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth_expired', handleExpired);
    checkAuth();

    return () => window.removeEventListener('auth_expired', handleExpired);
  }, []);

  const login = async (email, password) => {
    const res = await apiClient.login(email, password);
    apiClient.setToken(res.token);
    apiClient.setUser(res.user);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (name, email, password) => {
    return await apiClient.register(name, email, password);
  };

  const verifyCode = async (email, code) => {
    const res = await apiClient.verifyCode(email, code);
    apiClient.setToken(res.token);
    apiClient.setUser(res.user);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const resendCode = async (email) => {
    return await apiClient.resendCode(email);
  };

  const logout = () => {
    apiClient.setToken(null);
    apiClient.setUser(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        register,
        verifyCode,
        resendCode,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

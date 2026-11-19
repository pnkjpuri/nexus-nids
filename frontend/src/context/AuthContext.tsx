import React, { createContext, useContext, useEffect, useState } from "react";
import { apiRequest, setCsrfToken } from "../services/api";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  username?: string;
  role: "admin" | "analyst" | "viewer";
  avatar_url?: string;
  is_verified: boolean;
  mfa_enabled: boolean;
  oauth_provider: string;
  department?: string;
  preferences: { theme?: string; language?: string; notifications?: boolean };
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string, totp_code?: string) => Promise<{ mfa_required?: boolean }>;
  register: (full_name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await apiRequest("/auth/me");
      setCsrfToken(data.csrf_token);
      setUser(data.user);
    } catch {
      setCsrfToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string, totp_code?: string) => {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, totp_code }),
    });
    if (data.mfa_required) {
      return { mfa_required: true };
    }
    setCsrfToken(data.csrf_token);
    setUser(data.user);
    return {};
  };

  const register = async (full_name: string, email: string, password: string) => {
    const data = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ full_name, email, password }),
    });
    setCsrfToken(data.csrf_token);
    setUser(data.user);
  };

  const logout = async () => {
    await apiRequest("/auth/logout", { method: "POST" });
    setCsrfToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

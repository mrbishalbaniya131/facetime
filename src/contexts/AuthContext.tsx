"use client";

import React, { createContext, useState, useEffect, type ReactNode } from "react";

interface User {
  username: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in from localStorage
    try {
      const storedUser = localStorage.getItem("face-time-user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        localStorage.removeItem("face-time-user");
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, pass: string): Promise<void> => {
    // Simple hardcoded auth for MVP
    return new Promise((resolve, reject) => {
      if (username === "admin" && pass === "password") {
        const userData = { username };
        setUser(userData);
        localStorage.setItem("face-time-user", JSON.stringify(userData));
        resolve();
      } else {
        reject(new Error("Invalid credentials"));
      }
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("face-time-user");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

import { createContext, useContext, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("newsapp_token"));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("newsapp_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = (token, user) => {
    localStorage.setItem("newsapp_token", token);
    localStorage.setItem("newsapp_user", JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const updateUser = (updatedUser) => {
    localStorage.setItem("newsapp_user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const logout = () => {
    localStorage.removeItem("newsapp_token");
    localStorage.removeItem("newsapp_user");
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get("/auth/me");
      updateUser(res.data);
      return res.data;
    } catch {
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

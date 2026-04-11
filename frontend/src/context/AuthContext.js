import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("newsapp_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(!!user);
  const [loading, setLoading] = useState(true);

  // Validate session on mount via cookie
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.get("/auth/me")
      .then(res => {
        setUser(res.data);
        localStorage.setItem("newsapp_user", JSON.stringify(res.data));
        setIsAuthenticated(true);
      })
      .catch(() => {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem("newsapp_user");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem("newsapp_user", JSON.stringify(userData));
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch {}
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("newsapp_user");
    localStorage.removeItem("newsapp_token");
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
      localStorage.setItem("newsapp_user", JSON.stringify(res.data));
      setIsAuthenticated(true);
      return res.data;
    } catch {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

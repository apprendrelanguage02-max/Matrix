// ============================================================================
// AuthContext.js — Contexte d'authentification global de l'application
// ============================================================================
// Ce fichier gère l'état de connexion de l'utilisateur dans toute l'application.
// Il fournit : l'utilisateur connecté, son statut d'auth, et les fonctions
// login / logout / refreshUser à tous les composants enfants via React Context.
// ============================================================================

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../lib/api";

// Création du contexte React (partagé dans toute l'app)
const AuthContext = createContext(null);

// ── Clés de stockage local ──────────────────────────────────────────────────
const STORAGE_USER_KEY = "newsapp_user";   // Données utilisateur en JSON
const STORAGE_TOKEN_KEY = "newsapp_token"; // Token JWT pour les requêtes API

export function AuthProvider({ children }) {
  // ── État : utilisateur (chargé depuis localStorage au démarrage) ─────────
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null; // Si le JSON est corrompu, on repart de zéro
    }
  });

  // ── État : l'utilisateur est-il authentifié ? ────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(!!user);

  // ── État : chargement en cours (validation de session au démarrage) ──────
  const [loading, setLoading] = useState(!!user); // true seulement si on a un user à valider

  // ── Effet : valider la session au chargement de l'app ────────────────────
  // S'exécute UNE SEULE FOIS au montage du composant.
  // Si un utilisateur est en localStorage, on vérifie que sa session est
  // encore valide en appelant /auth/me. Si le serveur répond OK, on met à
  // jour les données. Sinon, on déconnecte.
  useEffect(() => {
    // Pas d'utilisateur en mémoire → rien à valider
    if (!user) {
      setLoading(false);
      return;
    }

    // Appel API pour valider le token (cookie ou header Authorization)
    api.get("/auth/me")
      .then(res => {
        // Session valide → mettre à jour les données utilisateur
        setUser(res.data);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(res.data));
        setIsAuthenticated(true);
      })
      .catch(() => {
        // Session invalide (token expiré, cookie absent, etc.)
        // → déconnecter l'utilisateur proprement
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem(STORAGE_USER_KEY);
        localStorage.removeItem(STORAGE_TOKEN_KEY);
      })
      .finally(() => {
        // Dans tous les cas, le chargement est terminé
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // [] = exécuter seulement au montage

  // ── Fonction : connecter l'utilisateur ───────────────────────────────────
  // Appelée après un login ou une vérification OTP réussie.
  // Stocke les données utilisateur + le token JWT dans l'état et localStorage.
  const login = useCallback((userData, token) => {
    setUser(userData);               // Mettre à jour l'état React
    setIsAuthenticated(true);        // Marquer comme authentifié
    setLoading(false);               // Plus de chargement
    // Persister dans localStorage pour les prochaines visites
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
    if (token) {
      localStorage.setItem(STORAGE_TOKEN_KEY, token);
    }
  }, []);

  // ── Fonction : déconnecter l'utilisateur ─────────────────────────────────
  // Appelle le backend pour supprimer le cookie, puis nettoie tout localement.
  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout"); // Demander au serveur de supprimer le cookie
    } catch {
      // Même si le serveur ne répond pas, on déconnecte côté client
    }
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
  }, []);

  // ── Fonction : rafraîchir les données utilisateur ────────────────────────
  // Utile après un changement de profil pour mettre à jour l'interface.
  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(res.data));
      setIsAuthenticated(true);
      return res.data;
    } catch {
      return null;
    }
  }, []);

  // ── Rendu : fournir le contexte à tous les composants enfants ────────────
  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook personnalisé : utiliser le contexte d'auth ────────────────────────
// Permet d'accéder à l'état d'auth dans n'importe quel composant avec :
// const { user, isAuthenticated, login, logout } = useAuth();
export function useAuth() {
  return useContext(AuthContext);
}

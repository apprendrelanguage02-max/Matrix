// ============================================================================
// api.js — Configuration d'Axios pour les appels API
// ============================================================================
// Ce fichier crée une instance Axios préconfigurée pour communiquer avec le
// backend FastAPI. Toutes les requêtes passent par cette instance.
// ============================================================================

import axios from "axios";

// Créer l'instance Axios avec l'URL du backend et les cookies activés
const api = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`, // URL de base (ex: https://monsite.com/api)
  withCredentials: true, // Envoyer les cookies httpOnly avec chaque requête
});

// ── Intercepteur de requêtes ────────────────────────────────────────────────
// Avant chaque requête, on ajoute le token JWT depuis localStorage dans
// l'en-tête Authorization. C'est un FILET DE SÉCURITÉ : si le cookie httpOnly
// ne fonctionne pas (navigateur restrictif, HTTP sans HTTPS, etc.),
// le token dans l'en-tête prend le relais.
api.interceptors.request.use(config => {
  const token = localStorage.getItem("newsapp_token");
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

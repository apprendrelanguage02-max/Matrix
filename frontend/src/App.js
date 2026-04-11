// ============================================================================
// App.js — Point d'entrée principal de l'application React
// ============================================================================
// Ce fichier définit toutes les routes de l'application et les gardes d'accès
// (PrivateRoute, AdminRoute, etc.) qui protègent les pages réservées.
// L'ErrorBoundary empêche l'application d'afficher une page blanche en cas
// d'erreur inattendue dans un composant.
// ============================================================================

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WebSocketProvider } from "./context/WebSocketContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// ── Import des pages ────────────────────────────────────────────────────────
import HomePage from "./pages/HomePage";
import ArticleDetailPage from "./pages/ArticleDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyOTPPage from "./pages/VerifyOTPPage";
import DashboardPage from "./pages/DashboardPage";
import ArticleFormPage from "./pages/ArticleFormPage";
import ProfilePage from "./pages/ProfilePage";
import CategoryPage from "./pages/CategoryPage";
import SavedArticlesPage from "./pages/SavedArticlesPage";
import SettingsPage from "./pages/SettingsPage";
import ImmobilierPage from "./pages/immobilier/ImmobilierPage";
import PropertyDetailPage from "./pages/immobilier/PropertyDetailPage";
import PropertyFormPage from "./pages/immobilier/PropertyFormPage";
import AgentDashboardPage from "./pages/immobilier/AgentDashboardPage";
import PaymentsAdminPage from "./pages/immobilier/PaymentsAdminPage";
import DatabasePage from "./pages/admin/DatabasePage";
import MapPage from "./pages/immobilier/MapPage";
import AgentProfilePage from "./pages/immobilier/AgentProfilePage";
import SearchAlertsPage from "./pages/immobilier/SearchAlertsPage";
import PriceEstimatePage from "./pages/immobilier/PriceEstimatePage";
import ProceduresPage from "./pages/procedures/ProceduresPage";
import ProcedureDetailPage from "./pages/procedures/ProcedureDetailPage";
import ProcedureFormPage from "./pages/procedures/ProcedureFormPage";
import AdminProceduresDashboard from "./pages/admin/procedures/AdminProceduresDashboard";
import ProcedureBuilder from "./pages/admin/procedures/ProcedureBuilder";
import FichesListPage from "./pages/admin/fiches/FichesListPage";
import CreateFichePage from "./pages/admin/fiches/CreateFichePage";
import CompanySettingsPage from "./pages/admin/fiches/CompanySettingsPage";
import ChatHelp from "./components/ChatHelp";
import "./App.css";

// ── Composant : Spinner de chargement pour les routes protégées ─────────────
// Affiché pendant que l'app vérifie si l'utilisateur est connecté.
// Empêche la page blanche en attendant la réponse du serveur.
function RouteLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white" data-testid="route-loader">
      <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
    </div>
  );
}

// ── Garde : Route privée (utilisateur connecté requis) ──────────────────────
// Redirige vers /connexion si l'utilisateur n'est pas authentifié.
function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  return isAuthenticated ? children : <Navigate to="/connexion" replace />;
}

// ── Garde : Route auteur (rôle "auteur" ou "admin" requis) ──────────────────
// Les auteurs et admins peuvent créer/modifier des articles.
function AuthorRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/connexion" replace />;
  if (user?.role !== "auteur" && user?.role !== "admin") return <Navigate to="/profil" replace />;
  return children;
}

// ── Garde : Route admin (rôle "admin" requis) ───────────────────────────────
// Seuls les administrateurs peuvent accéder à la base de données, etc.
function AdminRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/connexion" replace />;
  if (user?.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

// ── Garde : Route agent immobilier (rôle "agent" ou "admin" requis) ─────────
// Les agents peuvent publier et gérer des annonces immobilières.
function AgentRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/connexion" replace />;
  if (user?.role !== "agent" && user?.role !== "admin") return <Navigate to="/immobilier" replace />;
  return children;
}

// ── Composant principal ─────────────────────────────────────────────────────
function App() {
  return (
    // ErrorBoundary : attrape toutes les erreurs React pour éviter la page blanche
    <ErrorBoundary>
      {/* AuthProvider : fournit l'état d'auth à toute l'app */}
      <AuthProvider>
        <BrowserRouter>
          {/* WebSocketProvider : connexion temps réel pour les notifications */}
          <WebSocketProvider>
            <Routes>
              {/* ── Pages publiques (accessibles sans connexion) ────────── */}
              <Route path="/" element={<HomePage />} />
              <Route path="/article/:id" element={<ArticleDetailPage />} />
              <Route path="/categorie/:slug" element={<CategoryPage />} />
              <Route path="/connexion" element={<LoginPage />} />
              <Route path="/inscription" element={<RegisterPage />} />
              <Route path="/verification" element={<VerifyOTPPage />} />

              {/* ── Pages privées (connexion requise) ──────────────────── */}
              <Route path="/profil" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
              <Route path="/sauvegardes" element={<PrivateRoute><SavedArticlesPage /></PrivateRoute>} />
              <Route path="/parametres" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />

              {/* ── Pages auteur/admin (rédaction d'articles) ──────────── */}
              <Route path="/admin" element={<AuthorRoute><DashboardPage /></AuthorRoute>} />
              <Route path="/admin/nouvelle" element={<AuthorRoute><ArticleFormPage /></AuthorRoute>} />
              <Route path="/admin/modifier/:id" element={<AuthorRoute><ArticleFormPage /></AuthorRoute>} />
              <Route path="/admin/paiements" element={<AuthorRoute><PaymentsAdminPage /></AuthorRoute>} />

              {/* ── Pages admin uniquement ──────────────────────────────── */}
              <Route path="/admin/database" element={<AdminRoute><DatabasePage /></AdminRoute>} />

              {/* ── Pages immobilier (publiques) ───────────────────────── */}
              <Route path="/immobilier" element={<ImmobilierPage />} />
              <Route path="/immobilier/carte" element={<MapPage />} />
              <Route path="/immobilier/alertes" element={<PrivateRoute><SearchAlertsPage /></PrivateRoute>} />
              <Route path="/immobilier/estimation" element={<PriceEstimatePage />} />
              <Route path="/immobilier/:id" element={<PropertyDetailPage />} />

              {/* ── Pages agent immobilier (publication d'annonces) ─────── */}
              <Route path="/immobilier/publier" element={<AgentRoute><PropertyFormPage /></AgentRoute>} />
              <Route path="/immobilier/modifier/:id" element={<AgentRoute><PropertyFormPage /></AgentRoute>} />
              <Route path="/mes-annonces" element={<AgentRoute><AgentDashboardPage /></AgentRoute>} />
              <Route path="/agent/:agentId" element={<AgentProfilePage />} />

              {/* ── Pages procédures (publiques) ───────────────────────── */}
              <Route path="/procedures" element={<ProceduresPage />} />
              <Route path="/procedures/:id" element={<ProcedureDetailPage />} />

              {/* ── Pages procédures admin ─────────────────────────────── */}
              <Route path="/procedures/nouvelle" element={<AdminRoute><ProcedureFormPage /></AdminRoute>} />
              <Route path="/procedures/modifier/:id" element={<AdminRoute><ProcedureFormPage /></AdminRoute>} />
              <Route path="/admin/procedures" element={<AdminRoute><AdminProceduresDashboard /></AdminRoute>} />
              <Route path="/admin/procedures/nouvelle" element={<AdminRoute><ProcedureBuilder /></AdminRoute>} />
              <Route path="/admin/procedures/modifier/:id" element={<AdminRoute><ProcedureBuilder /></AdminRoute>} />
              <Route path="/admin/fiches" element={<AdminRoute><FichesListPage /></AdminRoute>} />
              <Route path="/admin/fiches/create" element={<AdminRoute><CreateFichePage /></AdminRoute>} />
              <Route path="/admin/fiches/:id/edit" element={<AdminRoute><CreateFichePage /></AdminRoute>} />
              <Route path="/admin/parametres-entreprise" element={<AdminRoute><CompanySettingsPage /></AdminRoute>} />
            </Routes>

            {/* Chat d'aide flottant (visible sur toutes les pages) */}
            <ChatHelp />
            {/* Notifications toast (coin supérieur droit) */}
            <Toaster position="top-right" />
          </WebSocketProvider>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

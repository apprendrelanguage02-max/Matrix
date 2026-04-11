import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WebSocketProvider } from "./context/WebSocketContext";
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

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/connexion" replace />;
}

function AuthorRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/connexion" replace />;
  if (user?.role !== "auteur" && user?.role !== "admin") return <Navigate to="/profil" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/connexion" replace />;
  if (user?.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

function AgentRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/connexion" replace />;
  if (user?.role !== "agent" && user?.role !== "admin") return <Navigate to="/immobilier" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <WebSocketProvider>
          <Routes>
          {/* News */}
          <Route path="/" element={<HomePage />} />
          <Route path="/article/:id" element={<ArticleDetailPage />} />
          <Route path="/categorie/:slug" element={<CategoryPage />} />
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/inscription" element={<RegisterPage />} />
          <Route path="/verification" element={<VerifyOTPPage />} />
          <Route path="/profil" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/sauvegardes" element={<PrivateRoute><SavedArticlesPage /></PrivateRoute>} />
          <Route path="/parametres" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
          <Route path="/admin" element={<AuthorRoute><DashboardPage /></AuthorRoute>} />
          <Route path="/admin/nouvelle" element={<AuthorRoute><ArticleFormPage /></AuthorRoute>} />
          <Route path="/admin/modifier/:id" element={<AuthorRoute><ArticleFormPage /></AuthorRoute>} />
          <Route path="/admin/paiements" element={<AuthorRoute><PaymentsAdminPage /></AuthorRoute>} />
          <Route path="/admin/database" element={<AdminRoute><DatabasePage /></AdminRoute>} />

          {/* Immobilier */}
          <Route path="/immobilier" element={<ImmobilierPage />} />
          <Route path="/immobilier/carte" element={<MapPage />} />
          <Route path="/immobilier/alertes" element={<PrivateRoute><SearchAlertsPage /></PrivateRoute>} />
          <Route path="/immobilier/estimation" element={<PriceEstimatePage />} />
          <Route path="/immobilier/:id" element={<PropertyDetailPage />} />
          <Route path="/immobilier/publier" element={<AgentRoute><PropertyFormPage /></AgentRoute>} />
          <Route path="/immobilier/modifier/:id" element={<AgentRoute><PropertyFormPage /></AgentRoute>} />
          <Route path="/mes-annonces" element={<AgentRoute><AgentDashboardPage /></AgentRoute>} />
          <Route path="/agent/:agentId" element={<AgentProfilePage />} />

          {/* Procédures & Démarches */}
          <Route path="/procedures" element={<ProceduresPage />} />
          <Route path="/procedures/:id" element={<ProcedureDetailPage />} />
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
          <ChatHelp />
          <Toaster position="top-right" />
        </WebSocketProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

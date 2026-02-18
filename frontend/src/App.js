import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import ArticleDetailPage from "./pages/ArticleDetailPage";
import LoginPage from "./pages/LoginPage";
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
import ChatHelp from "./components/ChatHelp";
import "./App.css";

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/connexion" replace />;
}

function AuthorRoute({ children }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/connexion" replace />;
  if (user?.role !== "auteur" && user?.role !== "admin") return <Navigate to="/profil" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/connexion" replace />;
  if (user?.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

function AgentRoute({ children }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/connexion" replace />;
  if (user?.role !== "agent" && user?.role !== "auteur" && user?.role !== "admin") return <Navigate to="/immobilier" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* News */}
          <Route path="/" element={<HomePage />} />
          <Route path="/article/:id" element={<ArticleDetailPage />} />
          <Route path="/categorie/:slug" element={<CategoryPage />} />
          <Route path="/connexion" element={<LoginPage />} />
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
          <Route path="/immobilier/:id" element={<PropertyDetailPage />} />
          <Route path="/immobilier/publier" element={<AgentRoute><PropertyFormPage /></AgentRoute>} />
          <Route path="/immobilier/modifier/:id" element={<AgentRoute><PropertyFormPage /></AgentRoute>} />
          <Route path="/mes-annonces" element={<AgentRoute><AgentDashboardPage /></AgentRoute>} />
        </Routes>
        <ChatHelp />
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

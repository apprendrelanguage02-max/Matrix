import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import ArticleDetailPage from "./pages/ArticleDetailPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ArticleFormPage from "./pages/ArticleFormPage";
import ProfilePage from "./pages/ProfilePage";
import "./App.css";

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/connexion" replace />;
}

function AuthorRoute({ children }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/connexion" replace />;
  if (user?.role !== "auteur") return <Navigate to="/profil" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/article/:id" element={<ArticleDetailPage />} />
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/profil" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/admin" element={<AuthorRoute><DashboardPage /></AuthorRoute>} />
          <Route path="/admin/nouvelle" element={<AuthorRoute><ArticleFormPage /></AuthorRoute>} />
          <Route path="/admin/modifier/:id" element={<AuthorRoute><ArticleFormPage /></AuthorRoute>} />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

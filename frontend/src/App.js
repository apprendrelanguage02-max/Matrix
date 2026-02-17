import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import ArticleDetailPage from "./pages/ArticleDetailPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ArticleFormPage from "./pages/ArticleFormPage";
import "./App.css";

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/connexion" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/article/:id" element={<ArticleDetailPage />} />
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/admin" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/admin/nouvelle" element={<PrivateRoute><ArticleFormPage /></PrivateRoute>} />
          <Route path="/admin/modifier/:id" element={<PrivateRoute><ArticleFormPage /></PrivateRoute>} />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

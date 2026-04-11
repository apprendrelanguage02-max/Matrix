// ============================================================================
// ErrorBoundary.js — Attrape les erreurs React pour éviter la page blanche
// ============================================================================
// Sans ce composant, une erreur dans N'IMPORTE QUEL composant enfant fait
// planter toute l'application (page blanche). Avec l'ErrorBoundary, on
// affiche un message d'erreur lisible et un bouton pour réessayer.
// ============================================================================

import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // Méthode React spéciale : appelée quand un composant enfant plante
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // Log l'erreur pour le débogage
  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Erreur attrapée :", error, errorInfo);
  }

  render() {
    // Si une erreur a été attrapée, afficher un écran de secours
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Manrope', sans-serif",
          background: "#fff",
          padding: "2rem",
        }}>
          <div style={{
            width: 64, height: 4, background: "#FF6600",
            borderRadius: 2, marginBottom: 32
          }} />
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111", marginBottom: 8 }}>
            Une erreur est survenue
          </h1>
          <p style={{ color: "#666", fontSize: 14, marginBottom: 24, textAlign: "center", maxWidth: 400 }}>
            L'application a rencontré un problème inattendu. Cliquez ci-dessous pour recharger.
          </p>
          <button
            data-testid="error-boundary-reload"
            onClick={() => window.location.reload()}
            style={{
              background: "#FF6600", color: "#fff", border: "none",
              padding: "12px 32px", borderRadius: 8, fontSize: 14,
              fontWeight: 600, cursor: "pointer",
            }}
          >
            Recharger la page
          </button>
          {/* Afficher le détail de l'erreur en mode développement */}
          {process.env.NODE_ENV === "development" && this.state.error && (
            <pre style={{
              marginTop: 24, padding: 16, background: "#f5f5f5",
              borderRadius: 8, fontSize: 11, color: "#c00",
              maxWidth: "90vw", overflow: "auto",
            }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    // Pas d'erreur → afficher les composants enfants normalement
    return this.props.children;
  }
}

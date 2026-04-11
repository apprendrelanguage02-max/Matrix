import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

export function AuthGateOverlay({ color = "#FF6600" }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="auth-gate-overlay">
      <div className="bg-white rounded-lg max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${color}15` }}>
          <Lock className="w-8 h-8" style={{ color }} />
        </div>
        <h2 className="font-['Oswald'] text-xl font-bold uppercase tracking-tight text-black mb-2">
          Contenu reserve aux membres
        </h2>
        <p className="text-sm text-zinc-600 mb-6 leading-relaxed">
          Connectez-vous ou creez un compte gratuit pour acceder aux details complets.
        </p>
        <div className="space-y-3">
          <Link to="/connexion" data-testid="auth-gate-login-btn"
            className="block w-full text-white font-bold uppercase text-sm py-3 px-4 rounded-md transition-colors"
            style={{ background: color }}>
            Se connecter
          </Link>
          <Link to="/inscription" data-testid="auth-gate-register-btn"
            className="block w-full border-2 border-zinc-200 text-zinc-700 font-bold uppercase text-sm py-3 px-4 rounded-md hover:border-current transition-colors"
            style={{ '--tw-border-opacity': 1 }}>
            Creer un compte
          </Link>
        </div>
      </div>
    </div>
  );
}

export function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function getEmbedUrl(url) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  return null;
}

export function VideoPlayer({ url, testId }) {
  if (!url) return null;
  const embedUrl = getEmbedUrl(url);
  if (embedUrl) {
    return (
      <div className="aspect-video rounded-lg overflow-hidden bg-black" data-testid={testId}>
        <iframe src={embedUrl} title="Video" className="w-full h-full" allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
      </div>
    );
  }
  return (
    <div className="aspect-video rounded-lg overflow-hidden bg-black" data-testid={testId}>
      <video src={url} controls className="w-full h-full" />
    </div>
  );
}

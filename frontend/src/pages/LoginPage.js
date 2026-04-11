import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { toast } from "sonner";
import { Loader2, Mail, Lock, Eye, EyeOff, ChevronRight } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email) return setError("L'adresse email est requise.");
    if (!password) return setError("Le mot de passe est requis.");

    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      login(res.data.user, res.data.token);
      toast.success(`Bienvenue, ${res.data.user.full_name || res.data.user.username} !`);

      if (res.data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      const detail = err.response?.data?.detail || "Erreur de connexion.";
      if (detail.includes("pas encore verifie")) {
        toast.info("Verifiez votre email pour activer votre compte.");
        navigate(`/verification?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-['Manrope']">
      <div className="bg-black h-2" />
      <div className="h-1.5 bg-[#FF6600]" />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-16">
        <Link to="/" className="flex items-center gap-2 mb-8 group">
          <img src="/nimba-logo.png" alt="Matrix News" className="w-9 h-9 object-contain" />
          <span className="font-['Oswald'] text-2xl font-bold tracking-widest uppercase text-black group-hover:text-[#FF6600] transition-colors">
            Matrix News
          </span>
        </Link>

        <div className="w-full max-w-md">
          {/* Tab bar */}
          <div className="flex border-b-2 border-zinc-200 mb-6">
            <Link to="/inscription" className="flex-1 py-3 text-center text-sm font-bold uppercase tracking-widest text-zinc-400 hover:text-black transition-colors">
              Inscription
            </Link>
            <div className="flex-1 py-3 text-center text-sm font-bold uppercase tracking-widest border-b-2 border-[#FF6600] text-[#FF6600] -mb-0.5">
              Connexion
            </div>
          </div>

          <div className="border border-zinc-200 bg-white p-6 sm:p-8" data-testid="login-form-container">
            <h1 className="font-['Oswald'] text-2xl sm:text-3xl font-bold uppercase tracking-tight text-black mb-1">
              Se connecter
            </h1>
            <p className="text-sm text-zinc-500 mb-6">Accedez a votre compte Matrix News</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-5" data-testid="login-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
              {/* Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(null); }}
                    data-testid="login-email-input" placeholder="vous@exemple.com"
                    className="w-full border border-zinc-300 pl-10 pr-4 py-3 text-sm text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input type={showPassword ? "text" : "password"} value={password} onChange={e => { setPassword(e.target.value); setError(null); }}
                    data-testid="login-password-input" placeholder="Votre mot de passe"
                    className="w-full border border-zinc-300 pl-10 pr-10 py-3 text-sm text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors" />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} data-testid="login-submit-btn"
                className="w-full bg-[#FF6600] text-white font-bold uppercase tracking-wider py-3.5 hover:bg-[#CC5200] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Connexion...</> : <>Se connecter <ChevronRight className="w-4 h-4" /></>}
              </button>
            </form>

            <p className="text-sm text-center text-zinc-500 mt-5">
              Pas encore de compte ?{" "}
              <Link to="/inscription" className="text-[#FF6600] font-bold hover:text-[#CC5200] transition-colors" data-testid="go-register-link">
                S'inscrire
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-zinc-400 mt-4">
            <Link to="/" className="hover:text-[#FF6600] transition-colors">&larr; Retour a l'accueil</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "", role: "visiteur" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ouvrir directement l'onglet inscription si ?tab=register
  useEffect(() => {
    if (searchParams.get("tab") === "register") {
      setTab("register");
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
  };

  const switchTab = (t) => {
    setTab(t);
    setError(null);
    setForm({ username: "", email: "", password: "", confirmPassword: "", role: "visiteur" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (tab === "register") {
      if (!form.username.trim()) return setError("Le nom d'utilisateur est requis.");
      if (!form.email) return setError("L'email est requis.");
      if (form.password.length < 6) return setError("Le mot de passe doit contenir au moins 6 caractères.");
      if (form.password !== form.confirmPassword) return setError("Les mots de passe ne correspondent pas.");
    } else {
      if (!form.email || !form.password) return setError("Veuillez remplir tous les champs.");
    }

    setLoading(true);
    try {
      const endpoint = tab === "login" ? "/auth/login" : "/auth/register";
      const payload = tab === "login"
        ? { email: form.email, password: form.password }
        : { username: form.username, email: form.email, password: form.password, role: form.role || "visiteur" };

      const res = await api.post(endpoint, payload);
      login(res.data.token, res.data.user);
      toast.success(tab === "login" ? "Connexion réussie !" : "Compte créé avec succès !");
      if ((form.role === "agent") && tab === "register") {
        navigate("/immobilier");
      } else {
        navigate("/profil");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-['Manrope']">
      <div className="bg-black h-2" />
      <div className="h-1.5 bg-[#FF6600]" />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mb-10 group">
          <img
            src="https://customer-assets.emergentagent.com/job_2b66c898-0ce0-4fc9-a685-24a9ac754e60/artifacts/p7stxwf9_ChatGPT%20Image%20Feb%2017%2C%202026%2C%2005_57_11%20PM.png"
            alt="Matrix News Logo"
            className="w-9 h-9 object-contain"
          />
          <span className="font-['Oswald'] text-2xl font-bold tracking-widest uppercase text-black group-hover:text-[#FF6600] transition-colors duration-200">
            Matrix News
          </span>
        </Link>

        <div className="w-full max-w-md">
          {/* Tabs */}
          <div className="flex border-b-2 border-zinc-200 mb-8">
            <button
              onClick={() => switchTab("login")}
              data-testid="tab-login"
              className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest font-['Manrope'] transition-colors duration-200 ${
                tab === "login"
                  ? "border-b-2 border-[#FF6600] text-[#FF6600] -mb-0.5"
                  : "text-zinc-400 hover:text-black"
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => switchTab("register")}
              data-testid="tab-register"
              className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest font-['Manrope'] transition-colors duration-200 ${
                tab === "register"
                  ? "border-b-2 border-[#FF6600] text-[#FF6600] -mb-0.5"
                  : "text-zinc-400 hover:text-black"
              }`}
            >
              Créer un compte
            </button>
          </div>

          {/* Card */}
          <div className="border border-zinc-200 bg-white p-8 md:p-10">
            <h1 className="font-['Oswald'] text-3xl font-bold uppercase tracking-tight text-black mb-1">
              {tab === "login" ? "Connexion" : "Inscription"}
            </h1>
            <p className="font-['Manrope'] text-sm text-zinc-500 mb-8">
              {tab === "login"
                ? "Accédez à votre espace personnel"
                : "Créez votre compte visiteur gratuitement"}
            </p>

            {error && (
              <div
                className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6 font-['Manrope']"
                data-testid="auth-error"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} data-testid="auth-form" className="space-y-5">
              {/* Username - register only */}
              {tab === "register" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                    Nom d'utilisateur
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    data-testid="username-input"
                    placeholder="Votre pseudo"
                    className="w-full border border-zinc-300 px-4 py-3 text-base font-['Manrope'] text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  data-testid="email-input"
                  placeholder="vous@exemple.com"
                  className="w-full border border-zinc-300 px-4 py-3 text-base font-['Manrope'] text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                  Mot de passe
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  data-testid="password-input"
                  placeholder="••••••••"
                  className="w-full border border-zinc-300 px-4 py-3 text-base font-['Manrope'] text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors"
                />
                {tab === "register" && (
                  <p className="text-xs text-zinc-400 mt-1">Minimum 6 caractères</p>
                )}
              </div>

              {tab === "register" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    data-testid="confirm-password-input"
                    placeholder="••••••••"
                    className="w-full border border-zinc-300 px-4 py-3 text-base font-['Manrope'] text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors"
                  />
                </div>
              )}

              {/* Role selection - register only */}
              {tab === "register" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                    Je m'inscris en tant que
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleChange({ target: { name: "role", value: "visiteur" } })}
                      className={`py-3 px-4 border-2 text-sm font-bold font-['Manrope'] transition-all ${
                        (form.role || "visiteur") === "visiteur"
                          ? "border-[#FF6600] bg-orange-50 text-[#FF6600]"
                          : "border-zinc-200 text-zinc-500 hover:border-zinc-400"
                      }`}
                    >
                      👤 Visiteur
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange({ target: { name: "role", value: "agent" } })}
                      data-testid="role-agent-btn"
                      className={`py-3 px-4 border-2 text-sm font-bold font-['Manrope'] transition-all ${
                        form.role === "agent"
                          ? "border-blue-600 bg-blue-50 text-blue-600"
                          : "border-zinc-200 text-zinc-500 hover:border-zinc-400"
                      }`}
                    >
                      🏘 Agent immobilier
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                data-testid="auth-submit-button"
                className="w-full bg-[#FF6600] text-white font-bold font-['Manrope'] uppercase tracking-wider py-3 hover:bg-[#CC5200] transition-colors duration-200 disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading
                  ? tab === "login" ? "Connexion..." : "Création..."
                  : tab === "login" ? "Se connecter" : "Créer mon compte"
                }
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-zinc-400 mt-6 font-['Manrope']">
            <Link to="/" className="hover:text-[#FF6600] transition-colors">
              &larr; Retour à l'accueil
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { toast } from "sonner";
import { Loader2, Newspaper } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.email || !form.password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/login", form);
      login(res.data.token, res.data.user);
      toast.success("Connexion réussie !");
      navigate("/admin");
    } catch (err) {
      const msg = err.response?.data?.detail || "Email ou mot de passe incorrect.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-['Manrope']">
      {/* Top bar */}
      <div className="bg-black h-2" />
      <div className="h-1.5 bg-[#FF6600]" />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mb-12 group">
          <Newspaper className="w-7 h-7 text-[#FF6600]" />
          <span className="font-['Oswald'] text-2xl font-bold tracking-widest uppercase text-black group-hover:text-[#FF6600] transition-colors duration-200">
            NewsApp
          </span>
        </Link>

        <div className="w-full max-w-md">
          {/* Card */}
          <div className="border border-zinc-200 bg-white p-8 md:p-10">
            <h1 className="font-['Oswald'] text-3xl font-bold uppercase tracking-tight text-black mb-1">
              Connexion
            </h1>
            <p className="font-['Manrope'] text-sm text-zinc-500 mb-8">
              Accédez à votre espace auteur
            </p>

            {error && (
              <div
                className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6 font-['Manrope']"
                data-testid="login-error"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} data-testid="login-form" className="space-y-5">
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
                  placeholder="auteur@exemple.com"
                  className="w-full border border-zinc-300 px-4 py-3 text-base font-['Manrope'] text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors"
                  required
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
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                data-testid="login-submit-button"
                className="w-full bg-[#FF6600] text-white font-bold font-['Manrope'] uppercase tracking-wider py-3 hover:bg-[#CC5200] transition-colors duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? "Connexion..." : "Se connecter"}
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

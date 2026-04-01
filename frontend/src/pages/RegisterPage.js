import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { toast } from "sonner";
import { Loader2, Mail, User, Lock, Phone, Eye, EyeOff, ShieldCheck, ChevronRight } from "lucide-react";

const ROLES = [
  { value: "visiteur", label: "Visiteur", desc: "Lire les articles et annonces", color: "#FF6600" },
  { value: "auteur", label: "Auteur", desc: "Publier des articles", color: "#9333EA" },
  { value: "agent", label: "Agent immobilier", desc: "Publier des annonces", color: "#2563EB" },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "", username: "", email: "", phone: "", password: "", confirmPassword: "", role: "visiteur",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.full_name.trim()) return setError("Le nom complet est requis.");
    if (!form.username.trim()) return setError("Le nom d'utilisateur est requis.");
    if (!form.email) return setError("L'adresse email est requise.");
    if (form.password.length < 6) return setError("Le mot de passe doit contenir au moins 6 caracteres.");
    if (form.password !== form.confirmPassword) return setError("Les mots de passe ne correspondent pas.");

    setLoading(true);
    try {
      const res = await api.post("/auth/register", {
        full_name: form.full_name,
        username: form.username,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        role: form.role,
      });
      const otpSent = res.data?.otp_sent === true;
      toast.success(otpSent ? "Compte cree ! Un code a ete envoye a votre email." : "Compte cree ! Verifiez votre email.");
      navigate(`/verification?email=${encodeURIComponent(form.email)}${otpSent ? "&sent=1" : ""}`);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || "Erreur lors de l'inscription.");
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
          <img src="/Matrix.png" alt="Matrix News" className="w-9 h-9 object-contain" />
          <span className="font-['Oswald'] text-2xl font-bold tracking-widest uppercase text-black group-hover:text-[#FF6600] transition-colors">
            Matrix News
          </span>
        </Link>

        <div className="w-full max-w-md">
          {/* Tab bar */}
          <div className="flex border-b-2 border-zinc-200 mb-6">
            <div className="flex-1 py-3 text-center text-sm font-bold uppercase tracking-widest border-b-2 border-[#FF6600] text-[#FF6600] -mb-0.5">
              Inscription
            </div>
            <Link to="/connexion" className="flex-1 py-3 text-center text-sm font-bold uppercase tracking-widest text-zinc-400 hover:text-black transition-colors">
              Connexion
            </Link>
          </div>

          <div className="border border-zinc-200 bg-white p-6 sm:p-8" data-testid="register-form-container">
            <h1 className="font-['Oswald'] text-2xl sm:text-3xl font-bold uppercase tracking-tight text-black mb-1">Creer un compte</h1>
            <p className="text-sm text-zinc-500 mb-6">Rejoignez la communaute Matrix News</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-5" data-testid="register-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
              {/* Full name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Nom complet</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input type="text" name="full_name" value={form.full_name} onChange={handleChange}
                    data-testid="fullname-input" placeholder="Mamadou Diallo"
                    className="w-full border border-zinc-300 pl-10 pr-4 py-3 text-sm text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors" />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Nom d'utilisateur</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-bold">@</span>
                  <input type="text" name="username" value={form.username} onChange={handleChange}
                    data-testid="username-input" placeholder="mamadou_d"
                    className="w-full border border-zinc-300 pl-10 pr-4 py-3 text-sm text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input type="email" name="email" value={form.email} onChange={handleChange}
                    data-testid="email-input" placeholder="vous@exemple.com"
                    className="w-full border border-zinc-300 pl-10 pr-4 py-3 text-sm text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors" />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Telephone <span className="text-zinc-300 normal-case">(optionnel)</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange}
                    data-testid="phone-input" placeholder="+224 6XX XXX XXX"
                    className="w-full border border-zinc-300 pl-10 pr-4 py-3 text-sm text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange}
                    data-testid="password-input" placeholder="Minimum 6 caracteres"
                    className="w-full border border-zinc-300 pl-10 pr-10 py-3 text-sm text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors" />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input type={showPassword ? "text" : "password"} name="confirmPassword" value={form.confirmPassword} onChange={handleChange}
                    data-testid="confirm-password-input" placeholder="Retapez votre mot de passe"
                    className="w-full border border-zinc-300 pl-10 pr-4 py-3 text-sm text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors" />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Type de compte</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(({ value, label, desc, color }) => (
                    <button key={value} type="button" onClick={() => setForm(f => ({ ...f, role: value }))}
                      data-testid={`role-${value}-btn`}
                      className={`py-3 px-2 border-2 text-center transition-all ${
                        form.role === value
                          ? `border-[${color}] bg-[${color}]/5`
                          : "border-zinc-200 hover:border-zinc-400"
                      }`}
                      style={form.role === value ? { borderColor: color, backgroundColor: `${color}10` } : {}}>
                      <p className="text-xs font-bold" style={form.role === value ? { color } : { color: "#71717a" }}>{label}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5 leading-tight hidden sm:block">{desc}</p>
                    </button>
                  ))}
                </div>
                {(form.role === "auteur" || form.role === "agent") && (
                  <div className="flex items-start gap-2 mt-2 bg-amber-50 border border-amber-200 px-3 py-2 rounded">
                    <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      Les comptes {form.role === "auteur" ? "Auteur" : "Agent"} necessitent une validation par l'equipe Matrix News.
                      Votre profil sera eligible a la verification de confiance.
                    </p>
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading} data-testid="register-submit-btn"
                className="w-full bg-[#FF6600] text-white font-bold uppercase tracking-wider py-3.5 hover:bg-[#CC5200] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creation du compte...</> : <>Continuer <ChevronRight className="w-4 h-4" /></>}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-zinc-400 mt-4">
            <Link to="/" className="hover:text-[#FF6600] transition-colors">&larr; Retour a l'accueil</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { toast } from "sonner";
import { Loader2, Mail, Phone, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState("login");

  // Registration steps: "form" | "otp"
  const [regStep, setRegStep] = useState("form");
  const [contactMethod, setContactMethod] = useState("email"); // "email" | "phone"

  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "visiteur",
  });
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState(null); // shown in dev mode when no email service

  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState(null);
  const [otpTimer, setOtpTimer] = useState(0); // countdown to allow resend

  // ?tab=register auto-switch
  useEffect(() => {
    if (searchParams.get("tab") === "register") setTab("register");
  }, [searchParams]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (otpTimer <= 0) return;
    const t = setTimeout(() => setOtpTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [otpTimer]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
  };

  const switchTab = (t) => {
    setTab(t);
    setRegStep("form");
    setError(null);
    setDevOtp(null);
    setOtp("");
    setForm({ username: "", email: "", phone: "", password: "", confirmPassword: "", role: "visiteur" });
  };

  // ── STEP 1: Send OTP ────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.username.trim()) return setError("Le nom d'utilisateur est requis.");
    if (contactMethod === "email" && !form.email) return setError("L'adresse email est requise.");
    if (contactMethod === "phone" && !form.phone) return setError("Le numéro de téléphone est requis.");
    if (form.password.length < 6) return setError("Le mot de passe doit contenir au moins 6 caractères.");
    if (form.password !== form.confirmPassword) return setError("Les mots de passe ne correspondent pas.");

    // If phone-only: require email for OTP (SMS not yet integrated)
    if (contactMethod === "phone") {
      if (!form.email) {
        return setError("Veuillez entrer votre email pour recevoir le code de vérification (SMS bientôt disponible).");
      }
    }

    setOtpLoading(true);
    try {
      const res = await api.post("/auth/send-otp", { email: form.email });
      if (!res.data.sent && res.data.dev_otp) {
        setDevOtp(res.data.dev_otp);
        toast.info("Mode test : le service email n'est pas encore configuré.");
      } else {
        setDevOtp(null);
        toast.success(`Code envoyé à ${form.email}`);
      }
      setRegStep("otp");
      setOtpTimer(60);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'envoi du code.");
    } finally {
      setOtpLoading(false);
    }
  };

  // ── STEP 2: Verify OTP + Register ───────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);

    const codeToVerify = devOtp || otp;
    if (!codeToVerify || codeToVerify.length !== 6) {
      return setError("Entrez le code à 6 chiffres.");
    }

    setLoading(true);
    try {
      const payload = {
        username: form.username,
        email: form.email,
        password: form.password,
        role: form.role || "visiteur",
        phone: form.phone || undefined,
        otp: codeToVerify,
      };
      const res = await api.post("/auth/register", payload);
      const userData = res.data.user;
      login(res.data.token, userData);

      if (userData.status === "pending") {
        toast.info("Votre demande de rôle professionnel est en cours de validation par le groupe MatrixNews.");
        navigate("/profil");
      } else {
        toast.success("Compte créé avec succès !");
        navigate("/profil");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de la vérification.");
    } finally {
      setLoading(false);
    }
  };

  // ── Login ────────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.email || !form.password) return setError("Veuillez remplir tous les champs.");

    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email: form.email, password: form.password });
      login(res.data.token, res.data.user);
      toast.success("Connexion réussie !");
      navigate("/profil");
    } catch (err) {
      setError(err.response?.data?.detail || "Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP digit input helper ────────────────────────────────────────────────────
  const handleOtpChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(val);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-['Manrope']">
      <div className="bg-black h-2" />
      <div className="h-1.5 bg-[#FF6600]" />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mb-10 group">
          <img
            src="/nimba-logo.png"
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

            {/* ── LOGIN ────────────────────────────────────────────────────── */}
            {tab === "login" && (
              <>
                <h1 className="font-['Oswald'] text-3xl font-bold uppercase tracking-tight text-black mb-1">Connexion</h1>
                <p className="font-['Manrope'] text-sm text-zinc-500 mb-8">Accédez à votre espace personnel</p>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6" data-testid="auth-error">
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin} data-testid="auth-form" className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Email</label>
                    <input
                      type="email" name="email" value={form.email} onChange={handleChange}
                      data-testid="email-input" placeholder="vous@exemple.com"
                      className="w-full border border-zinc-300 px-4 py-3 text-base font-['Manrope'] text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Mot de passe</label>
                    <input
                      type="password" name="password" value={form.password} onChange={handleChange}
                      data-testid="password-input" placeholder="••••••••"
                      className="w-full border border-zinc-300 px-4 py-3 text-base font-['Manrope'] text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors"
                    />
                  </div>
                  <button
                    type="submit" disabled={loading} data-testid="auth-submit-button"
                    className="w-full bg-[#FF6600] text-white font-bold font-['Manrope'] uppercase tracking-wider py-3 hover:bg-[#CC5200] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Connexion...</> : "Se connecter"}
                  </button>
                </form>
              </>
            )}

            {/* ── REGISTER — STEP 1: FORM ───────────────────────────────────── */}
            {tab === "register" && regStep === "form" && (
              <>
                <h1 className="font-['Oswald'] text-3xl font-bold uppercase tracking-tight text-black mb-1">Inscription</h1>
                <p className="font-['Manrope'] text-sm text-zinc-500 mb-6">Créez votre compte gratuitement</p>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6" data-testid="auth-error">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSendOtp} data-testid="auth-form" className="space-y-5">
                  {/* Username */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Nom d'utilisateur</label>
                    <input
                      type="text" name="username" value={form.username} onChange={handleChange}
                      data-testid="username-input" placeholder="Votre pseudo"
                      className="w-full border border-zinc-300 px-4 py-3 text-base font-['Manrope'] text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors"
                    />
                  </div>

                  {/* Contact method toggle */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Méthode de contact</label>
                    <div className="flex gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => { setContactMethod("email"); setError(null); }}
                        data-testid="method-email-btn"
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 border-2 text-sm font-bold transition-all ${
                          contactMethod === "email"
                            ? "border-[#FF6600] bg-orange-50 text-[#FF6600]"
                            : "border-zinc-200 text-zinc-500 hover:border-zinc-400"
                        }`}
                      >
                        <Mail className="w-4 h-4" /> Email
                      </button>
                      <button
                        type="button"
                        onClick={() => { setContactMethod("phone"); setError(null); }}
                        data-testid="method-phone-btn"
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 border-2 text-sm font-bold transition-all ${
                          contactMethod === "phone"
                            ? "border-[#FF6600] bg-orange-50 text-[#FF6600]"
                            : "border-zinc-200 text-zinc-500 hover:border-zinc-400"
                        }`}
                      >
                        <Phone className="w-4 h-4" /> Téléphone
                      </button>
                    </div>

                    {contactMethod === "email" && (
                      <input
                        type="email" name="email" value={form.email} onChange={handleChange}
                        data-testid="email-input" placeholder="vous@exemple.com"
                        className="w-full border border-zinc-300 px-4 py-3 text-base font-['Manrope'] text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors"
                      />
                    )}
                    {contactMethod === "phone" && (
                      <div>
                        <input
                          type="tel" name="phone" value={form.phone} onChange={handleChange}
                          data-testid="phone-input" placeholder="+224 6XX XXX XXX"
                          className="w-full border border-zinc-300 px-4 py-3 text-base font-['Manrope'] text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors"
                        />
                        <p className="text-xs text-amber-600 mt-2 font-['Manrope']">La vérification par SMS arrive bientôt. Entrez votre email ci-dessous pour recevoir votre code :</p>
                        <input
                          type="email" name="email" value={form.email} onChange={handleChange}
                          data-testid="email-input" placeholder="Email pour recevoir le code *"
                          className="w-full mt-2 border border-zinc-300 px-4 py-3 text-base font-['Manrope'] text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors"
                        />
                      </div>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Mot de passe</label>
                    <input
                      type="password" name="password" value={form.password} onChange={handleChange}
                      data-testid="password-input" placeholder="••••••••"
                      className="w-full border border-zinc-300 px-4 py-3 text-base font-['Manrope'] text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors"
                    />
                    <p className="text-xs text-zinc-400 mt-1">Minimum 6 caractères</p>
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Confirmer le mot de passe</label>
                    <input
                      type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange}
                      data-testid="confirm-password-input" placeholder="••••••••"
                      className="w-full border border-zinc-300 px-4 py-3 text-base font-['Manrope'] text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Je m'inscris en tant que</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "visiteur", label: "Visiteur", active: "border-[#FF6600] bg-orange-50 text-[#FF6600]" },
                        { value: "auteur", label: "Auteur", active: "border-purple-600 bg-purple-50 text-purple-600" },
                        { value: "agent", label: "Agent", active: "border-blue-600 bg-blue-50 text-blue-600" },
                      ].map(({ value, label, active }) => (
                        <button
                          key={value} type="button"
                          onClick={() => handleChange({ target: { name: "role", value } })}
                          data-testid={`role-${value}-btn`}
                          className={`py-3 px-3 border-2 text-sm font-bold font-['Manrope'] transition-all ${
                            (form.role || "visiteur") === value ? active : "border-zinc-200 text-zinc-500 hover:border-zinc-400"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {(form.role === "auteur" || form.role === "agent") && (
                      <p className="text-xs text-amber-600 mt-2">
                        Les comptes Auteur et Agent nécessitent une validation par le groupe MatrixNews.
                      </p>
                    )}
                  </div>

                  <button
                    type="submit" disabled={otpLoading} data-testid="send-otp-btn"
                    className="w-full bg-black text-white font-bold font-['Manrope'] uppercase tracking-wider py-3 hover:bg-zinc-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                  >
                    {otpLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi du code...</>
                      : contactMethod === "email"
                        ? "Envoyer le code de vérification"
                        : "Continuer l'inscription"
                    }
                  </button>
                </form>
              </>
            )}

            {/* ── REGISTER — STEP 2: OTP VERIFICATION ──────────────────────── */}
            {tab === "register" && regStep === "otp" && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <CheckCircle className="w-8 h-8 text-[#FF6600] flex-shrink-0" />
                  <div>
                    <h1 className="font-['Oswald'] text-2xl font-bold uppercase tracking-tight text-black">Vérification</h1>
                    <p className="text-sm text-zinc-500">
                      {devOtp
                        ? "Mode test — service email non configuré"
                        : `Code envoyé à ${form.email}`
                      }
                    </p>
                  </div>
                </div>

                {/* Dev mode: show OTP directly */}
                {devOtp && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 mb-5">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
                      Mode développement — Code de test :
                    </p>
                    <p className="text-3xl font-bold tracking-[0.5em] text-black font-mono">{devOtp}</p>
                    <p className="text-xs text-amber-600 mt-1">
                      Ce code s'affiche uniquement car le service email n'est pas encore configuré.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-5" data-testid="auth-error">
                    {error}
                  </div>
                )}

                <form onSubmit={handleRegister} data-testid="otp-form" className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                      Code à 6 chiffres
                    </label>
                    <input
                      type="text" inputMode="numeric" pattern="[0-9]*"
                      value={otp} onChange={handleOtpChange}
                      data-testid="otp-input"
                      placeholder="_ _ _ _ _ _"
                      maxLength={6}
                      autoFocus
                      className="w-full border-2 border-zinc-300 px-4 py-4 text-center text-3xl font-bold tracking-[0.5em] font-mono text-black focus:outline-none focus:border-[#FF6600] transition-colors"
                    />
                  </div>

                  <button
                    type="submit" disabled={loading || (!devOtp && otp.length < 6)}
                    data-testid="auth-submit-button"
                    className="w-full bg-[#FF6600] text-white font-bold font-['Manrope'] uppercase tracking-wider py-3 hover:bg-[#CC5200] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Création du compte...</>
                      : "Valider et créer mon compte"
                    }
                  </button>

                  {/* Resend OTP */}
                  <div className="text-center">
                    {otpTimer > 0 ? (
                      <p className="text-xs text-zinc-400">
                        Renvoyer le code dans {otpTimer}s
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setRegStep("form"); setOtp(""); setDevOtp(null); setError(null); }}
                        className="text-xs text-[#FF6600] hover:underline"
                      >
                        Renvoyer un code
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => { setRegStep("form"); setOtp(""); setDevOtp(null); setError(null); }}
                    className="w-full text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    ← Modifier mes informations
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="text-center text-xs text-zinc-400 mt-6 font-['Manrope']">
            <Link to="/" className="hover:text-[#FF6600] transition-colors">
              &larr;
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

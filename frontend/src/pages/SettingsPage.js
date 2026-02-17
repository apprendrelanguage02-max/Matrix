import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { toast } from "sonner";
import { Loader2, ArrowLeft, User, Mail, Phone, Globe, MapPin, FileText, Camera, Lock, Eye, EyeOff } from "lucide-react";

function InputField({ label, name, value, onChange, type = "text", placeholder, icon: Icon, hint }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        data-testid={`settings-${name}`}
        className="w-full border border-zinc-300 px-4 py-3 text-base font-['Manrope'] text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors"
      />
      {hint && <p className="text-xs text-zinc-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    username: user?.username || "",
    email: user?.email || "",
    phone: user?.phone || "",
    country: user?.country || "",
    address: user?.address || "",
    avatar_url: user?.avatar_url || "",
    bio: user?.bio || "",
  });

  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  const handleProfileChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });
  const handlePwdChange = (e) => setPasswords({ ...passwords, [e.target.name]: e.target.value });

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile.username.trim()) return toast.error("Le nom d'utilisateur est requis.");
    if (!profile.email.trim()) return toast.error("L'email est requis.");
    setSavingProfile(true);
    try {
      const payload = {};
      if (profile.username !== user?.username) payload.username = profile.username;
      if (profile.email !== user?.email) payload.email = profile.email;
      if (profile.phone !== (user?.phone || "")) payload.phone = profile.phone || null;
      if (profile.country !== (user?.country || "")) payload.country = profile.country || null;
      if (profile.address !== (user?.address || "")) payload.address = profile.address || null;
      if (profile.avatar_url !== (user?.avatar_url || "")) payload.avatar_url = profile.avatar_url || null;
      if (profile.bio !== (user?.bio || "")) payload.bio = profile.bio || null;

      const res = await api.put("/auth/profile", payload);
      updateUser(res.data);
      toast.success("Profil mis à jour avec succès !");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de la mise à jour.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!passwords.current_password) return toast.error("Saisissez votre mot de passe actuel.");
    if (passwords.new_password.length < 6) return toast.error("Le nouveau mot de passe doit contenir au moins 6 caractères.");
    if (passwords.new_password !== passwords.confirm_password) return toast.error("Les mots de passe ne correspondent pas.");
    setSavingPassword(true);
    try {
      await api.put("/auth/password", {
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      toast.success("Mot de passe modifié avec succès !");
      setPasswords({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors du changement.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />
      <div className="h-1.5 bg-[#FF6600]" />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500 hover:text-[#FF6600] transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>

        <h1 className="font-['Oswald'] text-3xl font-bold uppercase tracking-tight text-black mb-8">
          Paramètres
        </h1>

        {/* ── Section 1: Profil ── */}
        <form onSubmit={handleSaveProfile} data-testid="profile-settings-form" className="bg-white border border-zinc-200 p-8 mb-6">
          <h2 className="font-['Oswald'] text-xl font-bold uppercase tracking-tight text-black mb-6 pb-3 border-b border-zinc-100">
            Informations personnelles
          </h2>

          {/* Avatar preview */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-zinc-200 flex items-center justify-center bg-zinc-100 flex-shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display="none"; }} />
              ) : (
                <span className="font-['Oswald'] text-xl font-bold text-zinc-400">
                  {profile.username.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3" />
                Photo de profil (URL)
              </label>
              <input
                type="url"
                name="avatar_url"
                value={profile.avatar_url}
                onChange={handleProfileChange}
                data-testid="settings-avatar_url"
                placeholder="https://exemple.com/photo.jpg"
                className="w-full border border-zinc-300 px-3 py-2.5 text-sm font-['Manrope'] text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputField label="Nom d'utilisateur" name="username" value={profile.username} onChange={handleProfileChange} placeholder="Votre pseudo" icon={User} />
            <InputField label="Email" name="email" value={profile.email} onChange={handleProfileChange} type="email" placeholder="vous@exemple.com" icon={Mail} />
            <InputField label="Téléphone" name="phone" value={profile.phone} onChange={handleProfileChange} placeholder="+33 6 00 00 00 00" icon={Phone} />
            <InputField label="Pays" name="country" value={profile.country} onChange={handleProfileChange} placeholder="France" icon={Globe} />
          </div>

          <div className="mt-5">
            <InputField label="Adresse" name="address" value={profile.address} onChange={handleProfileChange} placeholder="12 rue de la Paix, 75001 Paris" icon={MapPin} />
          </div>

          <div className="mt-5">
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1.5">
              <FileText className="w-3 h-3" />
              Biographie (optionnel)
            </label>
            <textarea
              name="bio"
              value={profile.bio}
              onChange={handleProfileChange}
              data-testid="settings-bio"
              rows={3}
              placeholder="Quelques mots sur vous..."
              maxLength={500}
              className="w-full border border-zinc-300 px-4 py-3 text-sm font-['Manrope'] text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors resize-none"
            />
            <p className="text-xs text-zinc-400 mt-1">{profile.bio.length}/500</p>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-zinc-100">
            <button
              type="submit"
              disabled={savingProfile}
              data-testid="save-profile-btn"
              className="inline-flex items-center gap-2 bg-[#FF6600] text-white font-bold font-['Manrope'] uppercase tracking-wider px-6 py-2.5 hover:bg-[#CC5200] transition-colors disabled:opacity-60"
            >
              {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
              {savingProfile ? "Sauvegarde..." : "Sauvegarder"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 text-sm font-bold font-['Manrope'] uppercase tracking-wider border border-zinc-300 text-zinc-500 hover:border-black hover:text-black transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>

        {/* ── Section 2: Sécurité ── */}
        <form onSubmit={handleSavePassword} data-testid="password-settings-form" className="bg-white border border-zinc-200 p-8">
          <h2 className="font-['Oswald'] text-xl font-bold uppercase tracking-tight text-black mb-6 pb-3 border-b border-zinc-100 flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#FF6600]" />
            Sécurité
          </h2>

          <div className="space-y-4">
            {[
              { label: "Mot de passe actuel", name: "current_password", key: "current" },
              { label: "Nouveau mot de passe", name: "new_password", key: "new", hint: "Minimum 6 caractères" },
              { label: "Confirmer le nouveau mot de passe", name: "confirm_password", key: "confirm" },
            ].map(({ label, name, key, hint }) => (
              <div key={name}>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">{label}</label>
                <div className="relative">
                  <input
                    type={showPwd[key] ? "text" : "password"}
                    name={name}
                    value={passwords[name]}
                    onChange={handlePwdChange}
                    data-testid={`settings-${name}`}
                    placeholder="••••••••"
                    className="w-full border border-zinc-300 px-4 py-3 pr-10 text-base font-['Manrope'] text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((p) => ({ ...p, [key]: !p[key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors"
                  >
                    {showPwd[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {hint && <p className="text-xs text-zinc-400 mt-1">{hint}</p>}
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-zinc-100">
            <button
              type="submit"
              disabled={savingPassword}
              data-testid="save-password-btn"
              className="inline-flex items-center gap-2 bg-black text-white font-bold font-['Manrope'] uppercase tracking-wider px-6 py-2.5 hover:bg-zinc-800 transition-colors disabled:opacity-60"
            >
              {savingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
              {savingPassword ? "Modification..." : "Changer le mot de passe"}
            </button>
          </div>
        </form>
      </main>

      <footer className="bg-black text-zinc-400 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <span className="font-['Oswald'] text-white font-bold tracking-widest uppercase">Matrix News</span>
          <p className="font-['Manrope'] text-xs">&copy; {new Date().getFullYear()} — Tous droits réservés</p>
        </div>
      </footer>
    </div>
  );
}

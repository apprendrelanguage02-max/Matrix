import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import Header from "../components/Header";
import api from "../lib/api";
import { LogOut, User, Mail, Shield, Calendar, ArrowLeft, Clock, CheckCircle, XCircle, Bell } from "lucide-react";
import { toast } from "sonner";

function formatDate(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function getInitials(username) {
  if (!username) return "?";
  return username.slice(0, 2).toUpperCase();
}

function getAvatarColor(username) {
  const colors = [
    { bg: "#FF6600", text: "#fff" },
    { bg: "#1a1a1a", text: "#FF6600" },
    { bg: "#0ea5e9", text: "#fff" },
    { bg: "#8b5cf6", text: "#fff" },
    { bg: "#16a34a", text: "#fff" },
    { bg: "#dc2626", text: "#fff" },
  ];
  if (!username) return colors[0];
  const idx = username.charCodeAt(0) % colors.length;
  return colors[idx];
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const color = getAvatarColor(user?.username);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user) {
      api.get("/my-notifications")
        .then(r => {
          // Filter: hide notifications older than 5 minutes
          const fiveMinAgo = Date.now() - 5 * 60 * 1000;
          const recent = (r.data.notifications || []).filter(n => {
            return new Date(n.created_at).getTime() > fiveMinAgo;
          });
          setNotifications(recent);
          // Mark all as read when viewing profile
          if (r.data.unread_count > 0) {
            api.put("/my-notifications/read-all").catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    toast.success("Déconnecté avec succès.");
    navigate("/");
  };

  if (!user) {
    navigate("/connexion");
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />
      <div className="h-1.5 bg-[#FF6600]" />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <Link
          to="/"
          data-testid="back-from-profile"
          className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500 hover:text-[#FF6600] transition-colors duration-200 mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        {/* Profile card */}
        <div className="bg-white border border-zinc-200" data-testid="profile-card">
          {/* Header banner */}
          <div className="h-24 bg-black relative">
            <div className="absolute -bottom-12 left-8">
              {/* Avatar grand — cercle */}
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center font-['Oswald'] text-3xl font-bold border-4 border-white"
                style={{ backgroundColor: color.bg, color: color.text }}
                data-testid="profile-avatar-large"
              >
                {getInitials(user.username)}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="pt-16 px-8 pb-8">
            {/* Pending status banner */}
            {user.status === "pending" && (
              <div className="bg-amber-50 border border-amber-200 px-4 py-3 mb-6 flex items-start gap-3" data-testid="pending-status-banner">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 font-['Manrope']">Compte en attente de validation</p>
                  <p className="text-xs text-amber-600 font-['Manrope'] mt-1">
                    Votre demande de rôle professionnel est en cours d'examen par le groupe MatrixNews. 
                    Vous recevrez un accès complet une fois approuvé.
                  </p>
                </div>
              </div>
            )}

            {/* User notifications (approval/rejection) */}
            {notifications.length > 0 && (
              <div className="space-y-2 mb-6" data-testid="user-notifications">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    data-testid={`user-notif-${n.id}`}
                    className={`px-4 py-3 flex items-start gap-3 border ${
                      n.type === "role_approved" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                    }`}
                  >
                    {n.type === "role_approved" 
                      ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    }
                    <div>
                      <p className={`text-sm font-semibold font-['Manrope'] ${n.type === "role_approved" ? "text-green-800" : "text-red-800"}`}>
                        {n.type === "role_approved" ? "Demande approuvée" : "Demande refusée"}
                      </p>
                      <p className={`text-xs font-['Manrope'] mt-1 ${n.type === "role_approved" ? "text-green-600" : "text-red-600"}`}>
                        {n.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Name + role badge */}
            <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
              <div>
                <h1 className="font-['Oswald'] text-3xl font-bold uppercase tracking-tight text-black">
                  {user.username}
                </h1>
                <span
                  data-testid="profile-role-badge"
                  className={`inline-block mt-1 px-3 py-0.5 text-xs font-bold uppercase tracking-widest font-['Manrope'] ${
                    user.role === "admin" ? "bg-purple-600 text-white" :
                    user.role === "auteur" ? "bg-[#FF6600] text-white" :
                    user.role === "agent" ? "bg-blue-600 text-white" :
                    "bg-zinc-100 text-zinc-600 border border-zinc-300"
                  }`}
                >
                  {user.role === "admin" ? "Admin" : user.role === "auteur" ? "Auteur" : user.role === "agent" ? "Agent" : "Visiteur"}
                </span>
              </div>

              {(user.role === "auteur" || user.role === "admin") && (
                <Link
                  to="/admin"
                  data-testid="go-to-dashboard-btn"
                  className="inline-flex items-center gap-2 bg-black text-white text-xs font-bold font-['Manrope'] uppercase tracking-wider px-5 py-2.5 hover:bg-zinc-800 transition-colors"
                >
                  Mon dashboard
                </Link>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-zinc-100 mb-6" />

            {/* Info fields */}
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-zinc-50 border border-zinc-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Nom d'utilisateur</p>
                  <p className="text-base font-semibold text-black mt-0.5" data-testid="profile-username">
                    {user.username}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-zinc-50 border border-zinc-200 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Email</p>
                  <p className="text-base font-semibold text-black mt-0.5" data-testid="profile-email">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-zinc-50 border border-zinc-200 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Rôle</p>
                  <p className="text-base font-semibold text-black mt-0.5">
                    {user.role === "admin" ? "Administrateur — accès complet" :
                     user.role === "auteur" ? "Auteur — peut publier des articles" :
                     user.role === "agent" ? "Agent immobilier — peut publier des annonces" :
                     "Visiteur — lecture seule"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-zinc-50 border border-zinc-200 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Membre depuis</p>
                  <p className="text-base font-semibold text-black mt-0.5" data-testid="profile-created-at">
                    {formatDate(user.created_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-zinc-100 my-6" />

            {/* Logout */}
            <button
              onClick={handleLogout}
              data-testid="profile-logout-button"
              className="inline-flex items-center gap-2 border-2 border-black text-black text-sm font-bold font-['Manrope'] uppercase tracking-wider px-6 py-2.5 hover:bg-black hover:text-white transition-colors duration-200"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

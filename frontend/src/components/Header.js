import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWebSocket } from "../context/WebSocketContext";
import { PenSquare, Search, X, LogOut, Plus, LayoutDashboard, Bookmark, Settings, ChevronDown, LogIn, UserPlus, Database, CreditCard, Bell, User, FileText, Home, MapPin } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { CATEGORIES, slugify } from "../lib/categories";
import { toast } from "sonner";
import api from "../lib/api";
import MessageButton from "./MessageButton";

function getInitials(username) {
  if (!username) return "?";
  return username.slice(0, 2).toUpperCase();
}

function getAvatarBg(username) {
  const colors = ["#FF6600","#0ea5e9","#8b5cf6","#16a34a","#dc2626","#f59e0b"];
  if (!username) return colors[0];
  return colors[username.charCodeAt(0) % colors.length];
}

function ProfileDropdown({ user, onClose }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const go = (path) => { navigate(path); onClose(); };

  const handleLogout = () => {
    logout();
    toast.success("Deconnecte avec succes.");
    onClose();
    navigate("/");
  };

  const bg = getAvatarBg(user?.username);

  return (
    <div className="profile-dropdown absolute right-0 top-full mt-2 w-64 z-50" data-testid="profile-dropdown">
      <div className="absolute right-[18px] -top-[7px] w-3 h-3 bg-black border-l border-t border-[#FF6600] rotate-45 z-10" />

      <div className="relative bg-black border border-[#FF6600] rounded-xl overflow-hidden shadow-2xl shadow-black/60 max-h-[calc(100vh-70px)] overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* User header */}
        <div className="px-4 py-4 border-b border-zinc-800 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-['Oswald'] text-sm font-bold"
            style={{ backgroundColor: bg, color: "#fff" }}
          >
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" onError={(e) => { e.target.style.display="none"; }} />
              : getInitials(user?.username)
            }
          </div>
          <div className="min-w-0">
            <p className="font-['Oswald'] font-bold text-white uppercase tracking-wide truncate" data-testid="dropdown-username">
              {user?.username}
            </p>
            <p className="text-[11px] text-zinc-500 font-['Manrope'] truncate">{user?.email}</p>
            <span className={`inline-block mt-0.5 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 ${
              user?.role === "admin" ? "bg-purple-600 text-white" :
              user?.role === "auteur" ? "bg-[#FF6600] text-white" :
              user?.role === "agent" ? "bg-blue-600 text-white" : "bg-zinc-700 text-zinc-300"
            }`}>
              {user?.role === "admin" ? "Admin" : user?.role === "auteur" ? "Auteur" : user?.role === "agent" ? "Agent" : "Visiteur"}
            </span>
          </div>
        </div>

        {/* Menu items */}
        <div className="py-1.5">
          {/* Profil link - always visible */}
          <DropdownItem icon={User} label="Profil" onClick={() => go("/profil")} testid="dropdown-profil" />
          <div className="h-px bg-zinc-800 mx-3 my-1" />

          {user?.role === "admin" && (
            <>
              <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Dashboard Articles</p>
              <DropdownItem icon={LayoutDashboard} label="Mes articles" onClick={() => go("/admin")} testid="dropdown-dashboard" />
              <DropdownItem icon={Plus} label="Creer un article" onClick={() => go("/admin/nouvelle")} testid="dropdown-new-article" />
              <div className="h-px bg-zinc-800 mx-3 my-2" />
              <p className="px-4 pt-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Immobilier</p>
              <DropdownItem icon={PenSquare} label="Mes annonces" onClick={() => go("/mes-annonces")} testid="dropdown-my-properties" />
              <DropdownItem icon={Plus} label="Publier une annonce" onClick={() => go("/immobilier/publier")} testid="dropdown-new-property" />
              <div className="h-px bg-zinc-800 mx-3 my-2" />
              <p className="px-4 pt-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Procedures</p>
              <DropdownItem icon={FileText} label="Tableau de bord" onClick={() => go("/admin/procedures")} testid="dropdown-procedures-dashboard" />
              <DropdownItem icon={Plus} label="Nouvelle procedure" onClick={() => go("/admin/procedures/nouvelle")} testid="dropdown-new-procedure" />
              <div className="h-px bg-zinc-800 mx-3 my-2" />
              <p className="px-4 pt-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Fiches PDF</p>
              <DropdownItem icon={FileText} label="Mes fiches" onClick={() => go("/admin/fiches")} testid="dropdown-fiches" />
              <DropdownItem icon={Plus} label="Nouvelle fiche" onClick={() => go("/admin/fiches/create")} testid="dropdown-new-fiche" />
              <div className="h-px bg-zinc-800 mx-3 my-2" />
              <p className="px-4 pt-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Dashboard Admin</p>
              <DropdownItem icon={Database} label="Base de donnees" onClick={() => go("/admin/database")} testid="dropdown-database" />
              <DropdownItem icon={CreditCard} label="Paiements" onClick={() => go("/admin/paiements")} testid="dropdown-payments" />
              <div className="h-px bg-zinc-800 mx-3 my-2" />
            </>
          )}
          {user?.role === "auteur" && (
            <>
              <p className="px-4 pt-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Articles</p>
              <DropdownItem icon={LayoutDashboard} label="Mes articles" onClick={() => go("/admin")} testid="dropdown-dashboard" />
              <DropdownItem icon={Plus} label="Creer un article" onClick={() => go("/admin/nouvelle")} testid="dropdown-new-article" />
              <div className="h-px bg-zinc-800 mx-3 my-1" />
            </>
          )}
          {user?.role === "agent" && (
            <>
              <p className="px-4 pt-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Immobilier</p>
              <DropdownItem icon={PenSquare} label="Mes annonces" onClick={() => go("/mes-annonces")} testid="dropdown-my-properties" />
              <DropdownItem icon={Plus} label="Publier une annonce" onClick={() => go("/immobilier/publier")} testid="dropdown-new-property" />
              <div className="h-px bg-zinc-800 mx-3 my-1" />
            </>
          )}
          <DropdownItem icon={Bookmark} label="Sauvegardes" onClick={() => go("/sauvegardes")} testid="dropdown-saved" />
          <DropdownItem icon={Settings} label="Parametres" onClick={() => go("/parametres")} testid="dropdown-settings" />
          <div className="h-px bg-zinc-800 mx-3 my-1" />
          <button
            onClick={handleLogout}
            data-testid="dropdown-logout"
            className="dropdown-item w-full flex items-center gap-3 px-4 py-2.5 text-sm font-['Manrope'] font-semibold text-red-400 hover:text-red-300 hover:bg-zinc-900 transition-colors duration-150 group"
          >
            <LogOut className="w-4 h-4 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
            Deconnexion
          </button>
        </div>
      </div>
    </div>
  );
}

function DropdownItem({ icon: Icon, label, onClick, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className="dropdown-item w-full flex items-center gap-3 px-4 py-2.5 text-sm font-['Manrope'] font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors duration-150 group"
    >
      <Icon className="w-4 h-4 flex-shrink-0 text-zinc-500 group-hover:text-[#FF6600] transition-colors" />
      {label}
    </button>
  );
}

// ── Search Result Item ───────────────────────────────────────────────────────
function SearchResultItem({ type, item, onClick }) {
  const icons = { article: FileText, property: Home, procedure: MapPin };
  const Icon = icons[type] || FileText;
  const labels = { article: "Article", property: "Annonce", procedure: "Procedure" };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800 transition-colors group"
    >
      <div className="w-8 h-8 rounded-md bg-zinc-800 group-hover:bg-[#FF6600]/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-zinc-500 group-hover:text-[#FF6600]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white truncate font-['Manrope']">{item.title}</p>
        <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
          {labels[type]}{item.category ? ` / ${item.category}` : ""}{item.city ? ` / ${item.city}` : ""}{item.country ? ` / ${item.country}` : ""}
        </p>
      </div>
    </button>
  );
}

export default function Header() {
  const { token, user } = useAuth();
  const ws = useWebSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const searchTimerRef = useRef(null);
  const bg = getAvatarBg(user?.username);

  // Fetch pending notification count for admin
  useEffect(() => {
    if (user?.role === "admin") {
      api.get("/admin/notifications/count")
        .then(r => setPendingCount(r.data.pending_count))
        .catch(() => {});
    }
  }, [user?.role, location.pathname]);

  // Listen for real-time new role requests (admin bell)
  useEffect(() => {
    if (!ws || user?.role !== "admin") return;
    const handler = (data) => {
      if (data.type === "new_role_request") {
        setPendingCount(prev => prev + 1);
        toast.info(data.message || "Nouvelle demande de role !");
      }
    };
    return ws.subscribe(handler);
  }, [ws, user?.role]);

  const activeCategory = location.pathname.startsWith("/categorie/")
    ? decodeURIComponent(location.pathname.replace("/categorie/", ""))
    : null;

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  // Close search on click outside
  useEffect(() => {
    if (!searchOpen) return;
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [searchOpen]);

  useEffect(() => { setDropdownOpen(false); setSearchOpen(false); setMobileSearchOpen(false); }, [location.pathname]);

  // Global search with debounce
  const doSearch = useCallback((q) => {
    if (!q.trim()) {
      setSearchResults(null);
      setSearchOpen(false);
      return;
    }
    setSearchLoading(true);
    setSearchOpen(true);
    api.get("/search", { params: { q: q.trim() } })
      .then(r => setSearchResults(r.data))
      .catch(() => setSearchResults(null))
      .finally(() => setSearchLoading(false));
  }, []);

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => doSearch(value), 300);
  };

  const goToResult = (type, id) => {
    setSearchOpen(false);
    setSearchQuery("");
    setMobileSearchOpen(false);
    if (type === "article") navigate(`/article/${id}`);
    else if (type === "property") navigate(`/immobilier/${id}`);
    else if (type === "procedure") navigate(`/procedures/${id}`);
  };

  const totalResults = searchResults
    ? (searchResults.articles?.length || 0) + (searchResults.properties?.length || 0) + (searchResults.procedures?.length || 0)
    : 0;

  const renderSearchResults = () => {
    if (!searchOpen || !searchQuery.trim()) return null;
    return (
      <div className="absolute top-full left-0 right-0 mt-1 bg-black/95 backdrop-blur-lg border border-zinc-700 rounded-xl overflow-hidden shadow-2xl z-50 max-h-[400px] overflow-y-auto">
        {searchLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#FF6600] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : totalResults === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-sm font-['Manrope']">
            Aucun resultat pour "{searchQuery}"
          </div>
        ) : (
          <div>
            {searchResults.articles?.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Articles</p>
                {searchResults.articles.map(a => (
                  <SearchResultItem key={a.id} type="article" item={a} onClick={() => goToResult("article", a.id)} />
                ))}
              </>
            )}
            {searchResults.properties?.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Annonces</p>
                {searchResults.properties.map(p => (
                  <SearchResultItem key={p.id} type="property" item={p} onClick={() => goToResult("property", p.id)} />
                ))}
              </>
            )}
            {searchResults.procedures?.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Procedures</p>
                {searchResults.procedures.map(pr => (
                  <SearchResultItem key={pr.id} type="procedure" item={pr} onClick={() => goToResult("procedure", pr.id)} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="bg-black text-white sticky top-0 z-50 shadow-lg" data-testid="main-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 sm:gap-4 h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0" data-testid="header-logo">
            <img
              src="/Matrix.png"
              alt="Matrix News Logo"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-sm"
            />
            <span className="hidden sm:inline font-['Oswald'] text-xl font-bold tracking-widest uppercase text-white group-hover:text-[#FF6600] transition-colors duration-200 whitespace-nowrap">
              Matrix News
            </span>
          </Link>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-xl relative" ref={searchRef}>
            <div className={`flex items-center w-full border ${searchOpen ? "border-[#FF6600]" : "border-zinc-700"} bg-zinc-900 rounded-full transition-colors duration-200`}>
              <Search className="w-4 h-4 text-zinc-500 ml-4 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }}
                data-testid="search-input"
                placeholder="Rechercher articles, annonces, procedures..."
                className="flex-1 bg-transparent text-white text-sm font-['Manrope'] placeholder:text-zinc-500 px-3 py-2 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setSearchOpen(false); setSearchResults(null); }} data-testid="clear-search" className="p-2 mr-1 text-zinc-500 hover:text-white transition-colors rounded-full">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {renderSearchResults()}
          </div>

          {/* Mobile Search Button */}
          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            data-testid="mobile-search-btn"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Nav */}
          <nav className="flex items-center gap-2 sm:gap-3 ml-auto flex-shrink-0">
            {token && user ? (
              <>
                {(user.role === "auteur" || user.role === "admin") && (
                  <Link to="/admin" data-testid="admin-dashboard-link" className="hidden lg:flex items-center gap-1.5 text-sm font-bold font-['Manrope'] uppercase tracking-wider text-white hover:text-[#FF6600] transition-colors duration-200">
                    <PenSquare className="w-4 h-4" />
                    Dashboard
                  </Link>
                )}
                {/* Admin notification bell */}
                {user.role === "admin" && (
                  <button
                    onClick={() => {
                      if (pendingCount > 0) {
                        api.put("/admin/notifications/mark-seen").catch(() => {});
                        setPendingCount(0);
                      }
                      navigate("/admin/database");
                    }}
                    data-testid="admin-notification-bell"
                    className="relative p-1.5 text-zinc-400 hover:text-[#FF6600] transition-colors"
                    title="Demandes en attente"
                  >
                    <Bell className="w-5 h-5" />
                    {pendingCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 animate-pulse" data-testid="header-pending-badge">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                )}
                {/* Message icon */}
                <MessageButton />
                {/* Avatar + Dropdown - clicking avatar opens dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((v) => !v)}
                    data-testid="profile-avatar-btn"
                    title={`${user.username}`}
                    className="flex items-center gap-1 group"
                  >
                    <div className="relative">
                      <div
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center font-['Oswald'] text-sm font-bold ring-2 transition-all duration-200 select-none ring-transparent group-hover:ring-[#FF6600]"
                        style={{ backgroundColor: user.avatar_url ? "transparent" : bg, color: "#fff" }}
                      >
                        {user.avatar_url
                          ? <img src={user.avatar_url} alt="" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover" onError={(e) => { e.target.style.display="none"; }} />
                          : getInitials(user.username)
                        }
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-black rounded-full" data-testid="online-indicator" />
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {dropdownOpen && <ProfileDropdown user={user} onClose={() => setDropdownOpen(false)} />}
                </div>
              </>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  data-testid="hamburger-menu-btn"
                  aria-label="Menu"
                  className={`flex flex-col justify-center items-center w-9 h-9 gap-[5px] group transition-all duration-200 rounded-md p-1.5 ${dropdownOpen ? "bg-[#FF6600]" : "hover:bg-zinc-800"}`}
                >
                  <span className={`block w-5 h-0.5 transition-all duration-200 ${dropdownOpen ? "bg-white rotate-45 translate-y-[6.5px]" : "bg-white"}`} />
                  <span className={`block w-5 h-0.5 transition-all duration-200 ${dropdownOpen ? "bg-white opacity-0" : "bg-white"}`} />
                  <span className={`block w-5 h-0.5 transition-all duration-200 ${dropdownOpen ? "bg-white -rotate-45 -translate-y-[6.5px]" : "bg-white"}`} />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 z-50" data-testid="guest-dropdown">
                    <div className="absolute right-3 -top-[7px] w-3 h-3 bg-black border-l border-t border-[#FF6600] rotate-45 z-10" />
                    <div className="relative bg-black border border-[#FF6600] rounded-xl overflow-hidden shadow-2xl shadow-black/60">
                      <div className="px-4 py-3 border-b border-zinc-800">
                        <p className="font-['Oswald'] text-xs font-bold uppercase tracking-widest text-zinc-500">
                          Bienvenue sur Matrix News
                        </p>
                      </div>
                      <div className="py-1.5">
                        <Link to="/connexion" onClick={() => setDropdownOpen(false)} data-testid="guest-login-link" className="flex items-center gap-3 px-4 py-2.5 text-sm font-['Manrope'] font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors duration-150 group">
                          <LogIn className="w-4 h-4 text-zinc-500 group-hover:text-[#FF6600] transition-colors" />
                          Connexion
                        </Link>
                        <Link to="/inscription" onClick={() => setDropdownOpen(false)} data-testid="guest-register-link" className="flex items-center gap-3 px-4 py-2.5 text-sm font-['Manrope'] font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors duration-150 group">
                          <UserPlus className="w-4 h-4 text-zinc-500 group-hover:text-[#FF6600] transition-colors" />
                          Creer un compte
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {mobileSearchOpen && (
        <div className="md:hidden px-4 pb-3 bg-black border-t border-zinc-800 relative" ref={searchRef}>
          <div className="flex items-center border border-zinc-700 bg-zinc-900 rounded-full">
            <Search className="w-4 h-4 text-zinc-500 ml-4 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              data-testid="mobile-search-input"
              placeholder="Rechercher..."
              className="flex-1 bg-transparent text-white text-sm font-['Manrope'] placeholder:text-zinc-500 px-3 py-2 focus:outline-none"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSearchResults(null); }} className="p-2 mr-1 text-zinc-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {renderSearchResults()}
        </div>
      )}

      {/* Category nav */}
      <div className="border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0" data-testid="category-nav">
            <Link to="/" className={`flex-shrink-0 px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-bold font-['Manrope'] uppercase tracking-wider transition-colors duration-200 border-b-2 ${!activeCategory && location.pathname === "/" ? "border-[#FF6600] text-[#FF6600]" : "border-transparent text-zinc-400 hover:text-white"}`}>
              Toutes
            </Link>
            {CATEGORIES.map((cat) => (
              <Link key={cat} to={`/categorie/${slugify(cat)}`} data-testid={`nav-category-${cat}`}
                className={`flex-shrink-0 px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-bold font-['Manrope'] uppercase tracking-wider transition-colors duration-200 border-b-2 whitespace-nowrap ${activeCategory === cat ? "border-[#FF6600] text-[#FF6600]" : "border-transparent text-zinc-400 hover:text-white"}`}>
                {cat}
              </Link>
            ))}
            <span className="flex-shrink-0 w-px h-4 bg-zinc-700 mx-1 sm:mx-2 self-center" />
            <Link to="/immobilier" data-testid="immobilier-nav-link"
              className={`flex-shrink-0 px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-bold font-['Manrope'] uppercase tracking-wider transition-colors duration-200 border-b-2 whitespace-nowrap ${
                location.pathname.startsWith("/immobilier") || location.pathname.startsWith("/mes-annonces")
                  ? "border-[#FF6600] text-[#FF6600]" : "border-transparent text-zinc-400 hover:text-white"
              }`}>
              Immobilier
            </Link>
            <span className="flex-shrink-0 w-px h-4 bg-zinc-700 mx-1 sm:mx-2 self-center" />
            <Link to="/procedures" data-testid="procedures-nav-link"
              className={`flex-shrink-0 px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-bold font-['Manrope'] uppercase tracking-wider transition-colors duration-200 border-b-2 whitespace-nowrap ${
                location.pathname.startsWith("/procedures")
                  ? "border-[#FF6600] text-[#FF6600]" : "border-transparent text-zinc-400 hover:text-white"
              }`}>
              Procedures
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

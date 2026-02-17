import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PenSquare, Search, X, LogOut, Plus, LayoutDashboard, Bookmark, Settings, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { CATEGORIES, slugify } from "../lib/categories";
import { toast } from "sonner";

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
    toast.success("Déconnecté avec succès.");
    onClose();
    navigate("/");
  };

  const bg = getAvatarBg(user?.username);

  return (
    <div className="profile-dropdown absolute right-0 top-full mt-2 w-64 z-50" data-testid="profile-dropdown">
      {/* Arrow tip */}
      <div className="absolute right-4 -top-[7px] w-3 h-3 bg-black border-l border-t border-[#FF6600] rotate-45 z-10" />

      <div className="relative bg-black border border-[#FF6600] rounded-xl overflow-hidden shadow-2xl shadow-black/60">
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
              user?.role === "auteur" ? "bg-[#FF6600] text-white" : "bg-zinc-700 text-zinc-300"
            }`}>
              {user?.role === "auteur" ? "Auteur" : "Visiteur"}
            </span>
          </div>
        </div>

        {/* Menu items */}
        <div className="py-1.5">
          {user?.role === "auteur" && (
            <>
              <DropdownItem icon={LayoutDashboard} label="Mes articles" onClick={() => go("/admin")} testid="dropdown-dashboard" />
              <DropdownItem icon={Plus} label="Créer un article" onClick={() => go("/admin/nouvelle")} testid="dropdown-new-article" />
              <div className="h-px bg-zinc-800 mx-3 my-1" />
            </>
          )}
          <DropdownItem icon={Bookmark} label="Sauvegardes" onClick={() => go("/sauvegardes")} testid="dropdown-saved" />
          <DropdownItem icon={Settings} label="Paramètres" onClick={() => go("/parametres")} testid="dropdown-settings" />
          <div className="h-px bg-zinc-800 mx-3 my-1" />
          <button
            onClick={handleLogout}
            data-testid="dropdown-logout"
            className="dropdown-item w-full flex items-center gap-3 px-4 py-2.5 text-sm font-['Manrope'] font-semibold text-red-400 hover:text-red-300 hover:bg-zinc-900 transition-colors duration-150 group"
          >
            <LogOut className="w-4 h-4 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
            Déconnexion
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

export default function Header({ onSearch, searchValue }) {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [focused, setFocused] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const bg = getAvatarBg(user?.username);

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

  useEffect(() => { setDropdownOpen(false); }, [location.pathname]);

  return (
    <header className="bg-black text-white sticky top-0 z-50 shadow-lg" data-testid="main-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0" data-testid="header-logo">
            <img
              src="https://customer-assets.emergentagent.com/job_2b66c898-0ce0-4fc9-a685-24a9ac754e60/artifacts/p7stxwf9_ChatGPT%20Image%20Feb%2017%2C%202026%2C%2005_57_11%20PM.png"
              alt="Matrix News Logo"
              className="w-9 h-9 object-contain rounded-sm"
            />
            <span className="font-['Oswald'] text-xl font-bold tracking-widest uppercase text-white group-hover:text-[#FF6600] transition-colors duration-200 whitespace-nowrap">
              Matrix News
            </span>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-xl">
            <div className={`flex items-center border ${focused ? "border-[#FF6600]" : "border-zinc-700"} bg-zinc-900 rounded-full transition-colors duration-200`}>
              <Search className="w-4 h-4 text-zinc-500 ml-4 flex-shrink-0" />
              <input
                type="text"
                value={searchValue || ""}
                onChange={(e) => onSearch && onSearch(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                data-testid="search-input"
                placeholder="Rechercher un article..."
                className="flex-1 bg-transparent text-white text-sm font-['Manrope'] placeholder:text-zinc-500 px-3 py-2 focus:outline-none"
              />
              {searchValue && (
                <button onClick={() => onSearch && onSearch("")} data-testid="clear-search" className="p-2 mr-1 text-zinc-500 hover:text-white transition-colors rounded-full">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-3 ml-auto flex-shrink-0">
            {token && user ? (
              <>
                {user.role === "auteur" && (
                  <Link to="/admin" data-testid="admin-dashboard-link" className="hidden sm:flex items-center gap-1.5 text-sm font-bold font-['Manrope'] uppercase tracking-wider text-white hover:text-[#FF6600] transition-colors duration-200">
                    <PenSquare className="w-4 h-4" />
                    Dashboard
                  </Link>
                )}
                {/* Avatar + Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((v) => !v)}
                    data-testid="profile-avatar-btn"
                    title={`Profil de ${user.username}`}
                    className="flex items-center gap-1 group"
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center font-['Oswald'] text-sm font-bold ring-2 transition-all duration-200 select-none ${dropdownOpen ? "ring-[#FF6600]" : "ring-transparent group-hover:ring-[#FF6600]"}`}
                      style={{ backgroundColor: user.avatar_url ? "transparent" : bg, color: "#fff" }}
                    >
                      {user.avatar_url
                        ? <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" onError={(e) => { e.target.style.display="none"; }} />
                        : getInitials(user.username)
                      }
                    </div>
                    <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {dropdownOpen && <ProfileDropdown user={user} onClose={() => setDropdownOpen(false)} />}
                </div>
              </>
            ) : (
              <Link to="/connexion" data-testid="login-link" className="bg-[#FF6600] text-white text-sm font-bold font-['Manrope'] uppercase tracking-wider px-5 py-2 hover:bg-[#CC5200] transition-colors duration-200 whitespace-nowrap rounded-full">
                Connexion
              </Link>
            )}
          </nav>
        </div>
      </div>

      {/* Category nav */}
      <div className="border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center overflow-x-auto" data-testid="category-nav">
            <Link to="/" className={`flex-shrink-0 px-4 py-2.5 text-xs font-bold font-['Manrope'] uppercase tracking-wider transition-colors duration-200 border-b-2 ${!activeCategory && location.pathname === "/" ? "border-[#FF6600] text-[#FF6600]" : "border-transparent text-zinc-400 hover:text-white"}`}>
              Toutes
            </Link>
            {CATEGORIES.map((cat) => (
              <Link key={cat} to={`/categorie/${slugify(cat)}`} data-testid={`nav-category-${cat}`}
                className={`flex-shrink-0 px-4 py-2.5 text-xs font-bold font-['Manrope'] uppercase tracking-wider transition-colors duration-200 border-b-2 ${activeCategory === cat ? "border-[#FF6600] text-[#FF6600]" : "border-transparent text-zinc-400 hover:text-white"}`}>
                {cat}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

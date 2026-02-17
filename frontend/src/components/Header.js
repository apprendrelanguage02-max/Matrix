import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PenSquare, Newspaper, Search, X } from "lucide-react";
import { useState } from "react";
import { CATEGORIES, getCategoryColor, slugify } from "../lib/categories";

function getInitials(username) {
  if (!username) return "?";
  return username.slice(0, 2).toUpperCase();
}

function getAvatarColor(username) {
  const colors = [
    { bg: "#FF6600", text: "#fff" },
    { bg: "#0ea5e9", text: "#fff" },
    { bg: "#8b5cf6", text: "#fff" },
    { bg: "#16a34a", text: "#fff" },
    { bg: "#dc2626", text: "#fff" },
    { bg: "#f59e0b", text: "#fff" },
  ];
  if (!username) return colors[0];
  const idx = username.charCodeAt(0) % colors.length;
  return colors[idx];
}

export default function Header({ onSearch, searchValue }) {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [focused, setFocused] = useState(false);
  const color = getAvatarColor(user?.username);

  // Determine active category from URL
  const activeCategory = location.pathname.startsWith("/categorie/")
    ? decodeURIComponent(location.pathname.replace("/categorie/", ""))
    : null;

  return (
    <header className="bg-black text-white sticky top-0 z-50 shadow-lg" data-testid="main-header">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0" data-testid="header-logo">
            <Newspaper className="w-6 h-6 text-[#FF6600]" />
            <span className="font-['Oswald'] text-xl font-bold tracking-widest uppercase text-white group-hover:text-[#FF6600] transition-colors duration-200 whitespace-nowrap">
              Matrix News
            </span>
          </Link>

          {/* Search bar */}
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
                <button
                  onClick={() => onSearch && onSearch("")}
                  data-testid="clear-search"
                  className="p-2 mr-1 text-zinc-500 hover:text-white transition-colors rounded-full"
                >
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
                  <Link
                    to="/admin"
                    data-testid="admin-dashboard-link"
                    className="hidden sm:flex items-center gap-1.5 text-sm font-bold font-['Manrope'] uppercase tracking-wider text-white hover:text-[#FF6600] transition-colors duration-200"
                  >
                    <PenSquare className="w-4 h-4" />
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={() => navigate("/profil")}
                  data-testid="profile-avatar-btn"
                  title={`Profil de ${user.username}`}
                  className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-['Oswald'] text-sm font-bold ring-2 ring-transparent hover:ring-[#FF6600] transition-all duration-200 select-none"
                  style={{ backgroundColor: color.bg, color: color.text }}
                >
                  {getInitials(user.username)}
                </button>
              </>
            ) : (
              <Link
                to="/connexion"
                data-testid="login-link"
                className="bg-[#FF6600] text-white text-sm font-bold font-['Manrope'] uppercase tracking-wider px-5 py-2 hover:bg-[#CC5200] transition-colors duration-200 whitespace-nowrap rounded-full"
              >
                Connexion
              </Link>
            )}
          </nav>
        </div>
      </div>

      {/* Category navigation bar */}
      <div className="border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-0 overflow-x-auto scrollbar-hide" data-testid="category-nav">
            <Link
              to="/"
              className={`flex-shrink-0 px-4 py-2.5 text-xs font-bold font-['Manrope'] uppercase tracking-wider transition-colors duration-200 border-b-2 ${
                !activeCategory && location.pathname === "/"
                  ? "border-[#FF6600] text-[#FF6600]"
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              Toutes
            </Link>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                to={`/categorie/${slugify(cat)}`}
                data-testid={`nav-category-${cat}`}
                className={`flex-shrink-0 px-4 py-2.5 text-xs font-bold font-['Manrope'] uppercase tracking-wider transition-colors duration-200 border-b-2 ${
                  activeCategory === cat
                    ? "border-[#FF6600] text-[#FF6600]"
                    : "border-transparent text-zinc-400 hover:text-white"
                }`}
              >
                {cat}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

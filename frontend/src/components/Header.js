import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, PenSquare, Newspaper, Search, X } from "lucide-react";
import { useState } from "react";

export default function Header({ onSearch, searchValue }) {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [focused, setFocused] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleSearchChange = (e) => {
    if (onSearch) onSearch(e.target.value);
  };

  const clearSearch = () => {
    if (onSearch) onSearch("");
  };

  return (
    <header className="bg-black text-white" data-testid="main-header">
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
          <div className={`flex-1 max-w-xl relative transition-all duration-200 ${focused ? "opacity-100" : "opacity-80"}`}>
            <div className={`flex items-center border ${focused ? "border-[#FF6600]" : "border-zinc-700"} bg-zinc-900 transition-colors duration-200`}>
              <Search className="w-4 h-4 text-zinc-500 ml-3 flex-shrink-0" />
              <input
                type="text"
                value={searchValue || ""}
                onChange={handleSearchChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                data-testid="search-input"
                placeholder="Rechercher un article..."
                className="flex-1 bg-transparent text-white text-sm font-['Manrope'] placeholder:text-zinc-500 px-3 py-2.5 focus:outline-none"
              />
              {searchValue && (
                <button
                  onClick={clearSearch}
                  data-testid="clear-search"
                  className="p-2 text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-4 flex-shrink-0">
            {token ? (
              <>
                <span className="text-zinc-400 text-sm font-['Manrope'] hidden sm:block">
                  {user?.username}
                </span>
                <Link
                  to="/admin"
                  data-testid="admin-dashboard-link"
                  className="flex items-center gap-1.5 text-sm font-bold font-['Manrope'] uppercase tracking-wider text-white hover:text-[#FF6600] transition-colors duration-200"
                >
                  <PenSquare className="w-4 h-4" />
                  <span className="hidden sm:block">Dashboard</span>
                </Link>
                <button
                  onClick={handleLogout}
                  data-testid="logout-button"
                  className="flex items-center gap-1.5 text-sm font-bold font-['Manrope'] uppercase tracking-wider text-white hover:text-[#FF6600] transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:block">Déconnexion</span>
                </button>
              </>
            ) : (
              <Link
                to="/connexion"
                data-testid="login-link"
                className="bg-[#FF6600] text-white text-sm font-bold font-['Manrope'] uppercase tracking-wider px-5 py-2 hover:bg-[#CC5200] transition-colors duration-200 whitespace-nowrap"
              >
                Connexion
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

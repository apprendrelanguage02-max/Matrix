import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, PenSquare, Newspaper } from "lucide-react";

export default function Header() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="bg-black text-white" data-testid="main-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" data-testid="header-logo">
            <Newspaper className="w-6 h-6 text-[#FF6600]" />
            <span className="font-['Oswald'] text-xl font-bold tracking-widest uppercase text-white group-hover:text-[#FF6600] transition-colors duration-200">
              NewsApp
            </span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-4">
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
                className="bg-[#FF6600] text-white text-sm font-bold font-['Manrope'] uppercase tracking-wider px-5 py-2 hover:bg-[#CC5200] transition-colors duration-200"
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

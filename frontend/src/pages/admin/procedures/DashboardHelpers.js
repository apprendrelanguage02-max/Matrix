import { Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import {
  LayoutDashboard, FileText, BarChart3, FolderOpen, Settings,
  ExternalLink, X, Menu, Eye, Tag, Globe, ChevronRight, Edit, Trash2
} from "lucide-react";

const FLAG_URL = (code) => `https://flagcdn.com/24x18/${code}.png`;

export function Sidebar({ active, onNavigate, isOpen, onToggle }) {
  const items = [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "procedures", label: "Procedures", icon: FileText },
    { id: "stats", label: "Statistiques", icon: BarChart3 },
    { id: "documents", label: "Gestion des documents", icon: FolderOpen },
    { id: "config", label: "Configuration", icon: Settings },
  ];
  const { user } = useAuth();

  const handleNavigate = (id) => { onNavigate(id); if (window.innerWidth < 768) onToggle(); };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={onToggle} />}
      <aside className={`fixed md:relative z-40 md:z-auto w-56 bg-zinc-950 border-r border-zinc-800 min-h-screen flex flex-col flex-shrink-0 transition-transform duration-200 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`} data-testid="admin-sidebar">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <button onClick={() => handleNavigate("dashboard")} className="text-[#FF6600] font-['Oswald'] text-lg font-bold uppercase tracking-wider flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </button>
          <button onClick={onToggle} className="md:hidden text-zinc-400 hover:text-white p-1"><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 py-3">
          {items.map(item => (
            <button key={item.id} onClick={() => handleNavigate(item.id)} data-testid={`sidebar-${item.id}`}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                active === item.id ? "bg-zinc-800/60 text-[#FF6600] border-l-2 border-[#FF6600]" : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}>
              <item.icon className="w-4 h-4" /> {item.label}
            </button>
          ))}
          <div className="h-px bg-zinc-800 mx-3 my-3" />
          <Link to="/procedures" data-testid="sidebar-view-site" className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-500 hover:text-[#FF6600] transition-colors">
            <ExternalLink className="w-4 h-4" /> Voir le site
          </Link>
        </nav>
        <div className="p-4 border-t border-zinc-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FF6600] rounded-full flex items-center justify-center text-white text-xs font-bold">{(user?.username || "A")[0].toUpperCase()}</div>
          <div>
            <span className="text-zinc-300 text-xs font-bold block">{user?.username || "Admin"}</span>
            <span className="text-zinc-600 text-[10px]">Administrateur</span>
          </div>
        </div>
      </aside>
    </>
  );
}

export function StatCard({ label, value, icon: Icon, color = "#FF6600", sub }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{label}</span>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-zinc-600 text-[10px] mt-1">{sub}</p>}
    </div>
  );
}

export function ProcedureRow({ p, navigate, onDelete }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 hover:border-[#FF6600]/50 transition-all p-4 flex items-center gap-4 group" data-testid={`proc-row-${p.id}`}>
      <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">
        {p.country_flag && <img src={FLAG_URL(p.country_flag)} alt="" className="w-6 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-bold text-sm truncate group-hover:text-[#FF6600] transition-colors">{p.title}</h3>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-zinc-500 text-xs flex items-center gap-1"><Tag className="w-3 h-3" /> {p.category_name}</span>
          <span className="text-zinc-500 text-xs flex items-center gap-1"><Globe className="w-3 h-3" /> {p.country_name}</span>
          <span className="text-zinc-500 text-xs">{p.steps?.length || 0} etapes</span>
          <span className="text-zinc-500 text-xs flex items-center gap-1"><Eye className="w-3 h-3" /> {p.views}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 ${p.status === "published" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
          {p.status === "published" ? "Publiee" : "Brouillon"}
        </span>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 ${p.active ? "bg-[#FF6600]/20 text-[#FF6600]" : "bg-zinc-700 text-zinc-500"}`}>
          {p.active ? "Active" : "Inactive"}
        </span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => navigate(`/admin/procedures/modifier/${p.id}`)} data-testid={`edit-proc-${p.id}`}
          className="p-2 text-zinc-400 hover:text-[#FF6600] transition-colors"><Edit className="w-4 h-4" /></button>
        <button onClick={() => navigate(`/procedures/${p.id}`)} data-testid={`view-proc-${p.id}`}
          className="p-2 text-zinc-400 hover:text-blue-400 transition-colors"><Eye className="w-4 h-4" /></button>
        <button onClick={() => onDelete(p.id, p.title)} data-testid={`delete-proc-${p.id}`}
          className="p-2 text-zinc-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-[#FF6600] transition-colors" />
    </div>
  );
}

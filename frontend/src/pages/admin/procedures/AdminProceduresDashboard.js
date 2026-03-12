import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import {
  LayoutDashboard, FileText, BarChart3, FolderOpen, Settings, Plus, Search, Eye, Edit, Trash2,
  Globe, Tag, CheckCircle, Clock, AlertCircle, ChevronRight, Loader2, X
} from "lucide-react";
import { toast } from "sonner";

const FLAG_URL = (code) => `https://flagcdn.com/24x18/${code}.png`;

function Sidebar({ active }) {
  const items = [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, href: "/admin/procedures" },
    { id: "procedures", label: "Procedures", icon: FileText, href: "/admin/procedures" },
    { id: "stats", label: "Statistiques", icon: BarChart3, href: "/admin/procedures" },
    { id: "documents", label: "Gestion des documents", icon: FolderOpen, href: "/admin/procedures" },
    { id: "config", label: "Configuration", icon: Settings, href: "/admin/procedures" },
  ];
  const { user } = useAuth();
  return (
    <aside className="w-56 bg-zinc-950 border-r border-zinc-800 min-h-screen flex flex-col" data-testid="admin-sidebar">
      <div className="p-4 border-b border-zinc-800">
        <Link to="/admin/procedures" className="text-[#FF6600] font-['Oswald'] text-lg font-bold uppercase tracking-wider flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5" /> Dashboard
        </Link>
      </div>
      <nav className="flex-1 py-3">
        {items.map(item => (
          <Link key={item.id} to={item.href} data-testid={`sidebar-${item.id}`}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
              active === item.id
                ? "bg-zinc-800/60 text-[#FF6600] border-l-2 border-[#FF6600]"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}>
            <item.icon className="w-4 h-4" /> {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-zinc-800 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#FF6600] rounded-full flex items-center justify-center text-white text-xs font-bold">
          {(user?.username || "A")[0].toUpperCase()}
        </div>
        <span className="text-zinc-400 text-xs">{user?.username || "Admin"}</span>
      </div>
    </aside>
  );
}

function StatCard({ label, value, icon: Icon, color = "#FF6600" }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{label}</span>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function AdminProceduresDashboard() {
  const navigate = useNavigate();
  const [procedures, setProcedures] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [categories, setCategories] = useState([]);
  const [countries, setCountries] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/procedures/categories"),
      api.get("/procedures/countries"),
      api.get("/procedures/stats"),
    ]).then(([catRes, countryRes, statsRes]) => {
      setCategories(catRes.data);
      setCountries(countryRes.data);
      setStats(statsRes.data);
    }).catch(() => {});
    fetchProcedures();
  }, []);

  const fetchProcedures = (search = "", category = "", country = "") => {
    setLoading(true);
    const params = { limit: 50 };
    if (search) params.search = search;
    if (category) params.category = category;
    if (country) params.country = country;
    api.get("/procedures", { params })
      .then(r => setProcedures(r.data.procedures))
      .catch(() => setProcedures([]))
      .finally(() => setLoading(false));
  };

  const handleSearch = () => fetchProcedures(searchTerm, filterCategory, filterCountry);
  const handleDelete = async (id, title) => {
    if (!window.confirm(`Supprimer "${title}" ?`)) return;
    try {
      await api.delete(`/procedures/${id}`);
      toast.success("Procedure supprimee");
      setProcedures(p => p.filter(proc => proc.id !== id));
    } catch { toast.error("Erreur lors de la suppression"); }
  };

  return (
    <div className="flex min-h-screen bg-zinc-950 font-['Manrope']">
      <Sidebar active="procedures" />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="font-['Oswald'] text-xl font-bold uppercase tracking-tight text-white">
              Publicateur de Procedure <span className="text-[#FF6600]">— Matrix News</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Rechercher..." data-testid="proc-search"
                className="bg-zinc-900 border border-zinc-700 text-white text-sm pl-9 pr-3 py-2 w-56 focus:outline-none focus:border-[#FF6600]" />
            </div>
            <button onClick={() => navigate("/admin/procedures/nouvelle")} data-testid="create-proc-btn"
              className="flex items-center gap-2 bg-[#FF6600] text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 hover:bg-[#CC5200] transition-colors">
              <Plus className="w-4 h-4" /> Creer
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total" value={stats.total} icon={FileText} />
              <StatCard label="Publiees" value={stats.published} icon={CheckCircle} color="#22c55e" />
              <StatCard label="Brouillons" value={stats.drafts} icon={Clock} color="#eab308" />
              <StatCard label="Vues totales" value={stats.total_views} icon={Eye} color="#3b82f6" />
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
            <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); fetchProcedures(searchTerm, e.target.value, filterCountry); }}
              data-testid="filter-category"
              className="bg-zinc-900 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:border-[#FF6600]">
              <option value="">Toutes categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterCountry} onChange={e => { setFilterCountry(e.target.value); fetchProcedures(searchTerm, filterCategory, e.target.value); }}
              data-testid="filter-country"
              className="bg-zinc-900 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:border-[#FF6600]">
              <option value="">Tous pays</option>
              {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {(filterCategory || filterCountry) && (
              <button onClick={() => { setFilterCategory(""); setFilterCountry(""); fetchProcedures(searchTerm, "", ""); }}
                className="text-red-400 text-xs flex items-center gap-1 hover:text-red-300"><X className="w-3 h-3" /> Reset</button>
            )}
          </div>

          {/* Procedures List */}
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#FF6600]" /></div>
          ) : procedures.length === 0 ? (
            <div className="text-center py-16">
              <AlertCircle className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">Aucune procedure trouvee.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {procedures.map(p => (
                <div key={p.id} className="bg-zinc-900 border border-zinc-800 hover:border-[#FF6600]/50 transition-all p-4 flex items-center gap-4 group"
                  data-testid={`proc-row-${p.id}`}>
                  {/* Country flag */}
                  <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">
                    {p.country_flag && <img src={FLAG_URL(p.country_flag)} alt="" className="w-6 h-4" />}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-sm truncate group-hover:text-[#FF6600] transition-colors">{p.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-zinc-500 text-xs flex items-center gap-1"><Tag className="w-3 h-3" /> {p.category_name}</span>
                      <span className="text-zinc-500 text-xs flex items-center gap-1"><Globe className="w-3 h-3" /> {p.country_name}</span>
                      <span className="text-zinc-500 text-xs">{p.steps?.length || 0} etapes</span>
                      <span className="text-zinc-500 text-xs flex items-center gap-1"><Eye className="w-3 h-3" /> {p.views}</span>
                    </div>
                  </div>
                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 ${
                      p.status === "published" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                    }`}>{p.status === "published" ? "Publiee" : "Brouillon"}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 ${
                      p.active ? "bg-[#FF6600]/20 text-[#FF6600]" : "bg-zinc-700 text-zinc-500"
                    }`}>{p.active ? "Active" : "Inactive"}</span>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => navigate(`/admin/procedures/modifier/${p.id}`)} data-testid={`edit-proc-${p.id}`}
                      className="p-2 text-zinc-400 hover:text-[#FF6600] transition-colors"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => navigate(`/procedures/${p.id}`)} data-testid={`view-proc-${p.id}`}
                      className="p-2 text-zinc-400 hover:text-blue-400 transition-colors"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(p.id, p.title)} data-testid={`delete-proc-${p.id}`}
                      className="p-2 text-zinc-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-[#FF6600] transition-colors" />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

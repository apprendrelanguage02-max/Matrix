import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../lib/api";
import {
  FileText, CheckCircle, Clock, Eye, Plus, Search, Loader2, X,
  ExternalLink, Download, TrendingUp, FolderOpen, MessageSquare,
  ArrowUpRight, Menu
} from "lucide-react";
import { toast } from "sonner";
import { Sidebar, StatCard, ProcedureRow } from "./DashboardHelpers";
import { StatsTab, DocumentsTab, ConfigTab } from "./DashboardTabs";

export default function AdminProceduresDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [procedures, setProcedures] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [categories, setCategories] = useState([]);
  const [countries, setCountries] = useState([]);
  const [allFiles, setAllFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [chatActions, setChatActions] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [newAction, setNewAction] = useState({ title: "", country: "guinee" });
  const [editingAction, setEditingAction] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    api.get("/procedures/categories").then(r => setCategories(r.data)).catch(() => {});
    api.get("/procedures/countries").then(r => setCountries(r.data)).catch(() => {});
    api.get("/procedures/stats").then(r => setStats(r.data)).catch(() => {});
    fetchProcedures();
  }, []);

  const fetchProcedures = useCallback((search = "", category = "", country = "") => {
    setLoading(true);
    const params = { limit: 50 };
    if (search) params.search = search;
    if (category) params.category = category;
    if (country) params.country = country;
    api.get("/procedures", { params }).then(r => setProcedures(r.data.procedures)).catch(() => setProcedures([])).finally(() => setLoading(false));
  }, []);

  const fetchFiles = useCallback(() => {
    setFilesLoading(true);
    Promise.all(procedures.map(p => api.get(`/procedures/${p.id}/files`).then(r => r.data.map(f => ({ ...f, procedure_title: p.title }))).catch(() => [])))
      .then(results => setAllFiles(results.flat())).finally(() => setFilesLoading(false));
  }, [procedures]);

  const fetchChatActions = useCallback(() => {
    setChatLoading(true);
    api.get("/chat-actions").then(r => setChatActions(r.data)).catch(() => {}).finally(() => setChatLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === "documents" && procedures.length > 0) fetchFiles();
    if (activeTab === "config") fetchChatActions();
  }, [activeTab, procedures, fetchFiles, fetchChatActions]);

  const handleSearch = () => fetchProcedures(searchTerm, filterCategory, filterCountry);
  const handleDelete = async (id, title) => {
    if (!window.confirm(`Supprimer "${title}" ?`)) return;
    try { await api.delete(`/procedures/${id}`); toast.success("Procedure supprimee"); setProcedures(p => p.filter(proc => proc.id !== id)); setStats(s => s ? { ...s, total: s.total - 1 } : s); }
    catch { toast.error("Erreur"); }
  };
  const handleCreateChatAction = async () => {
    if (!newAction.title.trim()) return;
    try { const res = await api.post("/chat-actions", newAction); setChatActions(prev => [res.data, ...prev]); setNewAction({ title: "", country: "guinee" }); toast.success("Action creee"); }
    catch { toast.error("Erreur"); }
  };
  const handleDeleteChatAction = async (id) => { try { await api.delete(`/chat-actions/${id}`); setChatActions(prev => prev.filter(a => a.id !== id)); toast.success("Action supprimee"); } catch { toast.error("Erreur"); } };
  const handleUpdateChatAction = async (action) => { try { await api.put(`/chat-actions/${action.id}`, { title: action.title, country: action.country, procedure_id: action.procedure_id }); setChatActions(prev => prev.map(a => a.id === action.id ? { ...a, ...action } : a)); setEditingAction(null); toast.success("Action modifiee"); } catch { toast.error("Erreur"); } };
  const handleDeleteFile = async (fileId) => { try { await api.delete(`/procedures/files/${fileId}`); setAllFiles(prev => prev.filter(f => f.id !== fileId)); toast.success("Fichier supprime"); } catch { toast.error("Erreur"); } };

  return (
    <div className="flex min-h-screen bg-zinc-950 font-['Manrope']">
      <Sidebar active={activeTab} onNavigate={setActiveTab} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />
      <main className="flex-1 overflow-auto min-w-0">
        <div className="border-b border-zinc-800 bg-zinc-950 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(v => !v)} className="md:hidden text-zinc-400 hover:text-white p-1 flex-shrink-0" data-testid="mobile-sidebar-toggle"><Menu className="w-5 h-5" /></button>
            <h1 className="font-['Oswald'] text-base sm:text-xl font-bold uppercase tracking-tight text-white truncate">
              {activeTab === "dashboard" && "Tableau de bord"}{activeTab === "procedures" && "Procedures"}{activeTab === "stats" && "Statistiques"}{activeTab === "documents" && "Documents"}{activeTab === "config" && "Configuration"}
              <span className="text-[#FF6600] hidden sm:inline"> — Matrix News</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {(activeTab === "procedures" || activeTab === "dashboard") && (
              <>
                <div className="relative hidden sm:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder="Rechercher..." data-testid="proc-search" className="bg-zinc-900 border border-zinc-700 text-white text-sm pl-9 pr-3 py-2 w-44 lg:w-56 focus:outline-none focus:border-[#FF6600]" />
                </div>
                <button onClick={() => navigate("/admin/fiches")} data-testid="fiches-pdf-btn" className="flex items-center gap-1.5 sm:gap-2 bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider px-3 sm:px-4 py-2.5 hover:bg-zinc-700 border border-zinc-700 transition-colors">
                  <Download className="w-4 h-4" /> <span className="hidden sm:inline">Fiches PDF</span>
                </button>
                <button onClick={() => navigate("/admin/procedures/nouvelle")} data-testid="create-proc-btn" className="flex items-center gap-1.5 sm:gap-2 bg-[#FF6600] text-white text-xs font-bold uppercase tracking-wider px-3 sm:px-4 py-2.5 hover:bg-[#CC5200] transition-colors">
                  <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Creer</span>
                </button>
              </>
            )}
            <Link to="/procedures" className="flex items-center gap-1.5 text-zinc-500 text-xs hover:text-[#FF6600] transition-colors" data-testid="header-view-site">
              <ExternalLink className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Site</span>
            </Link>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === "dashboard" && (
            <>
              {stats && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <StatCard label="Total procedures" value={stats.total} icon={FileText} />
                    <StatCard label="Publiees" value={stats.published} icon={CheckCircle} color="#22c55e" />
                    <StatCard label="Brouillons" value={stats.drafts} icon={Clock} color="#eab308" />
                    <StatCard label="Vues totales" value={stats.total_views} icon={Eye} color="#3b82f6" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                    <StatCard label="Actives" value={stats.active} icon={TrendingUp} color="#22c55e" />
                    <StatCard label="Fichiers" value={stats.total_files} icon={FolderOpen} color="#a855f7" />
                    <StatCard label="Chat Actions" value={stats.total_chat_actions} icon={MessageSquare} color="#ec4899" />
                  </div>
                </>
              )}
              <h2 className="text-white font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-3">Procedures recentes</h2>
              {loading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#FF6600]" /></div> : (
                <div className="space-y-2 mb-6">{procedures.slice(0, 5).map(p => <ProcedureRow key={p.id} p={p} navigate={navigate} onDelete={handleDelete} />)}</div>
              )}
              {procedures.length > 5 && <button onClick={() => setActiveTab("procedures")} className="text-[#FF6600] text-xs font-bold flex items-center gap-1 hover:underline">Voir toutes <ArrowUpRight className="w-3 h-3" /></button>}
            </>
          )}

          {activeTab === "procedures" && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); fetchProcedures(searchTerm, e.target.value, filterCountry); }} data-testid="filter-category"
                  className="bg-zinc-900 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:border-[#FF6600]">
                  <option value="">Toutes categories</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={filterCountry} onChange={e => { setFilterCountry(e.target.value); fetchProcedures(searchTerm, filterCategory, e.target.value); }} data-testid="filter-country"
                  className="bg-zinc-900 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:border-[#FF6600]">
                  <option value="">Tous pays</option>{countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {(filterCategory || filterCountry) && <button onClick={() => { setFilterCategory(""); setFilterCountry(""); fetchProcedures(searchTerm, "", ""); }} className="text-red-400 text-xs flex items-center gap-1 hover:text-red-300"><X className="w-3 h-3" /> Reset</button>}
              </div>
              {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#FF6600]" /></div> :
                procedures.length === 0 ? <div className="text-center py-16"><p className="text-zinc-500 text-sm">Aucune procedure.</p><button onClick={() => navigate("/admin/procedures/nouvelle")} className="mt-3 text-[#FF6600] text-xs font-bold hover:underline">+ Creer</button></div> :
                <div className="space-y-2">{procedures.map(p => <ProcedureRow key={p.id} p={p} navigate={navigate} onDelete={handleDelete} />)}</div>}
            </>
          )}

          {activeTab === "stats" && <StatsTab stats={stats} categories={categories} countries={countries} procedures={procedures} />}
          {activeTab === "documents" && <DocumentsTab allFiles={allFiles} filesLoading={filesLoading} handleDeleteFile={handleDeleteFile} />}
          {activeTab === "config" && <ConfigTab countries={countries} categories={categories} chatActions={chatActions} chatLoading={chatLoading}
            newAction={newAction} setNewAction={setNewAction} editingAction={editingAction} setEditingAction={setEditingAction}
            handleCreateChatAction={handleCreateChatAction} handleDeleteChatAction={handleDeleteChatAction} handleUpdateChatAction={handleUpdateChatAction} />}
        </div>
      </main>
    </div>
  );
}

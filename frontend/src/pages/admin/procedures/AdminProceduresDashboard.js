import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import {
  LayoutDashboard, FileText, BarChart3, FolderOpen, Settings, Plus, Search, Eye, Edit, Trash2,
  Globe, Tag, CheckCircle, Clock, AlertCircle, ChevronRight, Loader2, X, ExternalLink,
  Download, TrendingUp, Users, MessageSquare, ArrowUpRight, Save
} from "lucide-react";
import { toast } from "sonner";

const FLAG_URL = (code) => `https://flagcdn.com/24x18/${code}.png`;

/* ─────────── Sidebar ─────────── */
function Sidebar({ active, onNavigate }) {
  const items = [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "procedures", label: "Procedures", icon: FileText },
    { id: "stats", label: "Statistiques", icon: BarChart3 },
    { id: "documents", label: "Gestion des documents", icon: FolderOpen },
    { id: "config", label: "Configuration", icon: Settings },
  ];
  const { user } = useAuth();
  return (
    <aside className="w-56 bg-zinc-950 border-r border-zinc-800 min-h-screen flex flex-col flex-shrink-0" data-testid="admin-sidebar">
      <div className="p-4 border-b border-zinc-800">
        <button onClick={() => onNavigate("dashboard")} className="text-[#FF6600] font-['Oswald'] text-lg font-bold uppercase tracking-wider flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5" /> Dashboard
        </button>
      </div>
      <nav className="flex-1 py-3">
        {items.map(item => (
          <button key={item.id} onClick={() => onNavigate(item.id)} data-testid={`sidebar-${item.id}`}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
              active === item.id
                ? "bg-zinc-800/60 text-[#FF6600] border-l-2 border-[#FF6600]"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}>
            <item.icon className="w-4 h-4" /> {item.label}
          </button>
        ))}
        <div className="h-px bg-zinc-800 mx-3 my-3" />
        <Link to="/procedures" data-testid="sidebar-view-site"
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-500 hover:text-[#FF6600] transition-colors">
          <ExternalLink className="w-4 h-4" /> Voir le site
        </Link>
      </nav>
      <div className="p-4 border-t border-zinc-800 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#FF6600] rounded-full flex items-center justify-center text-white text-xs font-bold">
          {(user?.username || "A")[0].toUpperCase()}
        </div>
        <div>
          <span className="text-zinc-300 text-xs font-bold block">{user?.username || "Admin"}</span>
          <span className="text-zinc-600 text-[10px]">Administrateur</span>
        </div>
      </div>
    </aside>
  );
}

function StatCard({ label, value, icon: Icon, color = "#FF6600", sub }) {
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

/* ═══════════ MAIN COMPONENT ═══════════ */
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

  const fetchProcedures = useCallback((search = "", category = "", country = "") => {
    setLoading(true);
    const params = { limit: 50 };
    if (search) params.search = search;
    if (category) params.category = category;
    if (country) params.country = country;
    api.get("/procedures", { params })
      .then(r => setProcedures(r.data.procedures))
      .catch(() => setProcedures([]))
      .finally(() => setLoading(false));
  }, []);

  const fetchFiles = useCallback(() => {
    setFilesLoading(true);
    // Fetch files from all procedures
    Promise.all(
      procedures.map(p => api.get(`/procedures/${p.id}/files`).then(r => r.data.map(f => ({ ...f, procedure_title: p.title }))).catch(() => []))
    ).then(results => setAllFiles(results.flat()))
      .finally(() => setFilesLoading(false));
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
    try {
      await api.delete(`/procedures/${id}`);
      toast.success("Procedure supprimee");
      setProcedures(p => p.filter(proc => proc.id !== id));
      setStats(s => s ? { ...s, total: s.total - 1 } : s);
    } catch { toast.error("Erreur"); }
  };

  const handleCreateChatAction = async () => {
    if (!newAction.title.trim()) return;
    try {
      const res = await api.post("/chat-actions", newAction);
      setChatActions(prev => [res.data, ...prev]);
      setNewAction({ title: "", country: "guinee" });
      toast.success("Action creee");
    } catch { toast.error("Erreur"); }
  };

  const handleDeleteChatAction = async (id) => {
    try {
      await api.delete(`/chat-actions/${id}`);
      setChatActions(prev => prev.filter(a => a.id !== id));
      toast.success("Action supprimee");
    } catch { toast.error("Erreur"); }
  };

  const handleUpdateChatAction = async (action) => {
    try {
      await api.put(`/chat-actions/${action.id}`, { title: action.title, country: action.country, procedure_id: action.procedure_id });
      setChatActions(prev => prev.map(a => a.id === action.id ? { ...a, ...action } : a));
      setEditingAction(null);
      toast.success("Action modifiee");
    } catch { toast.error("Erreur"); }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      await api.delete(`/procedures/files/${fileId}`);
      setAllFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success("Fichier supprime");
    } catch { toast.error("Erreur"); }
  };

  return (
    <div className="flex min-h-screen bg-zinc-950 font-['Manrope']">
      <Sidebar active={activeTab} onNavigate={setActiveTab} />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="font-['Oswald'] text-xl font-bold uppercase tracking-tight text-white">
              {activeTab === "dashboard" && "Tableau de bord"}
              {activeTab === "procedures" && "Toutes les procedures"}
              {activeTab === "stats" && "Statistiques"}
              {activeTab === "documents" && "Gestion des documents"}
              {activeTab === "config" && "Configuration"}
              <span className="text-[#FF6600]"> — Matrix News</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {(activeTab === "procedures" || activeTab === "dashboard") && (
              <>
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
              </>
            )}
            <Link to="/procedures" className="flex items-center gap-1.5 text-zinc-500 text-xs hover:text-[#FF6600] transition-colors" data-testid="header-view-site">
              <ExternalLink className="w-3.5 h-3.5" /> Site
            </Link>
          </div>
        </div>

        <div className="p-6">
          {/* ═══ TAB: DASHBOARD ═══ */}
          {activeTab === "dashboard" && (
            <>
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <StatCard label="Total procedures" value={stats.total} icon={FileText} />
                  <StatCard label="Publiees" value={stats.published} icon={CheckCircle} color="#22c55e" />
                  <StatCard label="Brouillons" value={stats.drafts} icon={Clock} color="#eab308" />
                  <StatCard label="Vues totales" value={stats.total_views} icon={Eye} color="#3b82f6" />
                </div>
              )}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                  <StatCard label="Actives" value={stats.active} icon={TrendingUp} color="#22c55e" />
                  <StatCard label="Fichiers" value={stats.total_files} icon={FolderOpen} color="#a855f7" />
                  <StatCard label="Chat Actions" value={stats.total_chat_actions} icon={MessageSquare} color="#ec4899" />
                </div>
              )}

              <h2 className="text-white font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-3">Procedures recentes</h2>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#FF6600]" /></div>
              ) : (
                <div className="space-y-2 mb-6">
                  {procedures.slice(0, 5).map(p => (
                    <ProcedureRow key={p.id} p={p} navigate={navigate} onDelete={handleDelete} />
                  ))}
                </div>
              )}
              {procedures.length > 5 && (
                <button onClick={() => setActiveTab("procedures")}
                  className="text-[#FF6600] text-xs font-bold flex items-center gap-1 hover:underline">
                  Voir toutes les procedures <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </>
          )}

          {/* ═══ TAB: PROCEDURES ═══ */}
          {activeTab === "procedures" && (
            <>
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
              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#FF6600]" /></div>
              ) : procedures.length === 0 ? (
                <div className="text-center py-16">
                  <AlertCircle className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm">Aucune procedure trouvee.</p>
                  <button onClick={() => navigate("/admin/procedures/nouvelle")} className="mt-3 text-[#FF6600] text-xs font-bold hover:underline">
                    + Creer une procedure
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {procedures.map(p => (
                    <ProcedureRow key={p.id} p={p} navigate={navigate} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ═══ TAB: STATISTIQUES ═══ */}
          {activeTab === "stats" && (
            <>
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  <StatCard label="Total" value={stats.total} icon={FileText} />
                  <StatCard label="Publiees" value={stats.published} icon={CheckCircle} color="#22c55e" />
                  <StatCard label="Brouillons" value={stats.drafts} icon={Clock} color="#eab308" />
                  <StatCard label="Vues totales" value={stats.total_views} icon={Eye} color="#3b82f6" />
                </div>
              )}

              {/* By Category */}
              {stats?.by_category && Object.keys(stats.by_category).length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 mb-6" data-testid="stats-by-category">
                  <h3 className="text-white font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-4">Par categorie</h3>
                  <div className="space-y-2">
                    {Object.entries(stats.by_category).map(([cat, count]) => {
                      const catName = categories.find(c => c.id === cat)?.name || cat;
                      const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                      return (
                        <div key={cat} className="flex items-center gap-3">
                          <span className="text-zinc-400 text-xs w-44 truncate">{catName}</span>
                          <div className="flex-1 bg-zinc-800 h-3 rounded-full overflow-hidden">
                            <div className="h-full bg-[#FF6600] rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-white text-xs font-bold w-10 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* By Country */}
              {stats?.by_country && Object.keys(stats.by_country).length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5" data-testid="stats-by-country">
                  <h3 className="text-white font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-4">Par pays</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(stats.by_country).map(([cid, count]) => {
                      const c = countries.find(x => x.id === cid);
                      return (
                        <div key={cid} className="flex items-center gap-3 bg-zinc-800 px-3 py-2.5 rounded">
                          {c?.flag && <img src={FLAG_URL(c.flag)} alt="" className="w-5 h-4" />}
                          <span className="text-zinc-300 text-xs flex-1">{c?.name || cid}</span>
                          <span className="text-[#FF6600] text-sm font-bold">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Top viewed */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 mt-6" data-testid="stats-top-viewed">
                <h3 className="text-white font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-4">Les plus consultees</h3>
                <div className="space-y-2">
                  {[...procedures].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5).map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 bg-zinc-800 px-3 py-2.5 rounded">
                      <span className="text-[#FF6600] text-sm font-bold w-6">{i + 1}.</span>
                      {p.country_flag && <img src={FLAG_URL(p.country_flag)} alt="" className="w-5 h-4" />}
                      <span className="text-white text-sm flex-1 truncate">{p.title}</span>
                      <span className="text-zinc-400 text-xs flex items-center gap-1"><Eye className="w-3 h-3" /> {p.views || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ═══ TAB: DOCUMENTS ═══ */}
          {activeTab === "documents" && (
            <>
              <p className="text-zinc-400 text-xs mb-4">{allFiles.length} fichier{allFiles.length !== 1 ? "s" : ""} attache{allFiles.length !== 1 ? "s" : ""} a vos procedures</p>
              {filesLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#FF6600]" /></div>
              ) : allFiles.length === 0 ? (
                <div className="text-center py-16">
                  <FolderOpen className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm">Aucun document. Ajoutez des fichiers dans le builder de procedure.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allFiles.map(f => (
                    <div key={f.id} className="bg-zinc-900 border border-zinc-800 p-4 flex items-center gap-4 group" data-testid={`doc-${f.id}`}>
                      <div className="w-10 h-10 bg-[#FF6600]/10 rounded flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-[#FF6600]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-bold truncate">{f.file_name || f.original_filename}</p>
                        <p className="text-zinc-500 text-[10px] mt-0.5">
                          Procedure : <span className="text-zinc-400">{f.procedure_title}</span>
                          {" | "}{f.file_type?.toUpperCase()} | {f.content_type}
                        </p>
                      </div>
                      <a href={`${process.env.REACT_APP_BACKEND_URL}/api/procedures/files/${f.id}/download`}
                        target="_blank" rel="noreferrer"
                        className="p-2 text-zinc-400 hover:text-green-400 transition-colors">
                        <Download className="w-4 h-4" />
                      </a>
                      <button onClick={() => handleDeleteFile(f.id)}
                        className="p-2 text-zinc-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ═══ TAB: CONFIGURATION ═══ */}
          {activeTab === "config" && (
            <>
              {/* Chat Actions Management */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 mb-6" data-testid="config-chat-actions">
                <h3 className="text-white font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#FF6600]" /> Actions de Chat (Assistant IA)
                </h3>
                <p className="text-zinc-500 text-xs mb-4">Ces actions apparaissent dans l'assistant IA pour guider les utilisateurs vers les procedures populaires.</p>

                {/* Add new action */}
                <div className="flex items-center gap-2 mb-4">
                  <input value={newAction.title} onChange={e => setNewAction(prev => ({ ...prev, title: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && handleCreateChatAction()}
                    placeholder="Ex: Visa Canada..." data-testid="new-chat-action-title"
                    className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:border-[#FF6600]" />
                  <select value={newAction.country} onChange={e => setNewAction(prev => ({ ...prev, country: e.target.value }))}
                    data-testid="new-chat-action-country"
                    className="bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 w-40 focus:outline-none focus:border-[#FF6600]">
                    {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button onClick={handleCreateChatAction} data-testid="add-chat-action-btn"
                    className="bg-[#FF6600] text-white text-xs font-bold uppercase px-4 py-2.5 hover:bg-[#CC5200]">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {chatLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-[#FF6600]" /></div>
                ) : chatActions.length === 0 ? (
                  <p className="text-zinc-600 text-xs text-center py-4">Aucune action configuree.</p>
                ) : (
                  <div className="space-y-1.5">
                    {chatActions.map(a => (
                      <div key={a.id} className="flex items-center gap-3 bg-zinc-800 px-3 py-2.5 rounded group" data-testid={`chat-action-${a.id}`}>
                        {a.country_flag && <img src={FLAG_URL(a.country_flag)} alt="" className="w-5 h-4" />}
                        {editingAction?.id === a.id ? (
                          <>
                            <input value={editingAction.title} onChange={e => setEditingAction(prev => ({ ...prev, title: e.target.value }))}
                              className="flex-1 bg-zinc-700 border border-zinc-600 text-white text-sm px-2 py-1 focus:outline-none focus:border-[#FF6600]" />
                            <button onClick={() => handleUpdateChatAction(editingAction)} className="text-green-400 hover:text-green-300"><Save className="w-4 h-4" /></button>
                            <button onClick={() => setEditingAction(null)} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <span className="text-white text-sm flex-1">{a.title}</span>
                            <span className="text-zinc-600 text-[10px]">{a.country_name}</span>
                            <button onClick={() => setEditingAction({ ...a })} className="p-1 text-zinc-500 hover:text-[#FF6600] opacity-0 group-hover:opacity-100">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteChatAction(a.id)} className="p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Categories & Countries Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5" data-testid="config-categories">
                  <h3 className="text-white font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#FF6600]" /> Categories
                  </h3>
                  <div className="space-y-1.5">
                    {categories.map(c => (
                      <div key={c.id} className="flex items-center gap-2 bg-zinc-800 px-3 py-2 rounded">
                        <div className="w-2 h-2 bg-[#FF6600] rounded-full" />
                        <span className="text-zinc-300 text-sm">{c.name}</span>
                        <span className="text-zinc-600 text-[10px] ml-auto">{c.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5" data-testid="config-countries">
                  <h3 className="text-white font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#FF6600]" /> Pays disponibles
                  </h3>
                  <div className="space-y-1.5">
                    {countries.map(c => (
                      <div key={c.id} className="flex items-center gap-2 bg-zinc-800 px-3 py-2 rounded">
                        <img src={FLAG_URL(c.flag)} alt="" className="w-5 h-4" />
                        <span className="text-zinc-300 text-sm">{c.name}</span>
                        <span className="text-zinc-600 text-[10px] ml-auto">{c.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ─── Procedure Row Component ─── */
function ProcedureRow({ p, navigate, onDelete }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 hover:border-[#FF6600]/50 transition-all p-4 flex items-center gap-4 group"
      data-testid={`proc-row-${p.id}`}>
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
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 ${
          p.status === "published" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
        }`}>{p.status === "published" ? "Publiee" : "Brouillon"}</span>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 ${
          p.active ? "bg-[#FF6600]/20 text-[#FF6600]" : "bg-zinc-700 text-zinc-500"
        }`}>{p.active ? "Active" : "Inactive"}</span>
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

import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { toast } from "sonner";
import {
  LayoutDashboard, FileText, FilePlus, FolderOpen, Clock,
  Image, Tag, BarChart3, Pencil, Trash2, Loader2, Eye,
  Calendar, Plus, ChevronRight, TrendingUp, Heart, Search,
  MoreVertical, Filter
} from "lucide-react";

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_BADGE = {
  draft: { label: "Brouillon", cls: "bg-yellow-100 text-yellow-700" },
  published: { label: "Publie", cls: "bg-green-100 text-green-700" },
  scheduled: { label: "Programme", cls: "bg-blue-100 text-blue-700" },
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ active, stats, collapsed }) {
  const items = [
    { id: "dashboard", icon: LayoutDashboard, label: "Tableau de bord", to: "/admin" },
    { id: "all", icon: FileText, label: "Tous les articles", to: "/admin?tab=all" },
    { id: "drafts", icon: FolderOpen, label: "Brouillons", to: "/admin?tab=drafts", count: stats.drafts },
    { id: "scheduled", icon: Clock, label: "Programmes", to: "/admin?tab=scheduled", count: stats.scheduled },
    { id: "categories", icon: Tag, label: "Categories", to: "/admin?tab=categories" },
    { id: "stats", icon: BarChart3, label: "Statistiques", to: "/admin?tab=stats" },
  ];

  return (
    <aside className={`bg-black text-white flex-shrink-0 ${collapsed ? "w-16" : "w-60"} transition-all duration-200 hidden lg:flex flex-col`} data-testid="dashboard-sidebar">
      <div className="p-4 border-b border-zinc-800">
        <Link to="/admin/nouvelle" className="flex items-center justify-center gap-2 bg-[#FF6600] text-white font-bold text-xs uppercase tracking-wider py-2.5 px-4 hover:bg-[#CC5200] transition-colors w-full" data-testid="sidebar-new-article">
          <Plus className="w-4 h-4" />
          {!collapsed && "Nouvel article"}
        </Link>
      </div>
      <nav className="flex-1 py-2 overflow-y-auto">
        {items.map(item => (
          <Link
            key={item.id}
            to={item.to}
            data-testid={`sidebar-${item.id}`}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-['Manrope'] transition-colors duration-150 group ${
              active === item.id
                ? "bg-zinc-800 text-[#FF6600] border-r-2 border-[#FF6600]"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <item.icon className={`w-4 h-4 flex-shrink-0 ${active === item.id ? "text-[#FF6600]" : "text-zinc-500 group-hover:text-white"}`} />
            {!collapsed && (
              <>
                <span className="flex-1 truncate">{item.label}</span>
                {item.count > 0 && (
                  <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-1.5 py-0.5 rounded">{item.count}</span>
                )}
              </>
            )}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

// ─── Stats Cards ──────────────────────────────────────────────────────────────
function StatsOverview({ stats }) {
  const cards = [
    { label: "Total articles", value: stats.total, icon: FileText, color: "text-black" },
    { label: "Publies", value: stats.published, icon: TrendingUp, color: "text-green-600" },
    { label: "Brouillons", value: stats.drafts, icon: FolderOpen, color: "text-yellow-600" },
    { label: "Programmes", value: stats.scheduled, icon: Clock, color: "text-blue-600" },
    { label: "Vues totales", value: stats.total_views, icon: Eye, color: "text-[#FF6600]" },
    { label: "Likes totaux", value: stats.total_likes, icon: Heart, color: "text-red-500" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="stats-overview">
      {cards.map(c => (
        <div key={c.label} className="bg-white border border-zinc-200 p-4 hover:border-zinc-300 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <c.icon className={`w-4 h-4 ${c.color}`} />
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{c.label}</p>
          </div>
          <p className={`font-['Oswald'] text-2xl font-bold ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Article Row ──────────────────────────────────────────────────────────────
function ArticleRow({ article, onDelete, deletingId, navigate }) {
  const badge = STATUS_BADGE[article.status] || STATUS_BADGE.draft;
  return (
    <div
      data-testid={`article-row-${article.id}`}
      className="bg-white border border-zinc-200 hover:border-zinc-400 transition-all duration-150 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
    >
      {article.image_url ? (
        <div className="w-full sm:w-20 h-14 flex-shrink-0 overflow-hidden">
          <img src={article.image_url} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />
        </div>
      ) : (
        <div className="hidden sm:flex w-20 h-14 flex-shrink-0 bg-zinc-100 items-center justify-center">
          <FileText className="w-5 h-5 text-zinc-300" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${badge.cls}`}>{badge.label}</span>
          {article.is_breaking && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-red-600 text-white">Breaking</span>}
          {article.category && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-zinc-100 text-zinc-500">{article.category}</span>}
        </div>
        <h3 className="font-['Oswald'] text-base font-bold uppercase tracking-tight text-black truncate">
          {article.title}
        </h3>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-400 font-['Manrope']">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(article.created_at)}</span>
          <span className="flex items-center gap-1 text-[#FF6600]"><Eye className="w-3 h-3" />{article.views || 0}</span>
          <span className="flex items-center gap-1 text-red-400"><Heart className="w-3 h-3" />{article.likes_count || 0}</span>
          {article.word_count > 0 && <span>{article.word_count} mots</span>}
          {article.reading_time > 0 && <span>{article.reading_time} min</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Link to={`/article/${article.id}`} className="p-2 text-zinc-400 hover:text-black transition-colors" title="Voir"><Eye className="w-4 h-4" /></Link>
        <button onClick={() => navigate(`/admin/modifier/${article.id}`)} className="p-2 text-zinc-400 hover:text-[#FF6600] transition-colors" title="Modifier" data-testid={`edit-${article.id}`}><Pencil className="w-4 h-4" /></button>
        <button onClick={() => onDelete(article.id)} disabled={deletingId === article.id} className="p-2 text-zinc-400 hover:text-red-600 transition-colors disabled:opacity-50" title="Supprimer" data-testid={`delete-${article.id}`}>
          {deletingId === article.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const tab = params.get("tab") || "dashboard";

  const [articles, setArticles] = useState([]);
  const [stats, setStats] = useState({ total: 0, published: 0, drafts: 0, scheduled: 0, total_views: 0, total_likes: 0 });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/my-articles"),
      api.get("/my-articles/stats"),
    ]).then(([articlesRes, statsRes]) => {
      setArticles(articlesRes.data);
      setStats(statsRes.data);
    }).catch(() => toast.error("Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet article definitivement ?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/articles/${id}`);
      setArticles(prev => prev.filter(a => a.id !== id));
      setStats(prev => ({ ...prev, total: prev.total - 1 }));
      toast.success("Article supprime.");
    } catch { toast.error("Erreur lors de la suppression."); }
    finally { setDeletingId(null); }
  };

  // Filter articles based on tab + search + status
  const filteredArticles = articles.filter(a => {
    if (tab === "drafts" && a.status !== "draft") return false;
    if (tab === "scheduled" && a.status !== "scheduled") return false;
    if (statusFilter && a.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return a.title.toLowerCase().includes(q) || (a.category || "").toLowerCase().includes(q);
    }
    return true;
  });

  const activeTab = tab === "drafts" || tab === "scheduled" || tab === "all" || tab === "categories" || tab === "stats" ? tab : "dashboard";

  return (
    <div className="min-h-screen bg-zinc-100 font-['Manrope'] flex flex-col">
      {/* Topbar */}
      <header className="bg-black text-white h-14 flex items-center px-4 sm:px-6 gap-4 sticky top-0 z-50 shadow-lg" data-testid="dashboard-topbar">
        <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
          <img src="https://customer-assets.emergentagent.com/job_2b66c898-0ce0-4fc9-a685-24a9ac754e60/artifacts/p7stxwf9_ChatGPT%20Image%20Feb%2017%2C%202026%2C%2005_57_11%20PM.png" alt="Logo" className="w-7 h-7 object-contain rounded-sm" />
          <span className="hidden sm:inline font-['Oswald'] text-lg font-bold tracking-widest uppercase group-hover:text-[#FF6600] transition-colors">Newsroom</span>
        </Link>

        <div className="flex-1" />

        <Link to="/" className="text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors hidden sm:block">Retour au site</Link>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#FF6600] flex items-center justify-center text-xs font-bold text-white font-['Oswald']">
            {user?.username?.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-bold text-white leading-tight">{user?.username}</p>
            <p className="text-[10px] text-zinc-500 uppercase">{user?.role}</p>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar active={activeTab} stats={stats} />

        {/* Mobile tabs */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-black z-50 border-t border-zinc-800 flex">
          {[
            { id: "dashboard", icon: LayoutDashboard, to: "/admin" },
            { id: "all", icon: FileText, to: "/admin?tab=all" },
            { id: "drafts", icon: FolderOpen, to: "/admin?tab=drafts" },
            { id: "stats", icon: BarChart3, to: "/admin?tab=stats" },
          ].map(item => (
            <Link key={item.id} to={item.to} className={`flex-1 flex flex-col items-center py-2.5 ${activeTab === item.id ? "text-[#FF6600]" : "text-zinc-500"}`}>
              <item.icon className="w-4 h-4" />
              <span className="text-[9px] mt-0.5 uppercase font-bold tracking-wider">{item.id === "dashboard" ? "Home" : item.id}</span>
            </Link>
          ))}
          <Link to="/admin/nouvelle" className="flex-1 flex flex-col items-center py-2.5 text-[#FF6600]">
            <Plus className="w-4 h-4" />
            <span className="text-[9px] mt-0.5 uppercase font-bold tracking-wider">Creer</span>
          </Link>
        </div>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 overflow-y-auto" data-testid="dashboard-content">
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-['Oswald'] text-2xl sm:text-3xl font-bold uppercase tracking-tight text-black">Tableau de bord</h1>
                  <p className="text-xs text-zinc-500 mt-1">Bienvenue, {user?.username}</p>
                </div>
                <Link to="/admin/nouvelle" className="hidden sm:flex items-center gap-2 bg-[#FF6600] text-white font-bold text-xs uppercase tracking-wider py-2.5 px-5 hover:bg-[#CC5200] transition-colors" data-testid="new-article-btn">
                  <Plus className="w-4 h-4" /> Nouvel article
                </Link>
              </div>

              <StatsOverview stats={stats} />

              {/* Recent articles */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-['Oswald'] text-lg font-bold uppercase tracking-tight">Articles recents</h2>
                  <Link to="/admin?tab=all" className="text-xs font-bold text-[#FF6600] hover:underline uppercase tracking-wider flex items-center gap-1">
                    Tout voir <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                {loading ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#FF6600]" /></div>
                ) : articles.length === 0 ? (
                  <div className="bg-white border border-zinc-200 p-12 text-center">
                    <FileText className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                    <p className="font-['Oswald'] text-xl uppercase text-zinc-400">Aucun article</p>
                    <p className="text-sm text-zinc-400 mt-1 mb-4">Commencez par creer votre premier article.</p>
                    <Link to="/admin/nouvelle" className="inline-flex items-center gap-2 bg-[#FF6600] text-white font-bold text-xs uppercase tracking-wider py-2.5 px-5 hover:bg-[#CC5200] transition-colors">
                      <Plus className="w-4 h-4" /> Creer un article
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {articles.slice(0, 5).map(a => (
                      <ArticleRow key={a.id} article={a} onDelete={handleDelete} deletingId={deletingId} navigate={navigate} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {(activeTab === "all" || activeTab === "drafts" || activeTab === "scheduled") && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h1 className="font-['Oswald'] text-2xl font-bold uppercase tracking-tight text-black">
                  {activeTab === "all" ? "Tous les articles" : activeTab === "drafts" ? "Brouillons" : "Articles programmes"}
                </h1>
                <Link to="/admin/nouvelle" className="flex items-center gap-2 bg-[#FF6600] text-white font-bold text-xs uppercase tracking-wider py-2 px-4 hover:bg-[#CC5200] transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Nouveau
                </Link>
              </div>

              {/* Search + Filter bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex items-center flex-1 bg-white border border-zinc-200 px-3">
                  <Search className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Rechercher..." data-testid="article-search"
                    className="flex-1 bg-transparent text-sm py-2 px-2 focus:outline-none" />
                </div>
                {activeTab === "all" && (
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} data-testid="status-filter"
                    className="bg-white border border-zinc-200 px-3 py-2 text-sm focus:outline-none">
                    <option value="">Tous les statuts</option>
                    <option value="published">Publies</option>
                    <option value="draft">Brouillons</option>
                    <option value="scheduled">Programmes</option>
                  </select>
                )}
              </div>

              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#FF6600]" /></div>
              ) : filteredArticles.length === 0 ? (
                <div className="bg-white border border-zinc-200 p-12 text-center">
                  <FileText className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                  <p className="text-zinc-400 text-sm">Aucun article trouve</p>
                </div>
              ) : (
                <div className="space-y-2" data-testid="articles-list">
                  {filteredArticles.map(a => (
                    <ArticleRow key={a.id} article={a} onDelete={handleDelete} deletingId={deletingId} navigate={navigate} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "categories" && (
            <div className="space-y-4">
              <h1 className="font-['Oswald'] text-2xl font-bold uppercase tracking-tight text-black">Categories</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...new Set(articles.map(a => a.category).filter(Boolean))].map(cat => {
                  const count = articles.filter(a => a.category === cat).length;
                  return (
                    <div key={cat} className="bg-white border border-zinc-200 p-4 hover:border-[#FF6600] transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-[#FF6600]" />
                          <span className="font-bold text-sm">{cat}</span>
                        </div>
                        <span className="text-xs text-zinc-400 font-bold">{count} article{count !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "stats" && (
            <div className="space-y-6">
              <h1 className="font-['Oswald'] text-2xl font-bold uppercase tracking-tight text-black">Statistiques</h1>
              <StatsOverview stats={stats} />
              <div className="bg-white border border-zinc-200 p-6">
                <h3 className="font-['Oswald'] text-lg font-bold uppercase mb-4">Top articles par vues</h3>
                <div className="space-y-3">
                  {[...articles].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10).map((a, i) => (
                    <div key={a.id} className="flex items-center gap-3">
                      <span className="font-['Oswald'] text-lg font-bold text-zinc-300 w-6">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{a.title}</p>
                        <p className="text-[11px] text-zinc-400">{a.category}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-[#FF6600]">{a.views || 0} vues</p>
                        <p className="text-[11px] text-zinc-400">{a.likes_count || 0} likes</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

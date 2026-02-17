import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import api from "../lib/api";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Calendar, FileText, Eye } from "lucide-react";

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function DashboardPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  const fetchArticles = () => {
    api.get("/my-articles")
      .then((r) => setArticles(r.data))
      .catch(() => toast.error("Erreur lors du chargement."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchArticles(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet article définitivement ?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/articles/${id}`);
      setArticles((prev) => prev.filter((a) => a.id !== id));
      toast.success("Article supprimé.");
    } catch {
      toast.error("Erreur lors de la suppression.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />
      <div className="h-1.5 bg-[#FF6600]" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="font-['Oswald'] text-3xl md:text-4xl font-bold uppercase tracking-tight text-black">
              Mes articles
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {articles.length} article{articles.length !== 1 ? "s" : ""} publié{articles.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            to="/admin/nouvelle"
            data-testid="new-article-button"
            className="inline-flex items-center gap-2 bg-[#FF6600] text-white font-bold font-['Manrope'] uppercase tracking-wider px-6 py-3 hover:bg-[#CC5200] transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            Nouvel article
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-white border border-zinc-200 p-5" data-testid="stat-total">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Total</p>
            <p className="font-['Oswald'] text-3xl font-bold text-black">{articles.length}</p>
          </div>
          <div className="bg-white border border-zinc-200 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Avec image</p>
            <p className="font-['Oswald'] text-3xl font-bold text-black">
              {articles.filter((a) => a.image_url).length}
            </p>
          </div>
          <div className="bg-white border border-zinc-200 p-5 col-span-2 sm:col-span-1">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Sans image</p>
            <p className="font-['Oswald'] text-3xl font-bold text-black">
              {articles.filter((a) => !a.image_url).length}
            </p>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-white border border-zinc-200 p-16 text-center" data-testid="empty-dashboard">
            <FileText className="w-10 h-10 text-zinc-300 mx-auto mb-4" />
            <p className="font-['Oswald'] text-2xl uppercase text-zinc-400">Aucun article</p>
            <p className="text-sm text-zinc-400 mt-2 mb-6">Commencez par créer votre premier article.</p>
            <Link
              to="/admin/nouvelle"
              className="inline-flex items-center gap-2 bg-[#FF6600] text-white font-bold font-['Manrope'] uppercase tracking-wider px-6 py-3 hover:bg-[#CC5200] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Créer un article
            </Link>
          </div>
        ) : (
          <div className="space-y-2" data-testid="articles-dashboard-list">
            {articles.map((article) => (
              <div
                key={article.id}
                data-testid={`dashboard-article-${article.id}`}
                className="bg-white border border-zinc-200 hover:border-black transition-colors duration-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                {/* Thumbnail */}
                {article.image_url ? (
                  <div className="w-full sm:w-20 h-16 sm:h-14 flex-shrink-0 overflow-hidden">
                    <img
                      src={article.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  </div>
                ) : (
                  <div className="w-full sm:w-20 h-14 flex-shrink-0 bg-zinc-100 flex items-center justify-center hidden sm:flex">
                    <FileText className="w-5 h-5 text-zinc-300" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-['Oswald'] text-lg font-bold uppercase tracking-tight text-black truncate">
                    {article.title}
                  </h3>
                <p className="text-xs text-zinc-400 flex items-center gap-3 mt-1 font-['Manrope']">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(article.published_at)}
                    </span>
                    <span className="flex items-center gap-1 text-[#FF6600]" data-testid={`dashboard-views-${article.id}`}>
                      <Eye className="w-3 h-3" />
                      {article.views ?? 0} vue{(article.views ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    to={`/article/${article.id}`}
                    data-testid={`view-article-${article.id}`}
                    className="text-xs font-bold uppercase tracking-wider font-['Manrope'] text-zinc-500 hover:text-black transition-colors px-3 py-2 border border-zinc-200 hover:border-black"
                  >
                    Voir
                  </Link>
                  <button
                    onClick={() => navigate(`/admin/modifier/${article.id}`)}
                    data-testid={`edit-article-${article.id}`}
                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider font-['Manrope'] text-white bg-black hover:bg-zinc-700 transition-colors px-3 py-2"
                  >
                    <Pencil className="w-3 h-3" />
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(article.id)}
                    disabled={deletingId === article.id}
                    data-testid={`delete-article-${article.id}`}
                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider font-['Manrope'] text-white bg-red-600 hover:bg-red-700 transition-colors px-3 py-2 disabled:opacity-60"
                  >
                    {deletingId === article.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

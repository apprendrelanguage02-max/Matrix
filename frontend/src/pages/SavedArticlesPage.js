import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import ArticleCard from "../components/ArticleCard";
import api from "../lib/api";
import { toast } from "sonner";
import { Loader2, Bookmark, ArrowLeft } from "lucide-react";

export default function SavedArticlesPage() {
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/saved-articles")
      .then((r) => setSaved(r.data))
      .catch(() => toast.error("Erreur lors du chargement."))
      .finally(() => setLoading(false));
  }, []);

  const handleUnsave = async (articleId) => {
    try {
      await api.delete(`/saved-articles/${articleId}`);
      setSaved((prev) => prev.filter((s) => s.article_id !== articleId));
      toast.success("Sauvegarde supprimée.");
    } catch {
      toast.error("Erreur lors de la suppression.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />
      <div className="h-1.5 bg-[#FF6600]" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500 hover:text-[#FF6600] transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Bookmark className="w-6 h-6 text-[#FF6600]" />
          <h1 className="font-['Oswald'] text-3xl font-bold uppercase tracking-tight text-black">
            Mes sauvegardes
          </h1>
          {!loading && (
            <span className="text-sm text-zinc-500 font-['Manrope']">
              ({saved.length} article{saved.length !== 1 ? "s" : ""})
            </span>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
          </div>
        )}

        {!loading && saved.length === 0 && (
          <div className="text-center py-24 bg-white border border-zinc-200" data-testid="empty-saved">
            <Bookmark className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
            <p className="font-['Oswald'] text-2xl uppercase text-zinc-300">Aucun article sauvegardé</p>
            <p className="text-sm text-zinc-400 mt-2 mb-6">Sauvegardez des articles pour les retrouver ici.</p>
            <Link to="/" className="inline-flex items-center gap-2 bg-[#FF6600] text-white font-bold font-['Manrope'] uppercase tracking-wider px-6 py-3 hover:bg-[#CC5200] transition-colors">
              Explorer les articles
            </Link>
          </div>
        )}

        {!loading && saved.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="saved-articles-list">
            {saved.map((s) =>
              s.article ? (
                <div key={s.id} className="relative group/saved">
                  <ArticleCard article={s.article} />
                  <button
                    onClick={() => handleUnsave(s.article_id)}
                    data-testid={`unsave-${s.article_id}`}
                    className="absolute top-3 right-3 bg-black/70 text-white hover:bg-red-600 transition-colors p-1.5 rounded-full opacity-0 group-hover/saved:opacity-100 duration-200"
                    title="Retirer des sauvegardes"
                  >
                    <Bookmark className="w-3.5 h-3.5 fill-white" />
                  </button>
                </div>
              ) : null
            )}
          </div>
        )}
      </main>

      <footer className="bg-black text-zinc-400 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <span className="font-['Oswald'] text-white font-bold tracking-widest uppercase">Matrix News</span>
          <p className="font-['Manrope'] text-xs">&copy; {new Date().getFullYear()} — Tous droits réservés</p>
        </div>
      </footer>
    </div>
  );
}

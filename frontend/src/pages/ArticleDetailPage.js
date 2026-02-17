import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../components/Header";
import api from "../lib/api";
import { Loader2, ArrowLeft, Calendar, User, Eye } from "lucide-react";

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function ArticleDetailPage() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch article then increment view count
    api.get(`/articles/${id}`)
      .then((r) => {
        setArticle(r.data);
        // Increment views (fire-and-forget)
        api.post(`/articles/${id}/view`)
          .then((res) => setArticle((prev) => prev ? { ...prev, views: res.data.views } : prev))
          .catch(() => {});
      })
      .catch(() => setError("Article introuvable."))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen bg-white font-['Manrope']">
      <Header />
      <div className="h-1.5 bg-[#FF6600]" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          to="/"
          data-testid="back-to-home"
          className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider font-['Manrope'] text-zinc-500 hover:text-[#FF6600] transition-colors duration-200 mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux actualités
        </Link>

        {loading && (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
          </div>
        )}

        {error && (
          <div className="text-center py-24" data-testid="article-error">
            <p className="font-['Oswald'] text-3xl uppercase text-zinc-300">{error}</p>
            <Link to="/" className="mt-4 inline-block text-[#FF6600] font-bold underline">
              Retour à l'accueil
            </Link>
          </div>
        )}

        {article && (
          <article data-testid="article-detail">
            {/* Meta */}
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-[#FF6600] mb-4 flex-wrap">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {article.author_username}
              </span>
              <span className="text-zinc-300">|</span>
              <span className="flex items-center gap-1 text-zinc-400">
                <Calendar className="w-3 h-3" />
                {formatDate(article.published_at)}
              </span>
              <span className="text-zinc-300">|</span>
              <span className="flex items-center gap-1 text-[#FF6600]" data-testid="article-views">
                <Eye className="w-3 h-3" />
                {article.views ?? 0} vue{(article.views ?? 0) !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Title */}
            <h1 className="font-['Oswald'] text-4xl md:text-6xl font-bold uppercase tracking-tighter text-black leading-none mb-8">
              {article.title}
            </h1>

            {/* Image */}
            {article.image_url && (
              <div className="mb-10 overflow-hidden">
                <img
                  src={article.image_url}
                  alt={article.title}
                  data-testid="article-image"
                  className="w-full object-cover max-h-[480px]"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </div>
            )}

            {/* Separator */}
            <div className="flex items-center gap-4 mb-8">
              <div className="h-0.5 w-12 bg-[#FF6600]" />
            </div>

            {/* Content */}
            <div
              className="font-['Manrope'] text-lg text-zinc-800 leading-relaxed whitespace-pre-wrap"
              data-testid="article-content"
            >
              {article.content}
            </div>
          </article>
        )}
      </main>

      <footer className="bg-black text-zinc-400 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-['Oswald'] text-white font-bold tracking-widest uppercase">NewsApp</span>
          <p className="font-['Manrope'] text-xs">&copy; {new Date().getFullYear()} — Tous droits réservés</p>
        </div>
      </footer>
    </div>
  );
}

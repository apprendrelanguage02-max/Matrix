import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../components/Header";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { isHtmlContent, renderContent } from "../lib/contentRenderer";
import { getCategoryColor, slugify } from "../lib/categories";
import { Loader2, ArrowLeft, Calendar, User, Eye, Tag, Bookmark } from "lucide-react";
import { toast } from "sonner";

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
    api.get(`/articles/${id}`)
      .then((r) => {
        setArticle(r.data);
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          to="/"
          data-testid="back-to-home"
          className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500 hover:text-[#FF6600] transition-colors duration-200 mb-10"
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
            <Link to="/" className="mt-4 inline-block text-[#FF6600] font-bold underline">Retour à l'accueil</Link>
          </div>
        )}

        {article && (
          <article data-testid="article-detail">
            {/* Category + meta row */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              {article.category && (
                <Link
                  to={`/categorie/${slugify(article.category)}`}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest font-['Manrope'] ${getCategoryColor(article.category).bg} ${getCategoryColor(article.category).text}`}
                >
                  <Tag className="w-2.5 h-2.5" />
                  {article.category}
                </Link>
              )}
              <span className="flex items-center gap-1 text-xs text-zinc-400 font-['Manrope']">
                <User className="w-3 h-3" />
                {article.author_username}
              </span>
              <span className="flex items-center gap-1 text-xs text-zinc-400 font-['Manrope']">
                <Calendar className="w-3 h-3" />
                {formatDate(article.published_at)}
              </span>
              <span className="flex items-center gap-1 text-xs text-[#FF6600] font-['Manrope'] font-bold" data-testid="article-views">
                <Eye className="w-3 h-3" />
                {article.views ?? 0} vue{(article.views ?? 0) !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Title */}
            <h1 className="font-['Oswald'] text-4xl md:text-5xl font-bold uppercase tracking-tighter text-black leading-tight mb-8">
              {article.title}
            </h1>

            {/* Cover image */}
            {article.image_url && (
              <div className="mb-8 overflow-hidden rounded-lg">
                <img
                  src={article.image_url}
                  alt={article.title}
                  data-testid="article-image"
                  loading="lazy"
                  className="w-full object-cover max-h-[480px]"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </div>
            )}

            <div className="h-0.5 w-12 bg-[#FF6600] mb-8" />

            {/* Content — HTML (Quill) or legacy [img:url] */}
            {isHtmlContent(article.content) ? (
              <div
                className="article-content"
                data-testid="article-content"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            ) : (
              <div className="font-['Manrope'] text-lg text-zinc-800 leading-relaxed" data-testid="article-content">
                {renderContent(article.content)}
              </div>
            )}
          </article>
        )}
      </main>

      <footer className="bg-black text-zinc-400 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-['Oswald'] text-white font-bold tracking-widest uppercase">Matrix News</span>
          <p className="font-['Manrope'] text-xs">&copy; {new Date().getFullYear()} — Tous droits réservés</p>
        </div>
      </footer>
    </div>
  );
}

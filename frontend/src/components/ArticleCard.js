import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, Eye, ArrowRight, Tag, Bookmark } from "lucide-react";
import { stripToPlainText } from "../lib/contentRenderer";
import { getCategoryColor, slugify } from "../lib/categories";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { toast } from "sonner";

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function ArticleCard({ article, featured = false }) {
  const { token } = useAuth();
  const catColor = getCategoryColor(article.category);
  const excerpt = stripToPlainText(article.content);
  const [isSaved, setIsSaved] = useState(false);
  const [savingLoading, setSavingLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get(`/saved-articles/${article.id}/status`)
      .then((r) => setIsSaved(r.data.is_saved))
      .catch(() => {});
  }, [article.id, token]);

  const toggleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) { toast.error("Connectez-vous pour sauvegarder."); return; }
    setSavingLoading(true);
    try {
      if (isSaved) {
        await api.delete(`/saved-articles/${article.id}`);
        setIsSaved(false);
        toast.success("Sauvegarde retirée.");
      } else {
        await api.post(`/saved-articles/${article.id}`);
        setIsSaved(true);
        toast.success("Article sauvegardé !");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur.");
    } finally {
      setSavingLoading(false);
    }
  };

  return (
    <article
      data-testid={`article-card-${article.id}`}
      className={`group bg-white border border-zinc-200 hover:border-zinc-400 hover:shadow-md transition-all duration-300 flex flex-col relative ${featured ? "md:flex-row" : ""}`}
    >
      {/* Bookmark button */}
      {token && (
        <button
          onClick={toggleSave}
          disabled={savingLoading}
          data-testid={`save-btn-${article.id}`}
          title={isSaved ? "Retirer des sauvegardes" : "Sauvegarder"}
          className={`absolute top-2 sm:top-3 right-2 sm:right-3 z-10 p-1 sm:p-1.5 rounded-full transition-all duration-200 ${
            isSaved
              ? "bg-[#FF6600] text-white shadow-md"
              : "bg-black/60 text-white hover:bg-[#FF6600]"
          }`}
        >
          <Bookmark className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-all ${isSaved ? "fill-white" : ""}`} />
        </button>
      )}

      {/* Image */}
      {article.image_url && (
        <div className={`overflow-hidden flex-shrink-0 ${featured ? "md:w-2/5 h-44 sm:h-56 md:h-auto" : "h-36 sm:h-48"}`}>
          <img
            src={article.image_url}
            alt={article.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { e.target.parentElement.style.display = "none"; }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 sm:p-5 md:p-6">
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
          <Link
            to={`/categorie/${slugify(article.category)}`}
            onClick={(e) => e.stopPropagation()}
            data-testid={`article-category-${article.id}`}
            className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest font-['Manrope'] ${catColor.bg} ${catColor.text} hover:opacity-80 transition-opacity`}
          >
            <Tag className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
            {article.category}
          </Link>
          <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-['Manrope'] text-zinc-400">
            <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            {formatDate(article.published_at)}
          </span>
        </div>

        <Link to={`/article/${article.id}`}>
          <h2 className={`font-['Oswald'] font-bold uppercase tracking-tight text-black group-hover:text-[#FF6600] transition-colors duration-200 leading-tight mb-2 sm:mb-3 ${featured ? "text-xl sm:text-2xl md:text-3xl" : "text-lg sm:text-xl"}`}>
            {article.title}
          </h2>
        </Link>

        <p className="font-['Manrope'] text-zinc-500 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4 flex-1 line-clamp-3">
          {excerpt}
        </p>

        <div className="flex items-center justify-between mt-auto pt-2 sm:pt-3 border-t border-zinc-100">
          <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-['Manrope'] font-semibold uppercase tracking-wider text-[#FF6600]" data-testid={`views-${article.id}`}>
            <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            {article.views ?? 0} vue{(article.views ?? 0) !== 1 ? "s" : ""}
          </span>
          <Link
            to={`/article/${article.id}`}
            data-testid={`read-more-${article.id}`}
            className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold font-['Manrope'] uppercase tracking-wider text-black hover:text-[#FF6600] transition-colors duration-200 group/btn"
          >
            Lire plus
            <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover/btn:translate-x-0.5 transition-transform duration-200" />
          </Link>
        </div>
      </div>
    </article>
  );
}

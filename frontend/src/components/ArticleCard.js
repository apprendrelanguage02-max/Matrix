import { Link } from "react-router-dom";
import { Calendar, Eye, ArrowRight, Tag } from "lucide-react";
import { stripImageTags } from "../lib/contentRenderer";
import { getCategoryColor, slugify } from "../lib/categories";

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function ArticleCard({ article, featured = false }) {
  const catColor = getCategoryColor(article.category);
  const excerpt = stripImageTags(article.content);

  return (
    <article
      data-testid={`article-card-${article.id}`}
      className={`group bg-white border border-zinc-200 hover:border-zinc-400 hover:shadow-md transition-all duration-300 flex flex-col ${featured ? "md:flex-row" : ""}`}
    >
      {/* Image */}
      {article.image_url && (
        <div className={`overflow-hidden flex-shrink-0 ${featured ? "md:w-2/5 h-56 md:h-auto" : "h-48"}`}>
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
      <div className="flex flex-col flex-1 p-5 md:p-6">
        {/* Category badge + date row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <Link
            to={`/categorie/${slugify(article.category)}`}
            onClick={(e) => e.stopPropagation()}
            data-testid={`article-category-${article.id}`}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest font-['Manrope'] ${catColor.bg} ${catColor.text} hover:opacity-80 transition-opacity`}
          >
            <Tag className="w-2.5 h-2.5" />
            {article.category}
          </Link>
          <span className="flex items-center gap-1 text-[11px] font-['Manrope'] text-zinc-400">
            <Calendar className="w-3 h-3" />
            {formatDate(article.published_at)}
          </span>
        </div>

        {/* Title */}
        <Link to={`/article/${article.id}`}>
          <h2 className={`font-['Oswald'] font-bold uppercase tracking-tight text-black group-hover:text-[#FF6600] transition-colors duration-200 leading-tight mb-3 ${featured ? "text-2xl md:text-3xl" : "text-xl"}`}>
            {article.title}
          </h2>
        </Link>

        {/* Excerpt */}
        <p className="font-['Manrope'] text-zinc-500 text-sm leading-relaxed mb-4 flex-1 line-clamp-3">
          {excerpt}
        </p>

        {/* Footer: views + lire plus */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-zinc-100">
          <span className="flex items-center gap-1 text-[11px] font-['Manrope'] font-semibold uppercase tracking-wider text-[#FF6600]" data-testid={`views-${article.id}`}>
            <Eye className="w-3 h-3" />
            {article.views ?? 0} vue{(article.views ?? 0) !== 1 ? "s" : ""}
          </span>
          <Link
            to={`/article/${article.id}`}
            data-testid={`read-more-${article.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold font-['Manrope'] uppercase tracking-wider text-black hover:text-[#FF6600] transition-colors duration-200 group/btn"
          >
            Lire plus
            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform duration-200" />
          </Link>
        </div>
      </div>
    </article>
  );
}

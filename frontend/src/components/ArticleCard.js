import { Link } from "react-router-dom";
import { Calendar, User, Eye } from "lucide-react";
import { stripImageTags } from "../lib/contentRenderer";

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function ArticleCard({ article }) {
  return (
    <article
      data-testid={`article-card-${article.id}`}
      className="group border-b border-zinc-200 pb-8 last:border-0"
    >
      <Link to={`/article/${article.id}`} className="block">
        {article.image_url && (
          <div className="overflow-hidden mb-4 aspect-video">
            <img
              src={article.image_url}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          </div>
        )}
        <h2 className="font-['Oswald'] text-2xl md:text-3xl font-bold uppercase tracking-tight text-black group-hover:text-[#FF6600] transition-colors duration-200 leading-tight mb-3">
          {article.title}
        </h2>
        <p className="font-['Manrope'] text-zinc-600 text-base leading-relaxed mb-4 line-clamp-3">
          {stripImageTags(article.content)}
        </p>
        <div className="flex items-center gap-4 text-xs font-['Manrope'] font-semibold uppercase tracking-wider text-zinc-400">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {article.author_username}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(article.published_at)}
          </span>
          <span className="flex items-center gap-1 text-[#FF6600]" data-testid={`views-${article.id}`}>
            <Eye className="w-3 h-3" />
            {article.views ?? 0} vue{(article.views ?? 0) !== 1 ? "s" : ""}
          </span>
        </div>
      </Link>
    </article>
  );
}

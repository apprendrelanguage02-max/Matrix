import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import Header from "../components/Header";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useWebSocket } from "../context/WebSocketContext";
import { isHtmlContent, renderContent } from "../lib/contentRenderer";
import { getCategoryColor, slugify } from "../lib/categories";
import { Loader2, ArrowLeft, Calendar, User, Eye, Tag, Bookmark, AlertTriangle, Info, CheckCircle } from "lucide-react";
import LikeButton from "../components/LikeButton";
import { toast } from "sonner";

// ─── Block Renderers for structured content ────────────────────────────────
function BlockRenderer({ blocks }) {
  if (!blocks || !blocks.length) return null;
  return (
    <div className="space-y-6" data-testid="article-blocks">
      {blocks.map((block, i) => (
        <RenderBlock key={block.id || i} block={block} />
      ))}
    </div>
  );
}

function RenderBlock({ block }) {
  const { type, data } = block;
  switch (type) {
    case "text":
      return data?.content ? (
        <div
          className="prose prose-lg max-w-none prose-zinc prose-headings:font-['Oswald'] prose-headings:uppercase prose-a:text-[#FF6600] prose-a:no-underline hover:prose-a:underline"
          data-testid="block-text"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.content) }}
        />
      ) : null;
    case "image":
      return data?.url ? (
        <figure className="my-4" data-testid="block-image">
          <div className="overflow-hidden rounded-lg">
            <img
              src={data.url}
              alt={data.alt || data.caption || ""}
              loading="lazy"
              className="w-full object-cover max-h-[520px]"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          </div>
          {data.caption && (
            <figcaption className="mt-2 text-center text-sm text-zinc-500 italic font-['Manrope']">
              {data.caption}
            </figcaption>
          )}
        </figure>
      ) : null;
    case "video": {
      const getEmbedUrl = (url) => {
        if (!url) return "";
        const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
        if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
        return url;
      };
      return data?.url ? (
        <div className="my-4" data-testid="block-video">
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            <iframe
              src={getEmbedUrl(data.url)}
              className="w-full h-full"
              frameBorder="0"
              allowFullScreen
              title="Video"
            />
          </div>
          {data.caption && (
            <p className="mt-2 text-center text-sm text-zinc-500 italic font-['Manrope']">
              {data.caption}
            </p>
          )}
        </div>
      ) : null;
    }
    case "quote":
      return data?.text ? (
        <blockquote className="border-l-4 border-[#FF6600] bg-orange-50/50 px-6 py-4 my-4 rounded-r-lg" data-testid="block-quote">
          <p className="text-lg font-['Georgia'] italic text-zinc-700 leading-relaxed">
            {data.text}
          </p>
          {data.author && (
            <footer className="mt-2 text-sm font-bold text-orange-700 font-['Manrope']">
              — {data.author}
            </footer>
          )}
        </blockquote>
      ) : null;
    case "alert": {
      const alertStyles = {
        info: { border: "border-blue-400", bg: "bg-blue-50", text: "text-blue-800", Icon: Info },
        warning: { border: "border-yellow-400", bg: "bg-yellow-50", text: "text-yellow-800", Icon: AlertTriangle },
        success: { border: "border-green-400", bg: "bg-green-50", text: "text-green-800", Icon: CheckCircle },
      };
      const style = alertStyles[data?.type] || alertStyles.info;
      return data?.content ? (
        <div className={`border-l-4 ${style.border} ${style.bg} px-5 py-4 my-4 rounded-r-lg flex items-start gap-3`} data-testid="block-alert">
          <style.Icon className={`w-5 h-5 ${style.text} flex-shrink-0 mt-0.5`} />
          <p className={`text-sm ${style.text} leading-relaxed font-['Manrope']`}>{data.content}</p>
        </div>
      ) : null;
    }
    case "table":
      return (data?.headers?.length) ? (
        <div className="my-4 overflow-x-auto border border-zinc-200 rounded-lg" data-testid="block-table">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                {data.headers.map((h, i) => (
                  <th key={`header-${h}-${i}`} className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-zinc-600 border-r border-zinc-200 last:border-r-0">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.rows || []).map((row, ri) => (
                <tr key={`row-${ri}`} className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/50">
                  {row.map((cell, ci) => (
                    <td key={`cell-${ri}-${ci}`} className="px-4 py-2.5 text-zinc-700 border-r border-zinc-100 last:border-r-0">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null;
    default:
      return null;
  }
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function ArticleDetailPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const ws = useWebSocket();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [viewCount, setViewCount] = useState(0);

  // Listen for real-time view updates
  useEffect(() => {
    if (!ws || !id) return;
    const handler = (data) => {
      if (data.type === "view_update" && data.content_type === "article" && data.id === id) {
        setViewCount(data.views);
      }
    };
    return ws.subscribe(handler);
  }, [ws, id]);

  useEffect(() => {
    api.get(`/articles/${id}`)
      .then((r) => {
        setArticle(r.data);
        setViewCount(r.data.views || 0);
        if (isAuthenticated) {
          api.get(`/saved-articles/${id}/status`).then((res) => setIsSaved(res.data.is_saved)).catch(() => {});
        }
      })
      .catch(() => setError("Article introuvable."))
      .finally(() => setLoading(false));
  }, [id, isAuthenticated]);

  const toggleSave = async () => {
    if (!isAuthenticated) { toast.error("Connectez-vous pour sauvegarder."); return; }
    setSaveLoading(true);
    try {
      if (isSaved) {
        await api.delete(`/saved-articles/${id}`);
        setIsSaved(false);
        toast.success("Sauvegarde retirée.");
      } else {
        await api.post(`/saved-articles/${id}`);
        setIsSaved(true);
        toast.success("Article sauvegardé !");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur.");
    } finally {
      setSaveLoading(false);
    }
  };

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
        </Link>

        {loading && (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
          </div>
        )}

        {error && (
          <div className="text-center py-24" data-testid="article-error">
            <p className="font-['Oswald'] text-3xl uppercase text-zinc-300">{error}</p>
            <Link to="/" className="mt-4 inline-block text-[#FF6600] font-bold underline">&larr;</Link>
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
                {viewCount} <span className="whitespace-nowrap">vue{viewCount !== 1 ? "s" : ""}</span>
              </span>
              <LikeButton
                type="article"
                id={article.id}
                initialCount={article.likes_count || 0}
                initialLikedBy={article.liked_by || []}
                className="text-sm"
              />
              {isAuthenticated && (
                <button
                  onClick={toggleSave}
                  disabled={saveLoading}
                  data-testid="detail-save-btn"
                  className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold font-['Manrope'] uppercase tracking-wider transition-all duration-200 border ${
                    isSaved
                      ? "bg-[#FF6600] border-[#FF6600] text-white"
                      : "border-zinc-300 text-zinc-600 hover:border-[#FF6600] hover:text-[#FF6600]"
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-white" : ""}`} />
                  {isSaved ? "Sauvegardé" : "Sauvegarder"}
                </button>
              )}
            </div>

            {/* Title */}
            <h1 className="font-['Oswald'] text-4xl md:text-5xl font-bold uppercase tracking-tighter text-black leading-tight mb-4">
              {article.title}
            </h1>

            {/* Subtitle */}
            {article.subtitle && (
              <p className="text-lg md:text-xl text-zinc-500 font-['Manrope'] leading-relaxed mb-8" data-testid="article-subtitle">
                {article.subtitle}
              </p>
            )}

            {!article.subtitle && <div className="mb-8" />}

            {/* Cover image */}
            {article.image_url && (
              <div className="mb-8 overflow-hidden rounded-lg">
                <img
                  src={article.image_url}
                  alt={article.image_alt || article.title}
                  data-testid="article-image"
                  loading="lazy"
                  className="w-full object-cover max-h-[480px]"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </div>
            )}

            <div className="h-0.5 w-12 bg-[#FF6600] mb-8" />

            {/* Content — Blocks (new editor) or HTML (legacy Quill) or [img:url] */}
            {article.blocks && article.blocks.length > 0 ? (
              <div className="font-['Manrope'] text-lg text-zinc-800 leading-relaxed" data-testid="article-content">
                <BlockRenderer blocks={article.blocks} />
              </div>
            ) : isHtmlContent(article.content) ? (
              <div
                className="article-content"
                data-testid="article-content"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}
              />
            ) : (
              <div className="font-['Manrope'] text-lg text-zinc-800 leading-relaxed" data-testid="article-content">
                {renderContent(article.content)}
              </div>
            )}

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-zinc-100" data-testid="article-tags">
                {article.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-100 text-xs font-bold text-zinc-600 font-['Manrope'] rounded">
                    <Tag className="w-2.5 h-2.5" /> {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Reading time */}
            {article.reading_time > 0 && (
              <p className="mt-4 text-xs text-zinc-400 font-['Manrope']" data-testid="article-reading-time">
                Temps de lecture : {article.reading_time} min
              </p>
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

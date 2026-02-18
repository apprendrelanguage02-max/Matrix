import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/layout/Footer";
import ArticleCard from "../components/ArticleCard";
import api from "../lib/api";
import { Loader2, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import { CATEGORIES, getCategoryColor } from "../lib/categories";

const PAGE_SIZE = 10;
const LOGO = "https://customer-assets.emergentagent.com/job_2b66c898-0ce0-4fc9-a685-24a9ac754e60/artifacts/p7stxwf9_ChatGPT%20Image%20Feb%2017%2C%202026%2C%2005_57_11%20PM.png";

export default function CategoryPage() {
  const { slug } = useParams();
  const decodedSlug = decodeURIComponent(slug);
  
  // Trouver la catégorie correspondante (insensible aux accents/casse)
  const category = CATEGORIES.find(cat => 
    cat.toLowerCase() === decodedSlug.toLowerCase() ||
    cat.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === decodedSlug.toLowerCase()
  ) || decodedSlug;
  
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const catColor = getCategoryColor(category);

  useEffect(() => {
    if (!CATEGORIES.includes(category)) {
      setError("Catégorie introuvable.");
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get("/articles", { params: { category, page, limit: PAGE_SIZE } })
      .then((r) => {
        setArticles(r.data.articles);
        setTotal(r.data.total);
        setPages(r.data.pages);
      })
      .catch(() => setError("Impossible de charger les articles."))
      .finally(() => setLoading(false));
  }, [category, page]);

  const goToPage = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white font-['Manrope']">
      <Header />

      {/* Hero catégorie avec logo */}
      <section className="bg-black py-8 sm:py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Logo Nimba */}
            <img
              src={LOGO}
              alt="Matrix News"
              className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 object-contain flex-shrink-0"
            />
            <div className="flex items-start gap-2 sm:gap-4">
              <div className="w-1 sm:w-1.5 h-12 sm:h-16 bg-[#FF6600] flex-shrink-0 mt-1" />
              <div>
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest font-['Manrope'] ${catColor.bg} ${catColor.text}`}>
                    <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    {category}
                  </span>
                </div>
                <p className="font-['Manrope'] text-[#FF6600] text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 sm:mb-2">
                  {!loading && `${total} article${total !== 1 ? "s" : ""}`}
                </p>
                <h1 className="font-['Oswald'] text-2xl sm:text-4xl md:text-6xl font-bold uppercase tracking-tighter text-white leading-none">
                  {category}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="h-1 sm:h-1.5 bg-[#FF6600]" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        {/* Back */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-500 hover:text-[#FF6600] transition-colors duration-200 mb-6 sm:mb-8"
        >
          ← Toutes les catégories
        </Link>

        {loading && (
          <div className="flex justify-center py-16 sm:py-24">
            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-[#FF6600]" />
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-16 sm:py-24">
            <p className="font-['Oswald'] text-2xl sm:text-3xl uppercase text-zinc-300">{error}</p>
            <Link to="/" className="mt-4 inline-block text-[#FF6600] font-bold hover:underline text-sm sm:text-base">Retour à l'accueil</Link>
          </div>
        )}

        {!loading && !error && articles.length === 0 && (
          <div className="text-center py-16 sm:py-24" data-testid="empty-category">
            <p className="font-['Oswald'] text-2xl sm:text-3xl uppercase text-zinc-300">Aucun article</p>
            <p className="font-['Manrope'] text-zinc-500 mt-2 text-xs sm:text-sm">Aucun article dans cette catégorie pour l'instant.</p>
            <Link to="/" className="mt-4 inline-block text-[#FF6600] font-bold hover:underline text-sm sm:text-base">Retour à l'accueil</Link>
          </div>
        )}

        {!loading && !error && articles.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10" data-testid="category-articles-list">
              {articles.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>

            {pages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-zinc-200">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold border border-zinc-300 hover:border-black hover:bg-black hover:text-white transition-all disabled:opacity-30"
                >
                  <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Précédent</span>
                </button>
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm font-bold border transition-all ${
                      p === page ? "bg-[#FF6600] border-[#FF6600] text-white" : "border-zinc-300 hover:border-black hover:bg-black hover:text-white"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= pages}
                  className="flex items-center gap-1 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold border border-zinc-300 hover:border-black hover:bg-black hover:text-white transition-all disabled:opacity-30"
                >
                  <span className="hidden sm:inline">Suivant</span> <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

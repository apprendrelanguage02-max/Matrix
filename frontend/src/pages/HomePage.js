import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/layout/Footer";
import ArticleCard from "../components/ArticleCard";
import api from "../lib/api";
import { Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 10;

export default function HomePage() {
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1", 10);

  const fetchArticles = useCallback((pageNum, q) => {
    setLoading(true);
    setError(null);
    const params = { page: pageNum, limit: PAGE_SIZE };
    if (q && q.trim()) params.search = q.trim();
    api.get("/articles", { params })
      .then((r) => {
        setArticles(r.data.articles);
        setTotal(r.data.total);
        setPages(r.data.pages);
      })
      .catch(() => setError("Impossible de charger les articles."))
      .finally(() => setLoading(false));
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams(search.trim() ? { search: search, page: "1" } : {});
      fetchArticles(1, search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]); // eslint-disable-line

  // Fetch on page change (without search change)
  useEffect(() => {
    fetchArticles(page, search);
  }, [page]); // eslint-disable-line

  const goToPage = (p) => {
    const params = {};
    if (search.trim()) params.search = search;
    params.page = String(p);
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const featuredArticle = !search.trim() && page === 1 ? articles[0] : null;
  const gridArticles = featuredArticle ? articles.slice(1) : articles;

  return (
    <div className="min-h-screen bg-white font-['Manrope']">
      <Header onSearch={setSearch} searchValue={search} />

      {/* Hero */}
      <section className="bg-black py-8 sm:py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 sm:gap-6">
            <img
              src="https://customer-assets.emergentagent.com/job_2b66c898-0ce0-4fc9-a685-24a9ac754e60/artifacts/p7stxwf9_ChatGPT%20Image%20Feb%2017%2C%202026%2C%2005_57_11%20PM.png"
              alt="Matrix News"
              className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 object-contain flex-shrink-0"
            />
            <div className="flex items-start gap-2 sm:gap-4">
              <div className="w-1 sm:w-1.5 h-12 sm:h-16 bg-[#FF6600] flex-shrink-0 mt-1" />
              <div>
                <p className="font-['Manrope'] text-[#FF6600] text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 sm:mb-2">
                  {total > 0 ? `${total} article${total > 1 ? "s" : ""} publiés` : "Actualités"}
                </p>
                <h1 className="font-['Oswald'] text-2xl sm:text-4xl md:text-6xl font-bold uppercase tracking-tighter text-white leading-none">
                  Les dernières<br />
                  <span className="text-[#FF6600]">nouvelles</span>
                </h1>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="h-1 sm:h-1.5 bg-[#FF6600]" />

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">

        {/* Search info */}
        {search.trim() && !loading && (
          <div className="flex items-center gap-2 mb-6 sm:mb-8 pb-3 sm:pb-4 border-b border-zinc-200" data-testid="search-results-info">
            <Search className="w-4 h-4 text-[#FF6600]" />
            <span className="font-['Manrope'] text-xs sm:text-sm text-zinc-500">
              <span className="font-bold text-black">{total}</span> résultat{total !== 1 ? "s" : ""} pour «{" "}
              <span className="text-[#FF6600]">{search}</span> »
            </span>
          </div>
        )}

        {/* Loader */}
        {loading && (
          <div className="flex justify-center py-24" data-testid="loading-spinner">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <p className="text-center text-red-600 py-24" data-testid="error-message">{error}</p>
        )}

        {/* Empty */}
        {!loading && !error && articles.length === 0 && (
          <div className="text-center py-24" data-testid="empty-state">
            <p className="font-['Oswald'] text-3xl uppercase text-zinc-300">
              {search.trim() ? "Aucun résultat" : "Aucun article publié"}
            </p>
            <p className="font-['Manrope'] text-zinc-500 mt-2 text-sm">
              {search.trim() ? "Essayez avec d'autres mots-clés." : "Revenez bientôt pour les dernières actualités."}
            </p>
          </div>
        )}

        {/* Articles */}
        {!loading && !error && articles.length > 0 && (
          <div data-testid="articles-list">
            {/* Featured */}
            {featuredArticle && (
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-5">
                  <span className="h-0.5 w-8 bg-[#FF6600]" />
                  <span className="font-['Manrope'] text-xs font-bold uppercase tracking-widest text-[#FF6600]">À la une</span>
                </div>
                <ArticleCard article={featuredArticle} featured />
              </div>
            )}

            {/* Grid */}
            {gridArticles.length > 0 && (
              <div>
                {featuredArticle && (
                  <div className="flex items-center gap-3 mb-6">
                    <span className="h-0.5 w-8 bg-zinc-300" />
                    <span className="font-['Manrope'] text-xs font-bold uppercase tracking-widest text-zinc-400">Toutes les nouvelles</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {gridArticles.map((a) => (
                    <ArticleCard key={a.id} article={a} />
                  ))}
                </div>
              </div>
            )}

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12 pt-8 border-t border-zinc-200" data-testid="pagination">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  data-testid="prev-page"
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold font-['Manrope'] uppercase tracking-wider border border-zinc-300 hover:border-black hover:bg-black hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Précédent
                </button>

                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    data-testid={`page-${p}`}
                    className={`w-10 h-10 text-sm font-bold font-['Manrope'] border transition-all ${
                      p === page
                        ? "bg-[#FF6600] border-[#FF6600] text-white"
                        : "border-zinc-300 hover:border-black hover:bg-black hover:text-white"
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= pages}
                  data-testid="next-page"
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold font-['Manrope'] uppercase tracking-wider border border-zinc-300 hover:border-black hover:bg-black hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Suivant
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

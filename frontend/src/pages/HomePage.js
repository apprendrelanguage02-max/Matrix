import { useEffect, useState } from "react";
import Header from "../components/Header";
import ArticleCard from "../components/ArticleCard";
import api from "../lib/api";
import { Loader2, Search } from "lucide-react";

export default function HomePage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/articles")
      .then((r) => setArticles(r.data))
      .catch(() => setError("Impossible de charger les articles."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? articles.filter(
        (a) =>
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.content.toLowerCase().includes(search.toLowerCase())
      )
    : articles;

  return (
    <div className="min-h-screen bg-white font-['Manrope']">
      <Header onSearch={setSearch} searchValue={search} />

      {/* Hero */}
      <section className="bg-black py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-4">
            <div className="w-1.5 h-20 bg-[#FF6600] flex-shrink-0 mt-1" />
            <div>
              <p className="font-['Manrope'] text-[#FF6600] text-sm font-bold uppercase tracking-widest mb-2">
                Actualités
              </p>
              <h1 className="font-['Oswald'] text-5xl md:text-7xl font-bold uppercase tracking-tighter text-white leading-none">
                Les dernières<br />
                <span className="text-[#FF6600]">nouvelles</span>
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* Orange accent bar */}
      <div className="h-1.5 bg-[#FF6600]" />

      {/* Articles */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {loading && (
          <div className="flex justify-center py-24" data-testid="loading-spinner">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
          </div>
        )}
        {error && (
          <p className="text-center text-red-600 py-24 font-['Manrope']" data-testid="error-message">
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            {/* Search result info */}
            {search.trim() && (
              <div className="flex items-center gap-2 mb-8 pb-4 border-b border-zinc-200" data-testid="search-results-info">
                <Search className="w-4 h-4 text-[#FF6600]" />
                <span className="font-['Manrope'] text-sm text-zinc-500">
                  <span className="font-bold text-black">{filtered.length}</span> résultat{filtered.length !== 1 ? "s" : ""} pour «{" "}
                  <span className="text-[#FF6600]">{search}</span> »
                </span>
              </div>
            )}

            {filtered.length === 0 && (
              <div className="text-center py-24" data-testid="empty-state">
                <p className="font-['Oswald'] text-3xl uppercase text-zinc-300">
                  {search.trim() ? "Aucun résultat" : "Aucun article publié"}
                </p>
                <p className="font-['Manrope'] text-zinc-500 mt-2">
                  {search.trim()
                    ? "Essayez avec d'autres mots-clés."
                    : "Revenez bientôt pour les dernières actualités."}
                </p>
              </div>
            )}

            {filtered.length > 0 && (
              <div data-testid="articles-list" className="space-y-10">
                {/* Featured first article (only when no search) */}
                {!search.trim() && filtered[0] && (
                  <div className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="h-0.5 w-8 bg-[#FF6600]" />
                      <span className="font-['Manrope'] text-xs font-bold uppercase tracking-widest text-[#FF6600]">
                        À la une
                      </span>
                    </div>
                    <ArticleCard article={filtered[0]} />
                  </div>
                )}

                {/* Rest */}
                {(search.trim() ? filtered : filtered.slice(1)).length > 0 && (
                  <div>
                    {!search.trim() && (
                      <div className="flex items-center gap-3 mb-8">
                        <span className="h-0.5 w-8 bg-zinc-300" />
                        <span className="font-['Manrope'] text-xs font-bold uppercase tracking-widest text-zinc-400">
                          Toutes les nouvelles
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      {(search.trim() ? filtered : filtered.slice(1)).map((a) => (
                        <ArticleCard key={a.id} article={a} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black text-zinc-400 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-['Oswald'] text-white font-bold tracking-widest uppercase">Matrix News</span>
          <p className="font-['Manrope'] text-xs">
            &copy; {new Date().getFullYear()} — Tous droits réservés
          </p>
        </div>
      </footer>
    </div>
  );
}

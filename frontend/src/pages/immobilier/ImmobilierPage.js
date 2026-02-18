import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/layout/Footer";
import PropertyCard from "../../components/immobilier/PropertyCard";
import PropertyFilters from "../../components/immobilier/PropertyFilters";
import api from "../../lib/api";
import { Loader2, ChevronLeft, ChevronRight, PlusCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function ImmobilierPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    type: searchParams.get("type") || "",
    city: searchParams.get("city") || "",
    status: searchParams.get("status") || "disponible",
    price_min: "",
    price_max: "",
    sort: "recent",
    page: parseInt(searchParams.get("page") || "1", 10),
  });

  const fetchProperties = useCallback((f) => {
    setLoading(true);
    setError(null);
    const params = { page: f.page, limit: 12, status: f.status, sort: f.sort };
    if (f.type) params.type = f.type;
    if (f.city) params.city = f.city;
    if (f.price_min) params.price_min = f.price_min;
    if (f.price_max) params.price_max = f.price_max;
    api.get("/properties", { params })
      .then(r => {
        setProperties(r.data.properties);
        setTotal(r.data.total);
        setPages(r.data.pages);
      })
      .catch(() => setError("Impossible de charger les annonces."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchProperties(filters); }, [filters]); // eslint-disable-line

  const handleFilters = (newF) => {
    setFilters(newF);
    const p = {};
    if (newF.type) p.type = newF.type;
    if (newF.city) p.city = newF.city;
    if (newF.page > 1) p.page = String(newF.page);
    setSearchParams(p);
  };

  const goToPage = (p) => handleFilters({ ...filters, page: p });

  const canPublish = user?.role === "agent" || user?.role === "auteur";

  return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />

      {/* Hero */}
      <section className="bg-black py-8 sm:py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-1 sm:w-1.5 h-12 sm:h-16 bg-[#FF6600] flex-shrink-0" />
            <div>
              <p className="text-[#FF6600] text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 sm:mb-2">
                {total > 0 ? `${total} annonce${total > 1 ? "s" : ""} disponibles` : "Immobilier GIMO"}
              </p>
              <h1 className="font-['Oswald'] text-2xl sm:text-3xl md:text-5xl font-bold uppercase tracking-tighter text-white leading-none">
                Immobilier<br />
                <span className="text-[#FF6600]">Guinée</span>
              </h1>
            </div>
          </div>
        </div>
      </section>
      <div className="h-1 sm:h-1.5 bg-[#FF6600]" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Action bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <p className="text-xs sm:text-sm text-zinc-500">
            {!loading && <span><strong className="text-black">{total}</strong> annonce{total !== 1 ? "s" : ""}</span>}
          </p>
          {canPublish && (
            <Link to="/immobilier/publier"
              className="flex items-center gap-2 bg-[#FF6600] text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider px-3 sm:px-4 py-2 hover:bg-[#CC5200] transition-colors">
              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Publier une annonce
            </Link>
          )}
        </div>

        <PropertyFilters filters={filters} onChange={handleFilters} />

        {loading && <div className="flex justify-center py-16 sm:py-24"><Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-[#FF6600]" /></div>}
        {error && !loading && <p className="text-center text-red-600 py-16 sm:py-24 text-sm sm:text-base">{error}</p>}
        {!loading && !error && properties.length === 0 && (
          <div className="text-center py-16 sm:py-24">
            <p className="font-['Oswald'] text-2xl sm:text-3xl uppercase text-zinc-300">Aucune annonce</p>
            <p className="text-zinc-500 mt-2 text-xs sm:text-sm">Essayez de modifier vos filtres.</p>
          </div>
        )}

        {!loading && !error && properties.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {properties.map(p => <PropertyCard key={p.id} property={p} />)}
          </div>
        )}

        {pages > 1 && !loading && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-zinc-200">
            <button onClick={() => goToPage(filters.page - 1)} disabled={filters.page <= 1}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold uppercase border border-zinc-300 hover:border-black hover:bg-black hover:text-white transition-all disabled:opacity-30">
              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Précédent</span>
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => goToPage(p)}
                className={`w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm font-bold border transition-all ${
                  p === filters.page ? "bg-[#FF6600] border-[#FF6600] text-white" : "border-zinc-300 hover:border-black hover:bg-black hover:text-white"
                }`}>{p}</button>
            ))}
            <button onClick={() => goToPage(filters.page + 1)} disabled={filters.page >= pages}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold uppercase border border-zinc-300 hover:border-black hover:bg-black hover:text-white transition-all disabled:opacity-30">
              <span className="hidden sm:inline">Suivant</span> <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

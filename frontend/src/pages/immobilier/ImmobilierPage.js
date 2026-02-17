import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "../../components/Header";
import PropertyCard from "../../components/immobilier/PropertyCard";
import PropertyFilters from "../../components/immobilier/PropertyFilters";
import api from "../../lib/api";
import { Loader2, ChevronLeft, ChevronRight, PlusCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const LOGO = "https://customer-assets.emergentagent.com/job_2b66c898-0ce0-4fc9-a685-24a9ac754e60/artifacts/p7stxwf9_ChatGPT%20Image%20Feb%2017%2C%202026%2C%2005_57_11%20PM.png";

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
      <section className="bg-black py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <img src={LOGO} alt="GIMO" className="w-20 h-20 md:w-28 md:h-28 object-contain flex-shrink-0" />
            <div className="flex items-start gap-4">
              <div className="w-1.5 h-14 bg-[#FF6600] flex-shrink-0 mt-1" />
              <div>
                <p className="text-[#FF6600] text-xs font-bold uppercase tracking-widest mb-2">
                  {total > 0 ? `${total} annonce${total > 1 ? "s" : ""} disponibles` : "Immobilier GIMO"}
                </p>
                <h1 className="font-['Oswald'] text-3xl md:text-5xl font-bold uppercase tracking-tighter text-white leading-none">
                  Immobilier<br />
                  <span className="text-[#FF6600]">Guinée</span>
                </h1>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="h-1.5 bg-[#FF6600]" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Action bar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-zinc-500">
            {!loading && <span><strong className="text-black">{total}</strong> annonce{total !== 1 ? "s" : ""}</span>}
          </p>
          {canPublish && (
            <Link to="/immobilier/publier"
              className="flex items-center gap-2 bg-[#FF6600] text-white text-xs font-bold uppercase tracking-wider px-4 py-2 hover:bg-[#CC5200] transition-colors">
              <PlusCircle className="w-4 h-4" /> Publier une annonce
            </Link>
          )}
        </div>

        <PropertyFilters filters={filters} onChange={handleFilters} />

        {loading && <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" /></div>}
        {error && !loading && <p className="text-center text-red-600 py-24">{error}</p>}
        {!loading && !error && properties.length === 0 && (
          <div className="text-center py-24">
            <p className="font-['Oswald'] text-3xl uppercase text-zinc-300">Aucune annonce</p>
            <p className="text-zinc-500 mt-2 text-sm">Essayez de modifier vos filtres.</p>
          </div>
        )}

        {!loading && !error && properties.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map(p => <PropertyCard key={p.id} property={p} />)}
          </div>
        )}

        {pages > 1 && !loading && (
          <div className="flex items-center justify-center gap-2 mt-12 pt-8 border-t border-zinc-200">
            <button onClick={() => goToPage(filters.page - 1)} disabled={filters.page <= 1}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold uppercase border border-zinc-300 hover:border-black hover:bg-black hover:text-white transition-all disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" /> Précédent
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => goToPage(p)}
                className={`w-10 h-10 text-sm font-bold border transition-all ${
                  p === filters.page ? "bg-[#FF6600] border-[#FF6600] text-white" : "border-zinc-300 hover:border-black hover:bg-black hover:text-white"
                }`}>{p}</button>
            ))}
            <button onClick={() => goToPage(filters.page + 1)} disabled={filters.page >= pages}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold uppercase border border-zinc-300 hover:border-black hover:bg-black hover:text-white transition-all disabled:opacity-30">
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      <footer className="bg-black text-zinc-400 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <span className="font-['Oswald'] text-white font-bold tracking-widest uppercase">Matrix News · Immobilier GIMO</span>
          <p className="text-xs">&copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}

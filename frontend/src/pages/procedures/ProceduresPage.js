import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/layout/Footer";
import api from "../../lib/api";
import { Loader2, ChevronLeft, ChevronRight, FileText, Calendar, Eye, ArrowRight, Bookmark } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";

const LOGO = "/nimba-logo.png";

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function ProcedureCard({ procedure }) {
  const { token } = useAuth();
  const excerpt = procedure.content?.replace(/<[^>]+>/g, "").slice(0, 150) + "...";
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get(`/saved-procedures/${procedure.id}/status`).then(r => setIsSaved(r.data.is_saved)).catch(() => {});
  }, [procedure.id, token]);

  const toggleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) { toast.error("Connectez-vous pour sauvegarder."); return; }
    try {
      const res = await api.post(`/saved-procedures/${procedure.id}`);
      setIsSaved(res.data.action === "saved");
      toast.success(res.data.action === "saved" ? "Ajoute aux favoris !" : "Retire des favoris.");
    } catch { toast.error("Erreur"); }
  };
  
  return (
    <div className="bg-white border border-zinc-200 hover:border-[#FF6600] hover:shadow-lg transition-all duration-200 flex flex-col group relative">
      {/* Save/Favorite button */}
      {token && (
        <button onClick={toggleSave} data-testid={`save-procedure-${procedure.id}`}
          className={`absolute top-2 right-2 z-10 p-1.5 rounded-full transition-all duration-200 ${
            isSaved ? "bg-[#FF6600] text-white shadow-md" : "bg-black/60 text-white hover:bg-[#FF6600]"
          }`}>
          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-white" : ""}`} />
        </button>
      )}
      {/* Image */}
      {procedure.image_url ? (
        <div className="aspect-video bg-zinc-100 overflow-hidden">
          <img src={procedure.image_url} alt={procedure.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className="aspect-video bg-zinc-900 flex items-center justify-center">
          <FileText className="w-12 h-12 text-zinc-700" />
        </div>
      )}
      
      <div className="p-4 flex flex-col flex-1">
        {/* Flag & Subcategory */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{procedure.subcategory_flag}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF6600]">
            {procedure.subcategory_name}
          </span>
        </div>
        
        {/* Title */}
        <h3 className="font-['Oswald'] text-lg font-bold uppercase tracking-tight text-black group-hover:text-[#FF6600] transition-colors mb-2 line-clamp-2">
          {procedure.title}
        </h3>
        
        {/* Excerpt */}
        <p className="text-sm text-zinc-500 font-['Manrope'] line-clamp-3 mb-3 flex-1">
          {excerpt}
        </p>
        
        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-zinc-400 pt-3 border-t border-zinc-100">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(procedure.created_at)}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {procedure.views} <span className="whitespace-nowrap">vue{procedure.views !== 1 ? "s" : ""}</span>
          </span>
        </div>
        
        {/* CTA */}
        <Link
          to={`/procedures/${procedure.id}`}
          className="mt-3 flex items-center justify-center gap-2 bg-black text-white text-xs font-bold uppercase tracking-wider py-2.5 hover:bg-[#FF6600] transition-colors"
        >
          Voir la procédure
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function ProceduresPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [procedures, setProcedures] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filters, setFilters] = useState({
    subcategory: searchParams.get("pays") || "",
    search: searchParams.get("q") || "",
    page: parseInt(searchParams.get("page") || "1", 10),
  });
  
  // Fetch subcategories
  useEffect(() => {
    api.get("/procedures/subcategories")
      .then(r => setSubcategories(r.data))
      .catch(() => {});
  }, []);
  
  // Fetch procedures
  const fetchProcedures = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = { page: filters.page, limit: 12 };
    if (filters.subcategory) params.subcategory = filters.subcategory;
    if (filters.search) params.search = filters.search;
    
    api.get("/procedures", { params })
      .then(r => {
        setProcedures(r.data.procedures);
        setTotal(r.data.total);
        setPages(r.data.pages);
      })
      .catch(() => setError("Impossible de charger les procédures."))
      .finally(() => setLoading(false));
  }, [filters]);
  
  useEffect(() => { fetchProcedures(); }, [fetchProcedures]);
  
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    const p = {};
    if (newFilters.subcategory) p.pays = newFilters.subcategory;
    if (newFilters.search) p.q = newFilters.search;
    if (newFilters.page > 1) p.page = String(newFilters.page);
    setSearchParams(p);
  };
  
  const goToPage = (p) => handleFilterChange({ ...filters, page: p });
  
  const isAdmin = user?.role === "admin";
  
  return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />
      
      {/* Hero */}
      <section className="bg-black py-8 sm:py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 sm:gap-6">
            <img src={LOGO} alt="GIMO" className="w-14 h-14 sm:w-20 sm:h-20 md:w-28 md:h-28 object-contain flex-shrink-0" />
            <div className="flex items-start gap-2 sm:gap-4">
              <div className="w-1 sm:w-1.5 h-12 sm:h-16 bg-[#FF6600] flex-shrink-0 mt-1" />
              <div>
                <p className="text-[#FF6600] text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 sm:mb-2">
                  {total > 0 ? `${total} procédure${total > 1 ? "s" : ""} disponibles` : "Guide administratif"}
                </p>
                <h1 className="font-['Oswald'] text-2xl sm:text-3xl md:text-5xl font-bold uppercase tracking-tighter text-white leading-none">
                  Procédures<br />
                  <span className="text-[#FF6600]">& Démarches</span>
                </h1>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="h-1 sm:h-1.5 bg-[#FF6600]" />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Admin action */}
        {isAdmin && (
          <div className="flex justify-end mb-4">
            <Link
              to="/admin/procedures/nouvelle"
              className="flex items-center gap-2 bg-[#FF6600] text-white text-xs font-bold uppercase tracking-wider px-4 py-2 hover:bg-[#CC5200] transition-colors"
            >
              + Nouvelle procédure
            </Link>
          </div>
        )}
        
        {/* Subcategory filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => handleFilterChange({ ...filters, subcategory: "", page: 1 })}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border transition-colors ${
              !filters.subcategory
                ? "bg-[#FF6600] border-[#FF6600] text-white"
                : "border-zinc-300 text-zinc-600 hover:border-[#FF6600] hover:text-[#FF6600]"
            }`}
          >
            Tous les pays
          </button>
          {subcategories.map(sub => (
            <button
              key={sub.id}
              onClick={() => handleFilterChange({ ...filters, subcategory: sub.id, page: 1 })}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border transition-colors ${
                filters.subcategory === sub.id
                  ? "bg-[#FF6600] border-[#FF6600] text-white"
                  : "border-zinc-300 text-zinc-600 hover:border-[#FF6600] hover:text-[#FF6600]"
              }`}
            >
              <span className="text-base">{sub.flag}</span>
              {sub.name.replace("Procédures ", "")}
            </button>
          ))}
        </div>
        
        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
          </div>
        )}
        
        {/* Error */}
        {error && !loading && (
          <p className="text-center text-red-600 py-16">{error}</p>
        )}
        
        {/* Empty */}
        {!loading && !error && procedures.length === 0 && (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
            <p className="font-['Oswald'] text-2xl uppercase text-zinc-300">Aucune procédure</p>
            <p className="text-zinc-500 mt-2 text-sm">
              {filters.subcategory ? "Aucune procédure pour ce pays." : "Les procédures seront bientôt disponibles."}
            </p>
          </div>
        )}
        
        {/* Grid */}
        {!loading && !error && procedures.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {procedures.map(proc => (
              <ProcedureCard key={proc.id} procedure={proc} />
            ))}
          </div>
        )}
        
        {/* Pagination */}
        {pages > 1 && !loading && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-10 pt-8 border-t border-zinc-200">
            <button
              onClick={() => goToPage(filters.page - 1)}
              disabled={filters.page <= 1}
              className="flex items-center gap-1 px-4 py-2 text-sm font-bold uppercase border border-zinc-300 hover:border-black hover:bg-black hover:text-white transition-all disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" /> Précédent
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => goToPage(p)}
                className={`w-10 h-10 text-sm font-bold border transition-all ${
                  p === filters.page
                    ? "bg-[#FF6600] border-[#FF6600] text-white"
                    : "border-zinc-300 hover:border-black hover:bg-black hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => goToPage(filters.page + 1)}
              disabled={filters.page >= pages}
              className="flex items-center gap-1 px-4 py-2 text-sm font-bold uppercase border border-zinc-300 hover:border-black hover:bg-black hover:text-white transition-all disabled:opacity-30"
            >
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}

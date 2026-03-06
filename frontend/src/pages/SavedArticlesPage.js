import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/layout/Footer";
import ArticleCard from "../components/ArticleCard";
import PropertyCard from "../components/immobilier/PropertyCard";
import api from "../lib/api";
import { toast } from "sonner";
import { Loader2, Bookmark, ArrowLeft, FileText, Home, Newspaper, Trash2, Calendar, Eye, ArrowRight } from "lucide-react";

const TABS = [
  { key: "all", label: "Tout", icon: Bookmark },
  { key: "articles", label: "Articles", icon: Newspaper },
  { key: "properties", label: "Annonces", icon: Home },
  { key: "procedures", label: "Procedures", icon: FileText },
];

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function SavedArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [properties, setProperties] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/saved-articles").catch(() => ({ data: [] })),
      api.get("/saved-properties").catch(() => ({ data: [] })),
      api.get("/saved-procedures").catch(() => ({ data: [] })),
    ]).then(([a, p, pr]) => {
      setArticles(a.data);
      setProperties(p.data);
      setProcedures(pr.data);
    }).finally(() => setLoading(false));
  }, []);

  const unsaveArticle = async (articleId) => {
    try {
      await api.delete(`/saved-articles/${articleId}`);
      setArticles(prev => prev.filter(s => s.article_id !== articleId));
      toast.success("Retire des favoris.");
    } catch { toast.error("Erreur"); }
  };

  const unsaveProperty = async (propertyId) => {
    try {
      await api.post(`/saved-properties/${propertyId}`);
      setProperties(prev => prev.filter(s => s.property_id !== propertyId));
      toast.success("Retire des favoris.");
    } catch { toast.error("Erreur"); }
  };

  const unsaveProcedure = async (procedureId) => {
    try {
      await api.post(`/saved-procedures/${procedureId}`);
      setProcedures(prev => prev.filter(s => s.procedure_id !== procedureId));
      toast.success("Retire des favoris.");
    } catch { toast.error("Erreur"); }
  };

  const totalCount = articles.length + properties.length + procedures.length;
  const showArticles = tab === "all" || tab === "articles";
  const showProperties = tab === "all" || tab === "properties";
  const showProcedures = tab === "all" || tab === "procedures";

  return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />
      <div className="h-1.5 bg-[#FF6600]" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500 hover:text-[#FF6600] transition-colors mb-8" data-testid="saved-back-btn">
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <Bookmark className="w-6 h-6 text-[#FF6600]" />
          <h1 className="font-['Oswald'] text-2xl sm:text-3xl font-bold uppercase tracking-tight text-black" data-testid="saved-title">
            Mes favoris
          </h1>
          {!loading && <span className="text-sm text-zinc-500">({totalCount})</span>}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 mb-6 overflow-x-auto" data-testid="saved-tabs">
          {TABS.map(t => {
            const count = t.key === "all" ? totalCount : t.key === "articles" ? articles.length : t.key === "properties" ? properties.length : procedures.length;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.key ? "border-[#FF6600] text-[#FF6600]" : "border-transparent text-zinc-500 hover:text-black"
                }`}>
                <t.icon className="w-3.5 h-3.5" /> {t.label} ({count})
              </button>
            );
          })}
        </div>

        {loading && <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" /></div>}

        {!loading && totalCount === 0 && (
          <div className="text-center py-24 bg-white border border-zinc-200" data-testid="empty-saved">
            <Bookmark className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
            <p className="font-['Oswald'] text-2xl uppercase text-zinc-300">Aucun favori</p>
            <p className="text-sm text-zinc-400 mt-2 mb-6">Sauvegardez du contenu pour le retrouver ici.</p>
            <Link to="/" className="inline-flex items-center gap-2 bg-[#FF6600] text-white font-bold uppercase tracking-wider px-6 py-3 hover:bg-[#CC5200] transition-colors">
              Explorer
            </Link>
          </div>
        )}

        {!loading && (
          <div className="space-y-8">
            {/* Articles */}
            {showArticles && articles.length > 0 && (
              <section>
                {tab === "all" && (
                  <h2 className="font-['Oswald'] text-lg font-bold uppercase tracking-tight mb-4 flex items-center gap-2">
                    <Newspaper className="w-5 h-5 text-[#FF6600]" /> Articles ({articles.length})
                  </h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" data-testid="saved-articles-list">
                  {articles.map(s => s.article ? (
                    <div key={s.id} className="relative group/saved">
                      <ArticleCard article={s.article} />
                    </div>
                  ) : null)}
                </div>
              </section>
            )}

            {/* Properties */}
            {showProperties && properties.length > 0 && (
              <section>
                {tab === "all" && (
                  <h2 className="font-['Oswald'] text-lg font-bold uppercase tracking-tight mb-4 flex items-center gap-2">
                    <Home className="w-5 h-5 text-[#FF6600]" /> Annonces ({properties.length})
                  </h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" data-testid="saved-properties-list">
                  {properties.map(s => (
                    <div key={s.id} className="bg-white border border-zinc-200 hover:border-[#FF6600] transition-all group relative">
                      <button onClick={() => unsaveProperty(s.property_id)} data-testid={`unsave-property-${s.property_id}`}
                        className="absolute top-2 right-2 z-10 p-1.5 bg-[#FF6600] text-white rounded-full shadow-md hover:bg-red-600 transition-colors">
                        <Bookmark className="w-3.5 h-3.5 fill-white" />
                      </button>
                      {s.image_url ? (
                        <div className="aspect-[4/3] overflow-hidden"><img src={s.image_url} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /></div>
                      ) : (
                        <div className="aspect-[4/3] bg-zinc-900 flex items-center justify-center"><Home className="w-8 h-8 text-zinc-600" /></div>
                      )}
                      <div className="p-3">
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 text-white ${s.type === "vente" ? "bg-[#FF6600]" : s.type === "achat" ? "bg-green-600" : "bg-blue-600"}`}>{s.type}</span>
                        <p className="font-['Oswald'] text-lg font-bold text-[#FF6600] mt-1.5">{new Intl.NumberFormat("fr-FR").format(s.price)} {s.currency}</p>
                        <h3 className="font-['Oswald'] text-sm font-bold uppercase text-black line-clamp-1 mt-1">{s.title}</h3>
                        <p className="text-[10px] text-zinc-500 mt-1">{s.city}{s.neighborhood ? ` - ${s.neighborhood}` : ""}</p>
                        <Link to={`/immobilier/${s.property_id}`} className="mt-2 block text-center bg-black text-white text-[10px] font-bold uppercase py-1.5 hover:bg-[#FF6600] transition-colors">Voir</Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Procedures */}
            {showProcedures && procedures.length > 0 && (
              <section>
                {tab === "all" && (
                  <h2 className="font-['Oswald'] text-lg font-bold uppercase tracking-tight mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#FF6600]" /> Procedures ({procedures.length})
                  </h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" data-testid="saved-procedures-list">
                  {procedures.map(s => (
                    <div key={s.id} className="bg-white border border-zinc-200 hover:border-[#FF6600] transition-all group relative">
                      <button onClick={() => unsaveProcedure(s.procedure_id)} data-testid={`unsave-procedure-${s.procedure_id}`}
                        className="absolute top-2 right-2 z-10 p-1.5 bg-[#FF6600] text-white rounded-full shadow-md hover:bg-red-600 transition-colors">
                        <Bookmark className="w-3.5 h-3.5 fill-white" />
                      </button>
                      {s.image_url ? (
                        <div className="aspect-video overflow-hidden"><img src={s.image_url} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /></div>
                      ) : (
                        <div className="aspect-video bg-zinc-900 flex items-center justify-center"><FileText className="w-8 h-8 text-zinc-600" /></div>
                      )}
                      <div className="p-3">
                        {s.subcategory_name && <span className="text-[10px] font-bold uppercase text-[#FF6600]">{s.subcategory_name}</span>}
                        <h3 className="font-['Oswald'] text-sm font-bold uppercase text-black line-clamp-2 mt-1">{s.title}</h3>
                        <Link to={`/procedures/${s.procedure_id}`} className="mt-2 block text-center bg-black text-white text-[10px] font-bold uppercase py-1.5 hover:bg-[#FF6600] transition-colors">Voir</Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

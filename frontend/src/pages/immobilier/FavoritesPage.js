import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import { formatPrice } from "../../components/immobilier/PropertyCard";
import { Loader2, ArrowLeft, Heart, MapPin, Bed, Maximize, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function FavoritesPage() {
  const { token } = useAuth();
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.get("/saved-properties")
      .then(r => setSaved(r.data))
      .catch(() => toast.error("Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleRemove = async (propertyId) => {
    try {
      await api.post(`/saved-properties/${propertyId}`);
      setSaved(prev => prev.filter(s => s.property_id !== propertyId));
      toast.success("Retire des favoris");
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />
      <div className="h-1.5 bg-[#FF6600]" />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/immobilier" className="p-2 text-zinc-500 hover:text-[#FF6600] transition-colors" data-testid="favorites-back-btn">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-['Oswald'] text-2xl sm:text-3xl font-bold uppercase tracking-tight" data-testid="favorites-title">
              Mes favoris
            </h1>
            <p className="text-xs text-zinc-500 mt-1">{saved.length} annonce{saved.length !== 1 ? "s" : ""} sauvegardee{saved.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {loading && <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-[#FF6600]" /></div>}

        {!loading && saved.length === 0 && (
          <div className="text-center py-24" data-testid="favorites-empty">
            <Heart className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
            <p className="font-['Oswald'] text-2xl uppercase text-zinc-300">Aucun favori</p>
            <p className="text-sm text-zinc-500 mt-2">Sauvegardez des annonces pour les retrouver ici.</p>
            <Link to="/immobilier" className="mt-4 inline-block bg-[#FF6600] text-white text-xs font-bold uppercase px-5 py-2 hover:bg-[#CC5200]">
              Voir les annonces
            </Link>
          </div>
        )}

        {!loading && saved.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {saved.map(s => (
              <div key={s.id} className="bg-white border border-zinc-200 hover:border-[#FF6600] transition-all group" data-testid="favorite-card">
                <div className="relative aspect-[4/3] bg-zinc-100 overflow-hidden">
                  {s.image_url ? (
                    <img src={s.image_url} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <Heart className="w-8 h-8 text-zinc-600" />
                    </div>
                  )}
                  <span className={`absolute top-2 left-2 text-[10px] font-bold uppercase px-2 py-0.5 text-white ${
                    s.type === "vente" ? "bg-[#FF6600]" : s.type === "achat" ? "bg-green-600" : "bg-blue-600"
                  }`}>{s.type}</span>
                </div>
                <div className="p-3">
                  <p className="font-['Oswald'] text-lg font-bold text-[#FF6600]">{formatPrice(s.price, s.currency)}</p>
                  <h3 className="font-['Oswald'] text-sm font-bold uppercase text-black line-clamp-1 mt-1">{s.title}</h3>
                  <p className="flex items-center gap-1 text-[10px] text-zinc-500 mt-1">
                    <MapPin className="w-2.5 h-2.5" /> {s.city}{s.neighborhood ? ` - ${s.neighborhood}` : ""}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500 mt-1">
                    {s.bedrooms > 0 && <span className="flex items-center gap-0.5"><Bed className="w-2.5 h-2.5" /> {s.bedrooms} ch.</span>}
                    {s.surface_area > 0 && <span className="flex items-center gap-0.5"><Maximize className="w-2.5 h-2.5" /> {s.surface_area} m²</span>}
                  </div>
                  <div className="flex gap-2 mt-3 pt-2 border-t border-zinc-100">
                    <Link to={`/immobilier/${s.property_id}`}
                      className="flex-1 text-center bg-black text-white text-[10px] font-bold uppercase py-1.5 hover:bg-[#FF6600] transition-colors">
                      Voir
                    </Link>
                    <button onClick={() => handleRemove(s.property_id)} data-testid="remove-favorite-btn"
                      className="flex items-center gap-1 px-3 py-1.5 border border-zinc-300 text-[10px] font-bold text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-2.5 h-2.5" /> Retirer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

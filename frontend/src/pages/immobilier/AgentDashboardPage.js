import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import { toast } from "sonner";
import { formatPrice } from "../../components/immobilier/PropertyCard";
import { Loader2, Plus, Edit, Trash2, Eye, ArrowLeft } from "lucide-react";

const STATUS_COLORS = {
  disponible: "text-green-600", reserve: "text-yellow-600", vendu: "text-red-600", loue: "text-purple-600"
};
const STATUS_LABELS = { disponible: "Disponible", reserve: "Réservé", vendu: "Vendu", loue: "Loué" };

export default function AgentDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProps = () => {
    api.get("/my-properties")
      .then(r => setProperties(r.data))
      .catch(() => toast.error("Erreur de chargement"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProps(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette annonce ?")) return;
    try {
      await api.delete(`/properties/${id}`);
      toast.success("Annonce supprimée.");
      fetchProps();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />
      <div className="h-1.5 bg-[#FF6600]" />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link to="/immobilier" className="flex items-center gap-1 text-xs text-zinc-400 hover:text-[#FF6600] mb-2 transition-colors">
              <ArrowLeft className="w-3 h-3" /> Immobilier
            </Link>
            <h1 className="font-['Oswald'] text-2xl font-bold uppercase tracking-tight">Mes annonces</h1>
          </div>
          <Link to="/immobilier/publier"
            className="flex items-center gap-2 bg-[#FF6600] text-white text-xs font-bold uppercase tracking-wider px-4 py-2 hover:bg-[#CC5200] transition-colors">
            <Plus className="w-4 h-4" /> Nouvelle annonce
          </Link>
        </div>

        {loading && <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-[#FF6600]" /></div>}

        {!loading && properties.length === 0 && (
          <div className="text-center py-24">
            <p className="font-['Oswald'] text-2xl uppercase text-zinc-300">Aucune annonce publiée</p>
            <Link to="/immobilier/publier" className="mt-4 inline-block bg-[#FF6600] text-white text-xs font-bold uppercase px-5 py-2 hover:bg-[#CC5200]">
              Publier ma première annonce
            </Link>
          </div>
        )}

        {!loading && properties.length > 0 && (
          <div className="space-y-3">
            {properties.map(p => (
              <div key={p.id} className="bg-white border border-zinc-200 p-4 flex gap-4 hover:border-[#FF6600] transition-colors">
                {/* Thumb */}
                <div className="w-20 h-16 flex-shrink-0 bg-zinc-100 overflow-hidden">
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-zinc-300 text-xs">No img</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <h3 className="font-['Oswald'] font-bold text-black truncate flex-1">{p.title}</h3>
                    <span className={`text-xs font-bold uppercase ${STATUS_COLORS[p.status] || "text-zinc-500"}`}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </div>
                  <p className="text-[#FF6600] font-bold text-sm mt-0.5">{formatPrice(p.price, p.currency)}</p>
                  <p className="text-zinc-400 text-xs mt-0.5">{p.city} · {p.type} · <Eye className="w-3 h-3 inline" /> {p.views}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link to={`/immobilier/${p.id}`} className="p-2 text-zinc-400 hover:text-black transition-colors" title="Voir"><Eye className="w-4 h-4" /></Link>
                  <Link to={`/immobilier/modifier/${p.id}`} className="p-2 text-zinc-400 hover:text-[#FF6600] transition-colors" title="Modifier"><Edit className="w-4 h-4" /></Link>
                  <button onClick={() => handleDelete(p.id)} className="p-2 text-zinc-400 hover:text-red-600 transition-colors" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

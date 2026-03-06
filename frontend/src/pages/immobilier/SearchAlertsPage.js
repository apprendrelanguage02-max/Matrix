import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/layout/Footer";
import api from "../../lib/api";
import { Loader2, ArrowLeft, Bell, Plus, Trash2, MapPin, Home, X } from "lucide-react";
import { toast } from "sonner";

const CITIES = ["Conakry", "Kindia", "Labe", "Kankan", "Boke", "Mamou", "Faranah", "N'Zerekore"];
const CATEGORIES = [
  { v: "", l: "Toutes" }, { v: "villa", l: "Villa" }, { v: "appartement", l: "Appartement" },
  { v: "terrain", l: "Terrain" }, { v: "maison", l: "Maison" }, { v: "bureau", l: "Bureau" },
];
const TYPES = [{ v: "", l: "Tous" }, { v: "vente", l: "Vente" }, { v: "achat", l: "Achat" }, { v: "location", l: "Location" }];

export default function SearchAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    city: "", neighborhood: "", type: "", min_price: 0, max_price: 0,
    property_category: "", min_bedrooms: 0,
  });

  const fetchAlerts = () => {
    api.get("/search-alerts")
      .then(r => setAlerts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAlerts(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.post("/search-alerts", {
        ...form,
        min_price: form.min_price ? parseFloat(form.min_price) : 0,
        max_price: form.max_price ? parseFloat(form.max_price) : 0,
        min_bedrooms: form.min_bedrooms ? parseInt(form.min_bedrooms) : 0,
      });
      toast.success("Alerte creee !");
      setShowForm(false);
      setForm({ city: "", neighborhood: "", type: "", min_price: 0, max_price: 0, property_category: "", min_bedrooms: 0 });
      fetchAlerts();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/search-alerts/${id}`);
      setAlerts(prev => prev.filter(a => a.id !== id));
      toast.success("Alerte supprimee");
    } catch { toast.error("Erreur"); }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />
      <div className="h-1.5 bg-[#FF6600]" />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link to="/immobilier" className="p-2 text-zinc-500 hover:text-[#FF6600] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-['Oswald'] text-2xl font-bold uppercase tracking-tight" data-testid="alerts-title">Alertes de recherche</h1>
              <p className="text-xs text-zinc-500 mt-1">Recevez des notifications quand une annonce correspond a vos criteres</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)} data-testid="create-alert-btn"
            className="flex items-center gap-1.5 bg-[#FF6600] text-white text-xs font-bold uppercase px-4 py-2 hover:bg-[#CC5200] transition-colors">
            <Plus className="w-4 h-4" /> Nouvelle
          </button>
        </div>

        {/* Create Alert Form */}
        {showForm && (
          <div className="bg-white border border-[#FF6600] p-5 mb-6 rounded-lg" data-testid="alert-form">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-['Oswald'] text-lg font-bold uppercase">Nouvelle alerte</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-black"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500 mb-1 block">Ville</label>
                <select value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))}
                  className="w-full border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-[#FF6600]">
                  <option value="">Toutes</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500 mb-1 block">Quartier</label>
                <input value={form.neighborhood} onChange={e => setForm(f => ({...f, neighborhood: e.target.value}))}
                  placeholder="Ex: Kipe..." className="w-full border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-[#FF6600]" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500 mb-1 block">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}
                  className="w-full border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-[#FF6600]">
                  {TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500 mb-1 block">Categorie</label>
                <select value={form.property_category} onChange={e => setForm(f => ({...f, property_category: e.target.value}))}
                  className="w-full border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-[#FF6600]">
                  {CATEGORIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500 mb-1 block">Prix min (GNF)</label>
                <input type="number" value={form.min_price || ""} onChange={e => setForm(f => ({...f, min_price: e.target.value}))}
                  placeholder="0" className="w-full border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-[#FF6600]" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500 mb-1 block">Prix max (GNF)</label>
                <input type="number" value={form.max_price || ""} onChange={e => setForm(f => ({...f, max_price: e.target.value}))}
                  placeholder="Illimite" className="w-full border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-[#FF6600]" />
              </div>
            </div>
            <button onClick={handleCreate} disabled={saving} data-testid="save-alert-btn"
              className="mt-4 w-full bg-[#FF6600] text-white text-xs font-bold uppercase py-2.5 hover:bg-[#CC5200] transition-colors disabled:opacity-50">
              {saving ? "Creation..." : "Creer l'alerte"}
            </button>
          </div>
        )}

        {loading && <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-[#FF6600]" /></div>}

        {!loading && alerts.length === 0 && !showForm && (
          <div className="text-center py-24" data-testid="alerts-empty">
            <Bell className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
            <p className="font-['Oswald'] text-2xl uppercase text-zinc-300">Aucune alerte</p>
            <p className="text-sm text-zinc-500 mt-2">Creez une alerte pour etre notifie des nouvelles annonces.</p>
          </div>
        )}

        {!loading && alerts.length > 0 && (
          <div className="space-y-3">
            {alerts.map(a => (
              <div key={a.id} className="bg-white border border-zinc-200 p-4 flex items-start gap-3 hover:border-[#FF6600] transition-colors" data-testid="alert-card">
                <Bell className="w-5 h-5 text-[#FF6600] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {a.city && <span className="flex items-center gap-1 bg-zinc-100 px-2 py-0.5 rounded"><MapPin className="w-2.5 h-2.5" /> {a.city}</span>}
                    {a.neighborhood && <span className="bg-zinc-100 px-2 py-0.5 rounded">{a.neighborhood}</span>}
                    {a.type && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold uppercase">{a.type}</span>}
                    {a.property_category && <span className="flex items-center gap-1 bg-zinc-100 px-2 py-0.5 rounded"><Home className="w-2.5 h-2.5" /> {a.property_category}</span>}
                    {a.min_price > 0 && <span className="bg-zinc-100 px-2 py-0.5 rounded">&ge; {new Intl.NumberFormat("fr-FR").format(a.min_price)} GNF</span>}
                    {a.max_price > 0 && <span className="bg-zinc-100 px-2 py-0.5 rounded">&le; {new Intl.NumberFormat("fr-FR").format(a.max_price)} GNF</span>}
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Creee le {new Date(a.created_at).toLocaleDateString("fr-FR")}
                    {a.last_notified && ` - Derniere notification: ${new Date(a.last_notified).toLocaleDateString("fr-FR")}`}
                  </p>
                </div>
                <button onClick={() => handleDelete(a.id)} data-testid="delete-alert-btn"
                  className="p-2 text-zinc-400 hover:text-red-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

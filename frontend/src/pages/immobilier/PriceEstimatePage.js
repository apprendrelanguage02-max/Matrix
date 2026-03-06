import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/layout/Footer";
import api from "../../lib/api";
import { formatPrice, formatPriceConverted } from "../../components/immobilier/PropertyCard";
import { ArrowLeft, Calculator, TrendingUp, MapPin, Home, Bed, Maximize, Loader2 } from "lucide-react";

const CITIES = ["Conakry", "Kindia", "Labe", "Kankan", "Boke", "Mamou", "Faranah", "N'Zerekore"];
const CATEGORIES = [
  { v: "autre", l: "Non specifie" }, { v: "villa", l: "Villa" }, { v: "appartement", l: "Appartement" },
  { v: "terrain", l: "Terrain" }, { v: "maison", l: "Maison" }, { v: "bureau", l: "Bureau" },
];

export default function PriceEstimatePage() {
  const [form, setForm] = useState({ city: "Conakry", neighborhood: "", property_category: "autre", bedrooms: 0, surface_area: 0 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleEstimate = async () => {
    if (!form.city) return;
    setLoading(true);
    try {
      const params = { city: form.city };
      if (form.neighborhood) params.neighborhood = form.neighborhood;
      if (form.property_category !== "autre") params.property_category = form.property_category;
      if (form.bedrooms > 0) params.bedrooms = form.bedrooms;
      if (form.surface_area > 0) params.surface_area = form.surface_area;
      const res = await api.get("/properties/estimate", { params });
      setResult(res.data);
    } catch {
      setResult(null);
    } finally { setLoading(false); }
  };

  const confidenceColor = { high: "text-green-600", medium: "text-yellow-600", low: "text-red-500" };

  return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />
      <div className="h-1.5 bg-[#FF6600]" />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <Link to="/immobilier" className="flex items-center gap-2 text-sm font-bold uppercase text-zinc-500 hover:text-[#FF6600] mb-8 transition-colors" data-testid="estimate-back">
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="text-center mb-8">
          <Calculator className="w-10 h-10 text-[#FF6600] mx-auto mb-3" />
          <h1 className="font-['Oswald'] text-3xl font-bold uppercase tracking-tight" data-testid="estimate-title">Estimation de prix</h1>
          <p className="text-sm text-zinc-500 mt-2">Estimez le prix d'un bien en fonction de sa localisation et ses caracteristiques</p>
        </div>

        <div className="bg-white border border-zinc-200 p-6 space-y-4" data-testid="estimate-form">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500 mb-1 block"><MapPin className="w-3 h-3 inline mr-1" />Ville *</label>
              <select value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))}
                className="w-full border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600]">
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500 mb-1 block">Quartier</label>
              <input value={form.neighborhood} onChange={e => setForm(f => ({...f, neighborhood: e.target.value}))}
                placeholder="Ex: Kipe, Ratoma..." className="w-full border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600]" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500 mb-1 block"><Home className="w-3 h-3 inline mr-1" />Type de bien</label>
              <select value={form.property_category} onChange={e => setForm(f => ({...f, property_category: e.target.value}))}
                className="w-full border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600]">
                {CATEGORIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500 mb-1 block"><Bed className="w-3 h-3 inline mr-1" />Chambres</label>
              <select value={form.bedrooms} onChange={e => setForm(f => ({...f, bedrooms: parseInt(e.target.value)}))}
                className="w-full border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600]">
                <option value={0}>Non specifie</option>
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500 mb-1 block"><Maximize className="w-3 h-3 inline mr-1" />Surface m²</label>
              <input type="number" value={form.surface_area || ""} onChange={e => setForm(f => ({...f, surface_area: parseFloat(e.target.value) || 0}))}
                placeholder="0" className="w-full border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600]" />
            </div>
          </div>
          <button onClick={handleEstimate} disabled={loading || !form.city} data-testid="estimate-btn"
            className="w-full flex items-center justify-center gap-2 bg-[#FF6600] text-white font-bold uppercase py-3 hover:bg-[#CC5200] transition-colors disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            {loading ? "Calcul en cours..." : "Estimer le prix"}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="bg-white border-2 border-[#FF6600] p-6 mt-6" data-testid="estimate-result">
            {result.estimated_price > 0 ? (
              <>
                <p className="text-xs text-zinc-500 uppercase font-bold mb-2">Prix estime</p>
                <p className="font-['Oswald'] text-4xl font-bold text-[#FF6600]" data-testid="estimated-price">
                  {formatPrice(result.estimated_price)}
                </p>
                {result.price_converted?.usd > 0 && (
                  <p className="text-sm text-zinc-500 mt-1" data-testid="estimated-price-converted">
                    {formatPriceConverted(result.price_converted)}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-zinc-100">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase">Fourchette basse</p>
                    <p className="font-bold text-sm">{formatPrice(result.price_range.min)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase">Fourchette haute</p>
                    <p className="font-bold text-sm">{formatPrice(result.price_range.max)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase">Fiabilite</p>
                    <p className={`font-bold text-sm uppercase ${confidenceColor[result.confidence] || "text-zinc-600"}`}>
                      {result.confidence === "high" ? "Haute" : result.confidence === "medium" ? "Moyenne" : "Faible"}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400 mt-3">Base sur {result.sample_count} annonce{result.sample_count > 1 ? "s" : ""} similaire{result.sample_count > 1 ? "s" : ""}</p>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-zinc-500 text-sm">Pas assez de donnees pour estimer le prix dans cette zone.</p>
                <p className="text-[10px] text-zinc-400 mt-1">Essayez avec des criteres differents.</p>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

import { useState, useEffect } from "react";
import api from "../../../lib/api";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

export function PriceReferencesTab() {
  const [refs, setRefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [quartiers, setQuartiers] = useState([]);
  const [form, setForm] = useState({ city: "", commune: "", quartier: "", price_per_sqm: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/admin/price-references").then(r => setRefs(r.data)).catch(() => {}).finally(() => setLoading(false));
    api.get("/locations/cities").then(r => setCities(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.city) { setCommunes([]); setQuartiers([]); return; }
    api.get("/locations/communes", { params: { city: form.city } }).then(r => setCommunes(r.data)).catch(() => setCommunes([]));
    setForm(f => ({ ...f, commune: "", quartier: "" }));
  }, [form.city]);

  useEffect(() => {
    if (!form.city || !form.commune) { setQuartiers([]); return; }
    api.get("/locations/quartiers", { params: { city: form.city, commune: form.commune } }).then(r => setQuartiers(r.data)).catch(() => setQuartiers([]));
    setForm(f => ({ ...f, quartier: "" }));
  }, [form.city, form.commune]);

  const handleAdd = async () => {
    if (!form.city || !form.price_per_sqm) { toast.error("Ville et prix requis"); return; }
    setSaving(true);
    try {
      await api.post("/admin/price-references", {
        city: form.city, commune: form.commune || "", quartier: form.quartier || "",
        price_per_sqm: parseFloat(form.price_per_sqm),
      });
      toast.success("Prix de reference enregistre !");
      setForm({ city: "", commune: "", quartier: "", price_per_sqm: "" });
      api.get("/admin/price-references").then(r => setRefs(r.data));
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Erreur");
    } finally { setSaving(false); }
  };

  const handleDelete = async (r) => {
    try {
      await api.delete("/admin/price-references", { params: { city: r.city, commune: r.commune || "", quartier: r.quartier || "" } });
      setRefs(prev => prev.filter(x => !(x.city === r.city && x.commune === (r.commune||"") && x.quartier === (r.quartier||""))));
      toast.success("Supprime");
    } catch { toast.error("Erreur"); }
  };

  return (
    <div className="space-y-6" data-testid="prices-tab">
      <div className="bg-white border border-zinc-200 p-5">
        <h3 className="font-['Oswald'] text-lg font-bold uppercase mb-4">Ajouter un prix de reference au m2</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <select value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} data-testid="price-ref-city"
            className="border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-[#FF6600]">
            <option value="">Ville *</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={form.commune} onChange={e => setForm(f => ({...f, commune: e.target.value}))} disabled={!form.city} data-testid="price-ref-commune"
            className="border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-[#FF6600] disabled:bg-zinc-50">
            <option value="">Commune</option>
            {communes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={form.quartier} onChange={e => setForm(f => ({...f, quartier: e.target.value}))} disabled={!form.commune} data-testid="price-ref-quartier"
            className="border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-[#FF6600] disabled:bg-zinc-50">
            <option value="">Quartier</option>
            {quartiers.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
          <input type="number" value={form.price_per_sqm} onChange={e => setForm(f => ({...f, price_per_sqm: e.target.value}))}
            placeholder="Prix/m2 (GNF) *" data-testid="price-ref-value"
            className="border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-[#FF6600]" />
          <button onClick={handleAdd} disabled={saving} data-testid="price-ref-add"
            className="bg-[#FF6600] text-white text-xs font-bold uppercase px-4 py-2 hover:bg-[#CC5200] transition-colors disabled:opacity-50">
            {saving ? "..." : "Ajouter"}
          </button>
        </div>
        <p className="text-[10px] text-zinc-400 mt-2">Sans commune = prix par defaut pour toute la ville. Sans quartier = prix par defaut pour la commune.</p>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#FF6600]" /></div> : (
        <div className="bg-white border border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm" data-testid="price-ref-table">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-4 py-2 text-left text-xs font-bold uppercase text-zinc-500">Ville</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase text-zinc-500">Commune</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase text-zinc-500">Quartier</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase text-zinc-500">Prix/m2 (GNF)</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {refs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-400">Aucun prix de reference configure.</td></tr>
              )}
              {refs.map((r) => (
                <tr key={`${r.city}-${r.commune || ''}-${r.quartier || ''}`} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="px-4 py-2 font-bold">{r.city}</td>
                  <td className="px-4 py-2">{r.commune || <span className="text-zinc-300">-</span>}</td>
                  <td className="px-4 py-2">{r.quartier || <span className="text-zinc-300">-</span>}</td>
                  <td className="px-4 py-2 font-bold text-[#FF6600]">{new Intl.NumberFormat("fr-FR").format(r.price_per_sqm)} GNF</td>
                  <td className="px-4 py-2">
                    <button onClick={() => handleDelete(r)} className="text-red-500 hover:text-red-700 transition-colors p-1" data-testid="price-ref-delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

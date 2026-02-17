import { useState } from "react";
import { Filter, X, ChevronDown } from "lucide-react";

const CITIES = ["Conakry", "Kindia", "Labé", "Kankan", "Boké", "Mamou", "Faranah", "N'Zérékoré"];

export default function PropertyFilters({ filters, onChange }) {
  const [open, setOpen] = useState(false);

  const set = (key, val) => onChange({ ...filters, [key]: val, page: 1 });
  const reset = () => onChange({ type: "", city: "", status: "disponible", price_min: "", price_max: "", sort: "recent", page: 1 });
  const hasActive = filters.type || filters.city || filters.price_min || filters.price_max || filters.sort !== "recent";

  return (
    <div className="bg-white border border-zinc-200 mb-6">
      {/* Type tabs */}
      <div className="flex border-b border-zinc-100 overflow-x-auto">
        {[{ v: "", l: "Tout" }, { v: "vente", l: "Vente" }, { v: "achat", l: "Achat" }, { v: "location", l: "Location" }].map(({ v, l }) => (
          <button key={v} onClick={() => set("type", v)}
            className={`flex-shrink-0 px-5 py-3 text-xs font-bold font-['Manrope'] uppercase tracking-wider border-b-2 transition-colors ${
              filters.type === v ? "border-[#FF6600] text-[#FF6600]" : "border-transparent text-zinc-500 hover:text-black"
            }`}>
            {l}
          </button>
        ))}
        <button onClick={() => setOpen(v => !v)}
          className="ml-auto flex items-center gap-1.5 px-4 py-3 text-xs font-bold font-['Manrope'] uppercase tracking-wider text-zinc-500 hover:text-black transition-colors">
          <Filter className="w-3.5 h-3.5" />
          Filtres
          {hasActive && <span className="w-2 h-2 rounded-full bg-[#FF6600]" />}
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Extended filters */}
      {open && (
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Ville</label>
            <select value={filters.city} onChange={e => set("city", e.target.value)}
              className="w-full border border-zinc-300 px-3 py-2 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]">
              <option value="">Toutes</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Statut</label>
            <select value={filters.status} onChange={e => set("status", e.target.value)}
              className="w-full border border-zinc-300 px-3 py-2 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]">
              <option value="disponible">Disponible</option>
              <option value="reserve">Réservé</option>
              <option value="vendu">Vendu/Loué</option>
              <option value="all">Tous</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Prix min (GNF)</label>
            <input type="number" value={filters.price_min} onChange={e => set("price_min", e.target.value)}
              placeholder="0"
              className="w-full border border-zinc-300 px-3 py-2 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Prix max (GNF)</label>
            <input type="number" value={filters.price_max} onChange={e => set("price_max", e.target.value)}
              placeholder="illimité"
              className="w-full border border-zinc-300 px-3 py-2 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Trier par</label>
            <select value={filters.sort} onChange={e => set("sort", e.target.value)}
              className="w-full border border-zinc-300 px-3 py-2 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]">
              <option value="recent">Plus récents</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
            </select>
          </div>
          <div className="flex items-end">
            {hasActive && (
              <button onClick={reset}
                className="flex items-center gap-1 text-xs font-bold font-['Manrope'] uppercase text-[#FF6600] hover:text-black transition-colors">
                <X className="w-3 h-3" /> Réinitialiser
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

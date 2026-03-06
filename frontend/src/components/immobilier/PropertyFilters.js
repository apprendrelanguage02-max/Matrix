import { useState } from "react";
import { Filter, X, ChevronDown, Search } from "lucide-react";

const CITIES = ["Conakry", "Kindia", "Labe", "Kankan", "Boke", "Mamou", "Faranah", "N'Zerekore"];
const CATEGORIES = [
  { v: "", l: "Tout type" },
  { v: "villa", l: "Villa" }, { v: "appartement", l: "Appartement" }, { v: "terrain", l: "Terrain" },
  { v: "bureau", l: "Bureau" }, { v: "commerce", l: "Commerce" }, { v: "maison", l: "Maison" },
  { v: "studio", l: "Studio" }, { v: "duplex", l: "Duplex" },
];

export default function PropertyFilters({ filters, onChange }) {
  const [open, setOpen] = useState(false);
  const [neighborhoodInput, setNeighborhoodInput] = useState(filters.neighborhood || "");

  const set = (key, val) => onChange({ ...filters, [key]: val, page: 1 });
  const reset = () => {
    setNeighborhoodInput("");
    onChange({ type: "", city: "", neighborhood: "", status: "disponible", price_min: "", price_max: "", sort: "recent", property_category: "", bedrooms: "", page: 1 });
  };
  const hasActive = filters.type || filters.city || filters.neighborhood || filters.price_min || filters.price_max || filters.sort !== "recent" || filters.property_category || filters.bedrooms;

  return (
    <div className="bg-white border border-zinc-200 mb-6" data-testid="property-filters">
      {/* Type tabs */}
      <div className="flex border-b border-zinc-100 overflow-x-auto">
        {[{ v: "", l: "Tout" }, { v: "vente", l: "Vente" }, { v: "achat", l: "Achat" }, { v: "location", l: "Location" }].map(({ v, l }) => (
          <button key={v} onClick={() => set("type", v)} data-testid={`filter-type-${v || "all"}`}
            className={`flex-shrink-0 px-5 py-3 text-xs font-bold font-['Manrope'] uppercase tracking-wider border-b-2 transition-colors ${
              filters.type === v ? "border-[#FF6600] text-[#FF6600]" : "border-transparent text-zinc-500 hover:text-black"
            }`}>
            {l}
          </button>
        ))}
        <button onClick={() => setOpen(v => !v)} data-testid="toggle-advanced-filters"
          className="ml-auto flex items-center gap-1.5 px-4 py-3 text-xs font-bold font-['Manrope'] uppercase tracking-wider text-zinc-500 hover:text-black transition-colors">
          <Filter className="w-3.5 h-3.5" />
          Filtres
          {hasActive && <span className="w-2 h-2 rounded-full bg-[#FF6600]" />}
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Extended filters */}
      {open && (
        <div className="p-4 space-y-3" data-testid="advanced-filters-panel">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Ville</label>
              <select value={filters.city} onChange={e => set("city", e.target.value)} data-testid="filter-city"
                className="w-full border border-zinc-300 px-3 py-2 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]">
                <option value="">Toutes</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Quartier</label>
              <div className="relative">
                <input value={neighborhoodInput}
                  onChange={e => setNeighborhoodInput(e.target.value)}
                  onBlur={() => set("neighborhood", neighborhoodInput)}
                  onKeyDown={e => { if (e.key === "Enter") set("neighborhood", neighborhoodInput); }}
                  placeholder="Ex: Kipe, Ratoma..."
                  data-testid="filter-neighborhood"
                  className="w-full border border-zinc-300 px-3 py-2 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600] pr-8" />
                <Search className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Categorie</label>
              <select value={filters.property_category || ""} onChange={e => set("property_category", e.target.value)} data-testid="filter-category"
                className="w-full border border-zinc-300 px-3 py-2 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]">
                {CATEGORIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Statut</label>
              <select value={filters.status} onChange={e => set("status", e.target.value)} data-testid="filter-status"
                className="w-full border border-zinc-300 px-3 py-2 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]">
                <option value="disponible">Disponible</option>
                <option value="reserve">Reserve</option>
                <option value="vendu">Vendu/Loue</option>
                <option value="all">Tous</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Prix min (GNF)</label>
              <input type="number" value={filters.price_min} onChange={e => set("price_min", e.target.value)}
                placeholder="0" data-testid="filter-price-min"
                className="w-full border border-zinc-300 px-3 py-2 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Prix max (GNF)</label>
              <input type="number" value={filters.price_max} onChange={e => set("price_max", e.target.value)}
                placeholder="illimite" data-testid="filter-price-max"
                className="w-full border border-zinc-300 px-3 py-2 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Chambres min</label>
              <select value={filters.bedrooms || ""} onChange={e => set("bedrooms", e.target.value)} data-testid="filter-bedrooms"
                className="w-full border border-zinc-300 px-3 py-2 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]">
                <option value="">Toutes</option>
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}+</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Trier par</label>
              <select value={filters.sort} onChange={e => set("sort", e.target.value)} data-testid="filter-sort"
                className="w-full border border-zinc-300 px-3 py-2 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]">
                <option value="recent">Plus recents</option>
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix decroissant</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasActive && (
              <button onClick={reset} data-testid="reset-filters-btn"
                className="flex items-center gap-1 text-xs font-bold font-['Manrope'] uppercase text-[#FF6600] hover:text-black transition-colors">
                <X className="w-3 h-3" /> Reinitialiser
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

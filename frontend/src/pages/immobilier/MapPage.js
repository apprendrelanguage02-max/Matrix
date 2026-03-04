import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Header from "../../components/Header";
import Footer from "../../components/layout/Footer";
import api from "../../lib/api";
import { Loader2, ArrowLeft, MapPin, Filter, X } from "lucide-react";
import { formatPrice } from "../../components/immobilier/PropertyCard";
import "leaflet/dist/leaflet.css";

// Fix leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const TYPE_COLORS = {
  achat: "#FF6600",
  vente: "#16a34a",
  location: "#0ea5e9",
};

function createCustomIcon(type) {
  const color = TYPE_COLORS[type] || "#FF6600";
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;">
      <div style="transform:rotate(45deg);color:white;font-size:12px;font-weight:bold;">${type === "achat" ? "A" : type === "vente" ? "V" : "L"}</div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

const GUINEA_CENTER = [9.9456, -9.6966];
const TYPE_OPTIONS = [
  { value: "", label: "Tous types" },
  { value: "achat", label: "Achat" },
  { value: "vente", label: "Vente" },
  { value: "location", label: "Location" },
];
const STATUS_OPTIONS = [
  { value: "", label: "Tous statuts" },
  { value: "disponible", label: "Disponible" },
  { value: "reserve", label: "Reserve" },
  { value: "vendu", label: "Vendu" },
];

export default function MapPage() {
  const navigate = useNavigate();
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ type: "", city: "", status: "", min_price: "", max_price: "" });

  const fetchMarkers = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filters.type) params.type = filters.type;
    if (filters.city) params.city = filters.city;
    if (filters.status) params.status = filters.status;
    if (filters.min_price) params.min_price = filters.min_price;
    if (filters.max_price) params.max_price = filters.max_price;
    api.get("/properties/map/markers", { params })
      .then(r => setMarkers(r.data))
      .catch(() => setMarkers([]))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { fetchMarkers(); }, [fetchMarkers]);

  const clearFilters = () => setFilters({ type: "", city: "", status: "", min_price: "", max_price: "" });
  const hasFilters = filters.type || filters.city || filters.status || filters.min_price || filters.max_price;

  return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope'] flex flex-col">
      <Header />
      <div className="h-1 sm:h-1.5 bg-[#FF6600]" />

      {/* Top bar */}
      <div className="bg-white border-b border-zinc-200 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/immobilier" className="p-2 text-zinc-500 hover:text-[#FF6600] transition-colors" data-testid="map-back-btn">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-['Oswald'] text-lg sm:text-xl font-bold uppercase tracking-tight text-black">Carte des annonces</h1>
              <p className="text-[10px] sm:text-xs text-zinc-500">
                {loading ? "Chargement..." : `${markers.length} annonce${markers.length !== 1 ? "s" : ""} sur la carte`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            data-testid="toggle-filters-btn"
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider border transition-colors ${
              showFilters || hasFilters ? "bg-[#FF6600] border-[#FF6600] text-white" : "border-zinc-300 text-zinc-600 hover:border-[#FF6600] hover:text-[#FF6600]"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtres
            {hasFilters && <span className="bg-white text-[#FF6600] text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">!</span>}
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="max-w-7xl mx-auto mt-3 p-4 bg-zinc-50 border border-zinc-200 rounded-lg" data-testid="map-filters-panel">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <select value={filters.type} onChange={e => setFilters(f => ({...f, type: e.target.value}))} data-testid="map-filter-type"
                className="px-3 py-2 border border-zinc-300 text-sm focus:outline-none focus:border-[#FF6600] bg-white">
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input value={filters.city} onChange={e => setFilters(f => ({...f, city: e.target.value}))} placeholder="Ville..." data-testid="map-filter-city"
                className="px-3 py-2 border border-zinc-300 text-sm focus:outline-none focus:border-[#FF6600]" />
              <select value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))} data-testid="map-filter-status"
                className="px-3 py-2 border border-zinc-300 text-sm focus:outline-none focus:border-[#FF6600] bg-white">
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input type="number" value={filters.min_price} onChange={e => setFilters(f => ({...f, min_price: e.target.value}))} placeholder="Prix min" data-testid="map-filter-min"
                className="px-3 py-2 border border-zinc-300 text-sm focus:outline-none focus:border-[#FF6600]" />
              <input type="number" value={filters.max_price} onChange={e => setFilters(f => ({...f, max_price: e.target.value}))} placeholder="Prix max" data-testid="map-filter-max"
                className="px-3 py-2 border border-zinc-300 text-sm focus:outline-none focus:border-[#FF6600]" />
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-2 flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-bold uppercase">
                <X className="w-3 h-3" /> Effacer les filtres
              </button>
            )}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: "calc(100vh - 200px)" }}>
        {loading && (
          <div className="absolute inset-0 z-[1000] bg-white/80 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
          </div>
        )}
        <MapContainer
          center={GUINEA_CENTER}
          zoom={7}
          className="w-full h-full"
          style={{ height: "100%", minHeight: "calc(100vh - 200px)" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.map(m => (
            m.latitude && m.longitude && (
              <Marker key={m.id} position={[m.latitude, m.longitude]} icon={createCustomIcon(m.type)}>
                <Popup>
                  <div className="min-w-[200px]">
                    {m.image && <img src={m.image} alt="" className="w-full h-24 object-cover rounded mb-2" />}
                    <p className="font-bold text-sm mb-1">{m.title}</p>
                    <p className="text-xs text-zinc-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {m.city}</p>
                    <p className="text-sm font-bold text-[#FF6600] mt-1">{formatPrice(m.price, m.currency)}</p>
                    <span className={`inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 ${
                      m.type === "achat" ? "bg-orange-100 text-orange-700" :
                      m.type === "vente" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    }`}>{m.type}</span>
                    <button
                      onClick={() => navigate(`/immobilier/${m.id}`)}
                      className="mt-2 w-full bg-[#FF6600] text-white text-xs font-bold py-1.5 hover:bg-[#CC5200] transition-colors"
                    >
                      Voir l'annonce
                    </button>
                  </div>
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm border border-zinc-200 rounded-lg px-3 py-2 shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Legende</p>
          <div className="flex items-center gap-3">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] font-bold uppercase">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

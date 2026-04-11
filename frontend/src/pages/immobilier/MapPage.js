import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import Header from "../../components/Header";
import Footer from "../../components/layout/Footer";
import api from "../../lib/api";
import { Loader2, ArrowLeft, MapPin, Filter, X, Bed, Maximize, Navigation, ChevronDown } from "lucide-react";
import { formatPrice, formatPriceConverted } from "../../components/immobilier/PropertyCard";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const TYPE_COLORS = { achat: "#FF6600", vente: "#16a34a", location: "#0ea5e9" };

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

const userPositionIcon = L.divIcon({
  className: "user-position-marker",
  html: `<div style="position:relative;width:20px;height:20px;">
    <div style="position:absolute;inset:-6px;background:rgba(66,133,244,0.15);border-radius:50%;animation:pulse-ring 2s ease-out infinite;"></div>
    <div style="width:20px;height:20px;background:#4285F4;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(66,133,244,.5);"></div>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const GUINEA_CENTER = [9.9456, -9.6966];
const RADIUS_OPTIONS = [
  { value: 1, label: "1 km" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 20, label: "20 km" },
];
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

function FlyToLocation({ position, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, zoom || 14, { duration: 1.5 });
  }, [map, position, zoom]);
  return null;
}

export default function MapPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ type: "", city: "", status: "", min_price: "", max_price: "", neighborhood: "", property_category: "" });

  // Geolocation state
  const [userPos, setUserPos] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [nearbyMode, setNearbyMode] = useState(false);
  const [nearbyResults, setNearbyResults] = useState([]);
  const [nearbyTotal, setNearbyTotal] = useState(0);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [radius, setRadius] = useState(5);
  const [flyTarget, setFlyTarget] = useState(null);
  const [flyZoom, setFlyZoom] = useState(14);
  const nearbyRef = useRef(null);
  const autoTriggered = useRef(false);

  // Auto-trigger geolocation if ?nearby=1
  useEffect(() => {
    if (searchParams.get("nearby") === "1" && !autoTriggered.current) {
      autoTriggered.current = true;
      handleGeolocate();
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMarkers = useCallback(() => {
    setLoading(true);
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    api.get("/properties/map/markers", { params })
      .then(r => setMarkers(r.data))
      .catch(() => setMarkers([]))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { if (!nearbyMode) fetchMarkers(); }, [fetchMarkers, nearbyMode]);

  const fetchNearby = useCallback((lat, lng, r) => {
    setNearbyLoading(true);
    api.get("/properties/nearby", { params: { lat, lng, radius_km: r, limit: 50 } })
      .then(res => {
        setNearbyResults(res.data.properties);
        setNearbyTotal(res.data.total);
        setMarkers(res.data.properties.map(p => ({
          ...p,
          image: p.image,
        })));
      })
      .catch(() => { setNearbyResults([]); setNearbyTotal(0); })
      .finally(() => setNearbyLoading(false));
  }, []);

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setGeoError("La geolocalisation n'est pas supportee par votre navigateur.");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPos({ lat: latitude, lng: longitude });
        setNearbyMode(true);
        setFlyTarget([latitude, longitude]);
        setFlyZoom(radius <= 5 ? 14 : radius <= 10 ? 13 : 12);
        fetchNearby(latitude, longitude, radius);
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === 1) {
          setGeoError("Veuillez autoriser la geolocalisation pour voir les biens autour de vous.");
        } else {
          setGeoError("Impossible d'obtenir votre position. Reessayez.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleRadiusChange = (r) => {
    setRadius(r);
    if (userPos) {
      setFlyZoom(r <= 1 ? 15 : r <= 5 ? 14 : r <= 10 ? 13 : 12);
      fetchNearby(userPos.lat, userPos.lng, r);
    }
  };

  const exitNearbyMode = () => {
    setNearbyMode(false);
    setUserPos(null);
    setNearbyResults([]);
    setNearbyTotal(0);
    setFlyTarget(null);
  };

  const clearFilters = () => setFilters({ type: "", city: "", status: "", min_price: "", max_price: "", neighborhood: "", property_category: "" });
  const hasFilters = Object.values(filters).some(Boolean);

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
              <h1 className="font-['Oswald'] text-lg sm:text-xl font-bold uppercase tracking-tight text-black">
                {nearbyMode ? "Biens autour de vous" : "Carte des annonces"}
              </h1>
              <p className="text-[10px] sm:text-xs text-zinc-500">
                {loading || nearbyLoading ? "Chargement..." :
                  nearbyMode ? `${nearbyTotal} bien${nearbyTotal !== 1 ? "s" : ""} dans un rayon de ${radius} km` :
                  `${markers.length} annonce${markers.length !== 1 ? "s" : ""} sur la carte`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!nearbyMode && (
              <button onClick={() => setShowFilters(v => !v)} data-testid="toggle-filters-btn"
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider border transition-colors ${
                  showFilters || hasFilters ? "bg-[#FF6600] border-[#FF6600] text-white" : "border-zinc-300 text-zinc-600 hover:border-[#FF6600] hover:text-[#FF6600]"
                }`}>
                <Filter className="w-4 h-4" /> <span className="hidden sm:inline">Filtres</span>
                {hasFilters && <span className="bg-white text-[#FF6600] text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">!</span>}
              </button>
            )}
            {nearbyMode && (
              <button onClick={exitNearbyMode} data-testid="exit-nearby-btn"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider border border-red-400 text-red-500 hover:bg-red-50 transition-colors">
                <X className="w-4 h-4" /> Quitter
              </button>
            )}
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && !nearbyMode && (
          <div className="max-w-7xl mx-auto mt-3 p-4 bg-zinc-50 border border-zinc-200 rounded-lg" data-testid="map-filters-panel">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <select value={filters.type} onChange={e => setFilters(f => ({...f, type: e.target.value}))} data-testid="map-filter-type"
                className="px-3 py-2 border border-zinc-300 text-sm focus:outline-none focus:border-[#FF6600] bg-white">
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input value={filters.city} onChange={e => setFilters(f => ({...f, city: e.target.value}))} placeholder="Ville..." data-testid="map-filter-city"
                className="px-3 py-2 border border-zinc-300 text-sm focus:outline-none focus:border-[#FF6600]" />
              <input value={filters.neighborhood} onChange={e => setFilters(f => ({...f, neighborhood: e.target.value}))} placeholder="Quartier..." data-testid="map-filter-neighborhood"
                className="px-3 py-2 border border-zinc-300 text-sm focus:outline-none focus:border-[#FF6600]" />
              <select value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))} data-testid="map-filter-status"
                className="px-3 py-2 border border-zinc-300 text-sm focus:outline-none focus:border-[#FF6600] bg-white">
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input type="number" value={filters.min_price} onChange={e => setFilters(f => ({...f, min_price: e.target.value}))} placeholder="Prix min" data-testid="map-filter-min"
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

      {/* Geolocation bar */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-3">
          <button onClick={handleGeolocate} disabled={geoLoading} data-testid="geolocate-btn"
            className={`flex items-center gap-2.5 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all w-full sm:w-auto justify-center ${
              nearbyMode
                ? "bg-[#4285F4] text-white shadow-lg shadow-blue-500/25"
                : "bg-[#FF6600] text-white hover:bg-[#CC5200] shadow-lg shadow-orange-500/25"
            }`}>
            {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            {geoLoading ? "Localisation..." : "Voir les biens autour de moi"}
          </button>

          {nearbyMode && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider whitespace-nowrap">Rayon :</span>
              <div className="flex gap-1.5">
                {RADIUS_OPTIONS.map(r => (
                  <button key={r.value} onClick={() => handleRadiusChange(r.value)} data-testid={`radius-${r.value}`}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                      radius === r.value
                        ? "bg-[#FF6600] text-white"
                        : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                    }`}>{r.label}</button>
                ))}
              </div>
            </div>
          )}

          {geoError && (
            <p className="text-amber-400 text-xs font-medium" data-testid="geo-error">{geoError}</p>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: "calc(100vh - 280px)" }}>
        {(loading || nearbyLoading) && (
          <div className="absolute inset-0 z-[1000] bg-white/80 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
          </div>
        )}
        <MapContainer center={GUINEA_CENTER} zoom={7} className="w-full h-full"
          style={{ height: "100%", minHeight: "calc(100vh - 280px)" }} scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {flyTarget && <FlyToLocation position={flyTarget} zoom={flyZoom} />}

          {/* User position blue dot */}
          {userPos && (
            <>
              <Marker position={[userPos.lat, userPos.lng]} icon={userPositionIcon} zIndexOffset={1000}>
                <Popup><span className="text-sm font-bold">Votre position</span></Popup>
              </Marker>
              <Circle center={[userPos.lat, userPos.lng]} radius={radius * 1000}
                pathOptions={{ color: "#4285F4", fillColor: "#4285F4", fillOpacity: 0.08, weight: 2, dashArray: "6 4" }} />
            </>
          )}

          {/* Property markers */}
          <MarkerClusterGroup chunkedLoading maxClusterRadius={60}
            iconCreateFunction={(cluster) => {
              const count = cluster.getChildCount();
              return L.divIcon({
                html: `<div style="background:#FF6600;color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);">${count}</div>`,
                className: "custom-cluster",
                iconSize: [36, 36],
              });
            }}>
            {markers.map(m => (
              m.latitude && m.longitude && (
                <Marker key={m.id} position={[m.latitude, m.longitude]} icon={createCustomIcon(m.type)}>
                  <Popup>
                    <div className="min-w-[220px] max-w-[260px]" data-testid="map-popup">
                      {m.image && <img src={m.image} alt="" className="w-full h-28 object-cover rounded mb-2" />}
                      <p className="font-bold text-sm mb-1 line-clamp-2">{m.title}</p>
                      <p className="text-xs text-zinc-500 flex items-center gap-1 mb-1">
                        <MapPin className="w-3 h-3" /> {m.city}{m.neighborhood ? ` - ${m.neighborhood}` : ""}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                        {m.bedrooms > 0 && <span className="flex items-center gap-0.5"><Bed className="w-3 h-3" /> {m.bedrooms}</span>}
                        {m.surface_area > 0 && <span className="flex items-center gap-0.5"><Maximize className="w-3 h-3" /> {m.surface_area}m&sup2;</span>}
                        {m.distance_km !== undefined && (
                          <span className="text-[#4285F4] font-bold">{m.distance_km < 1 ? `${Math.round(m.distance_km * 1000)}m` : `${m.distance_km} km`}</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-[#FF6600] mt-1">{formatPrice(m.price, m.currency)}</p>
                      {m.price_converted?.usd > 0 && (
                        <p className="text-[10px] text-zinc-400">{formatPriceConverted(m.price_converted)}</p>
                      )}
                      <span className={`inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 ${
                        m.type === "achat" ? "bg-orange-100 text-orange-700" :
                        m.type === "vente" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                      }`}>{m.type}</span>
                      <button onClick={() => navigate(`/immobilier/${m.id}`)} data-testid="popup-view-btn"
                        className="mt-2 w-full bg-[#FF6600] text-white text-xs font-bold py-1.5 hover:bg-[#CC5200] transition-colors">
                        Voir l'annonce
                      </button>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
          </MarkerClusterGroup>
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[2] bg-white/95 backdrop-blur-sm border border-zinc-200 rounded-lg px-3 py-2 shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Legende</p>
          <div className="flex flex-wrap items-center gap-3">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] font-bold uppercase">{type}</span>
              </div>
            ))}
            {userPos && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#4285F4]" />
                <span className="text-[10px] font-bold uppercase">Vous</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nearby results below the map */}
      {nearbyMode && (
        <div ref={nearbyRef} className="bg-white border-t-2 border-[#FF6600]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <h2 className="font-['Oswald'] text-xl sm:text-2xl font-bold uppercase tracking-tight text-black">
                  Biens autour de vous
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                  <strong className="text-[#FF6600]">{nearbyTotal}</strong> resultat{nearbyTotal !== 1 ? "s" : ""} dans un rayon de <strong>{radius} km</strong>
                </p>
              </div>
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="text-xs text-zinc-500 hover:text-[#FF6600] font-bold uppercase flex items-center gap-1">
                Carte <ChevronDown className="w-3 h-3 rotate-180" />
              </button>
            </div>

            {nearbyLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[#FF6600]" />
              </div>
            )}

            {!nearbyLoading && nearbyResults.length === 0 && (
              <div className="text-center py-12">
                <p className="font-['Oswald'] text-xl uppercase text-zinc-300">Aucun bien trouve</p>
                <p className="text-zinc-500 mt-2 text-xs sm:text-sm">Essayez d'augmenter le rayon de recherche.</p>
              </div>
            )}

            {!nearbyLoading && nearbyResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {nearbyResults.map(p => (
                  <NearbyPropertyCard key={p.id} property={p} onView={() => navigate(`/immobilier/${p.id}`)} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />

      {/* Pulse animation CSS */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function NearbyPropertyCard({ property: p, onView }) {
  return (
    <div className="group bg-white border border-zinc-200 hover:border-[#FF6600] transition-all hover:shadow-lg" data-testid={`nearby-card-${p.id}`}>
      <div className="relative h-40 sm:h-44 overflow-hidden bg-zinc-100">
        {p.image ? (
          <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-300">
            <MapPin className="w-10 h-10" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 ${
            p.type === "achat" ? "bg-[#FF6600] text-white" :
            p.type === "vente" ? "bg-green-600 text-white" : "bg-blue-500 text-white"
          }`}>{p.type}</span>
        </div>
        {p.distance_km !== undefined && (
          <div className="absolute top-2 right-2 bg-[#4285F4] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Navigation className="w-3 h-3" />
            {p.distance_km < 1 ? `${Math.round(p.distance_km * 1000)}m` : `${p.distance_km} km`}
          </div>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="font-bold text-sm line-clamp-1 mb-1 group-hover:text-[#FF6600] transition-colors">{p.title}</h3>
        <p className="text-xs text-zinc-500 flex items-center gap-1 mb-2">
          <MapPin className="w-3 h-3" /> {p.city}{p.neighborhood ? ` - ${p.neighborhood}` : ""}
        </p>
        <div className="flex items-center gap-3 text-xs text-zinc-500 mb-2">
          {p.bedrooms > 0 && <span className="flex items-center gap-0.5"><Bed className="w-3 h-3" /> {p.bedrooms} ch.</span>}
          {p.surface_area > 0 && <span className="flex items-center gap-0.5"><Maximize className="w-3 h-3" /> {p.surface_area}m&sup2;</span>}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-[#FF6600]">{formatPrice(p.price, p.currency)}</p>
            {p.price_converted?.usd > 0 && (
              <p className="text-[10px] text-zinc-400">{formatPriceConverted(p.price_converted)}</p>
            )}
          </div>
          <button onClick={onView} data-testid={`nearby-view-${p.id}`}
            className="bg-black text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 hover:bg-[#FF6600] transition-colors">
            Voir
          </button>
        </div>
      </div>
    </div>
  );
}

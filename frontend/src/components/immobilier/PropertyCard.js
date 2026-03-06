import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Eye, Phone, Bed, Bath, Maximize, Home, Heart, ShieldCheck, Bookmark } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import { toast } from "sonner";
import LikeButton from "../LikeButton";

const TYPE_CONFIG = {
  achat:    { label: "Achat",    bg: "bg-green-600",  text: "text-white" },
  vente:    { label: "Vente",    bg: "bg-[#FF6600]", text: "text-white" },
  location: { label: "Location", bg: "bg-blue-600",  text: "text-white" },
};

const STATUS_CONFIG = {
  reserve: { label: "Reserve",   bg: "bg-yellow-500" },
  vendu:   { label: "Vendu",     bg: "bg-red-600" },
  loue:    { label: "Loue",      bg: "bg-purple-600" },
};

const CATEGORY_LABELS = {
  villa: "Villa", appartement: "Appartement", terrain: "Terrain", bureau: "Bureau",
  commerce: "Commerce", entrepot: "Entrepot", maison: "Maison", studio: "Studio",
  duplex: "Duplex", autre: "Autre",
};

const LOGO = "/nimba-logo.png";

export function formatPrice(price, currency = "GNF") {
  if (currency === "GNF") return new Intl.NumberFormat("fr-FR").format(price) + " GNF";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(price);
}

export function formatPriceConverted(converted) {
  if (!converted || !converted.usd) return null;
  return `~${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(converted.usd)} / ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(converted.eur)}`;
}

export default function PropertyCard({ property }) {
  const { token } = useAuth();
  const typeConf = TYPE_CONFIG[property.type] || TYPE_CONFIG.vente;
  const statusConf = STATUS_CONFIG[property.status];
  const img = property.images?.[0];
  const catLabel = CATEGORY_LABELS[property.property_category] || "";
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get(`/saved-properties/${property.id}/status`).then(r => setIsSaved(r.data.is_saved)).catch(() => {});
  }, [property.id, token]);

  const toggleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) { toast.error("Connectez-vous pour sauvegarder."); return; }
    try {
      const res = await api.post(`/saved-properties/${property.id}`);
      setIsSaved(res.data.action === "saved");
      toast.success(res.data.action === "saved" ? "Ajoute aux favoris !" : "Retire des favoris.");
    } catch { toast.error("Erreur"); }
  };

  return (
    <div className="bg-white border border-zinc-200 hover:border-[#FF6600] hover:shadow-lg transition-all duration-200 flex flex-col group relative" data-testid="property-card">
      {/* Save/Favorite button */}
      {token && (
        <button onClick={toggleSave} data-testid={`save-property-${property.id}`}
          className={`absolute top-2 right-2 z-10 p-1.5 rounded-full transition-all duration-200 ${
            isSaved ? "bg-[#FF6600] text-white shadow-md" : "bg-black/60 text-white hover:bg-[#FF6600]"
          }`}>
          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-white" : ""}`} />
        </button>
      )}
      {/* Image */}
      <div className="relative aspect-[4/3] bg-zinc-100 overflow-hidden">
        {img ? (
          <img src={img} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy"
            onError={(e) => { e.target.style.display="none"; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
            <img src={LOGO} alt="" className="w-12 h-12 sm:w-16 sm:h-16 object-contain opacity-40" />
          </div>
        )}
        {/* Type badge */}
        <span className={`absolute top-1.5 sm:top-2 left-1.5 sm:left-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 sm:py-1 ${typeConf.bg} ${typeConf.text} font-['Manrope']`}>
          {typeConf.label}
        </span>
        {/* Category badge */}
        {catLabel && catLabel !== "Autre" && (
          <span className="absolute top-1.5 sm:top-2 left-[70px] sm:left-[80px] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-black/70 text-white font-['Manrope']">
            {catLabel}
          </span>
        )}
        {/* Verified badge */}
        {property.is_verified && (
          <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 bg-green-600 text-white rounded-sm" data-testid="verified-badge">
            <ShieldCheck className="w-2.5 h-2.5" /> Verifie
          </span>
        )}
        {/* Status badge */}
        {statusConf && (
          <span className={`absolute top-1.5 sm:top-2 right-1.5 sm:right-2 text-[10px] sm:text-xs font-bold uppercase px-1.5 sm:px-2 py-0.5 sm:py-1 ${statusConf.bg} text-white font-['Manrope']`}>
            {statusConf.label}
          </span>
        )}
      </div>

      <div className="p-3 sm:p-4 flex flex-col flex-1">
        {/* Price */}
        <p className="font-['Oswald'] text-lg sm:text-2xl font-bold text-[#FF6600] leading-tight" data-testid="property-price">
          {formatPrice(property.price, property.currency)}
        </p>
        {/* Converted price */}
        {property.price_converted?.usd > 0 && (
          <p className="text-[10px] text-zinc-400 font-['Manrope'] mb-1" data-testid="property-price-converted">
            {formatPriceConverted(property.price_converted)}
          </p>
        )}

        {/* Title */}
        <h3 className="font-['Oswald'] text-sm sm:text-base font-bold uppercase tracking-tight text-black line-clamp-2 mb-1.5" data-testid="property-title">
          {property.title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-zinc-500 text-[10px] sm:text-xs font-['Manrope'] mb-2" data-testid="property-location">
          <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
          <span className="truncate">{property.city}{property.neighborhood ? ` - ${property.neighborhood}` : ""}</span>
        </div>

        {/* Property details row */}
        <div className="flex items-center gap-3 text-zinc-500 text-[10px] sm:text-xs font-['Manrope'] mb-2 sm:mb-3 flex-wrap" data-testid="property-details">
          {property.surface_area > 0 && (
            <span className="flex items-center gap-1">
              <Maximize className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {property.surface_area} m²
            </span>
          )}
          {property.bedrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bed className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {property.bedrooms} ch.
            </span>
          )}
          {property.bathrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bath className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {property.bathrooms} sdb.
            </span>
          )}
          {catLabel && catLabel !== "Autre" && (
            <span className="flex items-center gap-1">
              <Home className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {catLabel}
            </span>
          )}
        </div>

        <div className="mt-auto flex gap-1.5 sm:gap-2 pt-2 sm:pt-3 border-t border-zinc-100">
          <Link
            to={`/immobilier/${property.id}`}
            data-testid="property-view-btn"
            className="flex-1 text-center bg-black text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider py-1.5 sm:py-2 hover:bg-[#FF6600] transition-colors font-['Manrope']"
          >
            Voir details
          </Link>
          <a
            href={`tel:${property.seller_phone}`}
            data-testid="property-call-btn"
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 border border-zinc-300 text-[10px] sm:text-xs font-bold text-zinc-600 hover:border-[#FF6600] hover:text-[#FF6600] transition-colors font-['Manrope']"
          >
            <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> <span className="hidden sm:inline">Contacter</span>
          </a>
          <LikeButton
            type="property"
            id={property.id}
            initialCount={property.likes_count || 0}
            initialLikedBy={property.liked_by || []}
            className="px-2 py-1.5"
          />
        </div>
      </div>
    </div>
  );
}

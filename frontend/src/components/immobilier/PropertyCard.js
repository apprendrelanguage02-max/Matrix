import { Link } from "react-router-dom";
import { MapPin, Eye, Phone, Tag } from "lucide-react";

const TYPE_CONFIG = {
  achat:    { label: "Achat",    bg: "bg-green-600",  text: "text-white" },
  vente:    { label: "Vente",    bg: "bg-[#FF6600]", text: "text-white" },
  location: { label: "Location", bg: "bg-blue-600",  text: "text-white" },
};

const STATUS_CONFIG = {
  reserve: { label: "Réservé",   bg: "bg-yellow-500" },
  vendu:   { label: "Vendu",     bg: "bg-red-600" },
  loue:    { label: "Loué",      bg: "bg-purple-600" },
};

const LOGO = "https://customer-assets.emergentagent.com/job_2b66c898-0ce0-4fc9-a685-24a9ac754e60/artifacts/p7stxwf9_ChatGPT%20Image%20Feb%2017%2C%202026%2C%2005_57_11%20PM.png";

export function formatPrice(price, currency = "GNF") {
  if (currency === "GNF") return new Intl.NumberFormat("fr-FR").format(price) + " GNF";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(price);
}

export default function PropertyCard({ property }) {
  const typeConf = TYPE_CONFIG[property.type] || TYPE_CONFIG.vente;
  const statusConf = STATUS_CONFIG[property.status];
  const img = property.images?.[0];

  return (
    <div className="bg-white border border-zinc-200 hover:border-[#FF6600] hover:shadow-lg transition-all duration-200 flex flex-col" data-testid="property-card">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-zinc-100 overflow-hidden">
        {img ? (
          <img src={img} alt={property.title} className="w-full h-full object-cover" loading="lazy"
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
        {/* Status badge */}
        {statusConf && (
          <span className={`absolute top-1.5 sm:top-2 right-1.5 sm:right-2 text-[10px] sm:text-xs font-bold uppercase px-1.5 sm:px-2 py-0.5 sm:py-1 ${statusConf.bg} text-white font-['Manrope']`}>
            {statusConf.label}
          </span>
        )}
      </div>

      <div className="p-3 sm:p-4 flex flex-col flex-1">
        {/* Price */}
        <p className="font-['Oswald'] text-lg sm:text-2xl font-bold text-[#FF6600] leading-tight mb-1">
          {formatPrice(property.price, property.currency)}
        </p>

        {/* Title */}
        <h3 className="font-['Oswald'] text-sm sm:text-base font-bold uppercase tracking-tight text-black line-clamp-2 mb-1.5 sm:mb-2">
          {property.title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-zinc-500 text-[10px] sm:text-xs font-['Manrope'] mb-2 sm:mb-3">
          <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
          <span className="truncate">{property.city}{property.neighborhood ? ` · ${property.neighborhood}` : ""}</span>
        </div>

        <div className="mt-auto flex gap-1.5 sm:gap-2 pt-2 sm:pt-3 border-t border-zinc-100">
          <Link
            to={`/immobilier/${property.id}`}
            className="flex-1 text-center bg-black text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider py-1.5 sm:py-2 hover:bg-[#FF6600] transition-colors font-['Manrope']"
          >
            Voir détails
          </Link>
          <a
            href={`tel:${property.seller_phone}`}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 border border-zinc-300 text-[10px] sm:text-xs font-bold text-zinc-600 hover:border-[#FF6600] hover:text-[#FF6600] transition-colors font-['Manrope']"
          >
            <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> <span className="hidden sm:inline">Contacter</span>
          </a>
        </div>
      </div>
    </div>
  );
}

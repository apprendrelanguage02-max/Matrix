// Catégories prédéfinies — synchronisées avec le backend
export const CATEGORIES = [
  "Actualité",
  "Politique",
  "Sport",
  "Technologie",
  "Économie",
];

// Couleurs associées à chaque catégorie
export const CATEGORY_COLORS = {
  "Actualité":    { bg: "bg-[#FF6600]",    text: "text-white" },
  "Politique":    { bg: "bg-zinc-800",      text: "text-white" },
  "Sport":        { bg: "bg-emerald-600",   text: "text-white" },
  "Technologie":  { bg: "bg-sky-600",       text: "text-white" },
  "Économie":     { bg: "bg-amber-500",     text: "text-white" },
};

export function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || { bg: "bg-zinc-500", text: "text-white" };
}

export function slugify(cat) {
  return encodeURIComponent(cat);
}

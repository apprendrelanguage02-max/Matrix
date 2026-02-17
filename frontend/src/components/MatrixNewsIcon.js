/**
 * MatrixNewsIcon — Icône SVG custom pour Matrix News
 * Stylisé : signal d'onde + initiales MN
 * Couleurs adaptées automatiquement via `color` prop
 */
export default function MatrixNewsIcon({ className = "w-6 h-6", color = "#FF6600" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-label="Matrix News"
    >
      {/* Signal waves — fond */}
      <path
        d="M6 20 C6 11.16 12.5 4 20 4 C27.5 4 34 11.16 34 20"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M10 20 C10 13.37 14.5 8 20 8 C25.5 8 30 13.37 30 20"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M14 20 C14 15.58 16.69 12 20 12 C23.31 12 26 15.58 26 20"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Point central */}
      <circle cx="20" cy="20" r="2.5" fill={color} />
      {/* Barre horizontale inférieure */}
      <rect x="8" y="26" width="24" height="2" rx="1" fill={color} opacity="0.5" />
      {/* Initiales MN */}
      <text
        x="20"
        y="36.5"
        textAnchor="middle"
        fontFamily="'Oswald', sans-serif"
        fontSize="7"
        fontWeight="700"
        fill={color}
        letterSpacing="1"
      >
        MN
      </text>
    </svg>
  );
}

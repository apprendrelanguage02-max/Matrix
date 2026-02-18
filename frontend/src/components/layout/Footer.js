import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Facebook, Twitter, Instagram, Youtube } from "lucide-react";

const LOGO = "https://customer-assets.emergentagent.com/job_2b66c898-0ce0-4fc9-a685-24a9ac754e60/artifacts/p7stxwf9_ChatGPT%20Image%20Feb%2017%2C%202026%2C%2005_57_11%20PM.png";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-black text-zinc-400 border-t border-zinc-800 font-['Manrope']">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">

          {/* Colonne 1 : Marque */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4 group">
              <img src={LOGO} alt="Matrix News" className="w-9 h-9 sm:w-10 sm:h-10 object-contain" />
              <span className="font-['Oswald'] text-base sm:text-lg font-bold uppercase tracking-widest text-white group-hover:text-[#FF6600] transition-colors">
                Matrix News
              </span>
            </Link>
            <p className="text-xs sm:text-sm leading-relaxed mb-4 sm:mb-5 text-zinc-500">
              La plateforme média de référence en Guinée. Actualités, immobilier et services pour la communauté GIMO.
            </p>
            <div className="flex items-center gap-2 sm:gap-3">
              <a href="#" aria-label="Facebook" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-500 hover:border-[#FF6600] hover:text-[#FF6600] transition-all">
                <Facebook className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </a>
              <a href="#" aria-label="Twitter" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-500 hover:border-[#FF6600] hover:text-[#FF6600] transition-all">
                <Twitter className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </a>
              <a href="#" aria-label="Instagram" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-500 hover:border-[#FF6600] hover:text-[#FF6600] transition-all">
                <Instagram className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </a>
              <a href="#" aria-label="YouTube" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-500 hover:border-[#FF6600] hover:text-[#FF6600] transition-all">
                <Youtube className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </a>
            </div>
          </div>

          {/* Colonne 2 : Rubriques */}
          <div>
            <h3 className="font-['Oswald'] text-xs sm:text-sm font-bold uppercase tracking-widest text-white mb-3 sm:mb-4">
              Actualités
            </h3>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              {[
                { label: "Toutes les news", to: "/" },
                { label: "Actualité", to: "/categorie/actualite" },
                { label: "Politique", to: "/categorie/politique" },
                { label: "Sport", to: "/categorie/sport" },
                { label: "Technologie", to: "/categorie/technologie" },
                { label: "Économie", to: "/categorie/economie" },
              ].map(({ label, to }) => (
                <li key={to}>
                  <Link to={to} className="hover:text-[#FF6600] hover:translate-x-1 inline-block transition-all duration-150">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Colonne 3 : Immobilier */}
          <div>
            <h3 className="font-['Oswald'] text-xs sm:text-sm font-bold uppercase tracking-widest text-white mb-3 sm:mb-4">
              Immobilier GIMO
            </h3>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              {[
                { label: "Toutes les annonces", to: "/immobilier" },
                { label: "Vente", to: "/immobilier?type=vente" },
                { label: "Achat", to: "/immobilier?type=achat" },
                { label: "Location", to: "/immobilier?type=location" },
                { label: "Publier une annonce", to: "/immobilier/publier" },
                { label: "Mes annonces", to: "/mes-annonces" },
              ].map(({ label, to }) => (
                <li key={to}>
                  <Link to={to} className="hover:text-[#FF6600] hover:translate-x-1 inline-block transition-all duration-150">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Colonne 4 : Contact */}
          <div className="col-span-2 sm:col-span-1">
            <h3 className="font-['Oswald'] text-xs sm:text-sm font-bold uppercase tracking-widest text-white mb-3 sm:mb-4">
              Contact
            </h3>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <li className="flex items-start gap-2 sm:gap-2.5">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF6600] mt-0.5 flex-shrink-0" />
                <span>Conakry, Guinée<br />
                  <span className="text-zinc-600 text-[10px] sm:text-xs">Kaloum, Commune de Conakry</span>
                </span>
              </li>
              <li className="flex items-center gap-2 sm:gap-2.5">
                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF6600] flex-shrink-0" />
                <a href="tel:+224622000000" className="hover:text-[#FF6600] transition-colors">
                  +224 622 000 000
                </a>
              </li>
              <li className="flex items-center gap-2 sm:gap-2.5">
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF6600] flex-shrink-0" />
                <a href="mailto:contact@matrixnews.gn" className="hover:text-[#FF6600] transition-colors break-all">
                  contact@matrixnews.gn
                </a>
              </li>
            </ul>

            <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-zinc-800">
              <Link to="/connexion" className="inline-block bg-[#FF6600] text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider px-3 sm:px-4 py-2 hover:bg-[#CC5200] transition-colors">
                Espace rédacteur
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 text-[10px] sm:text-xs">
          <p className="text-zinc-600 text-center sm:text-left">
            &copy; {year} Matrix News — Tous droits réservés · Conakry, Guinée
          </p>
          <div className="flex items-center gap-2 sm:gap-4 text-zinc-600 flex-wrap justify-center">
            <a href="#" className="hover:text-zinc-400 transition-colors">Politique de confidentialité</a>
            <span className="hidden sm:inline">·</span>
            <a href="#" className="hover:text-zinc-400 transition-colors">Mentions légales</a>
            <span className="hidden sm:inline">·</span>
            <a href="#" className="hover:text-zinc-400 transition-colors">CGU</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

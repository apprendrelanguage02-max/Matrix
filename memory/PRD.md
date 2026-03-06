# Matrix News / GIMO - Product Requirements Document

## Original Problem Statement
Plateforme de news et immobilier guineenne avec backend FastAPI et frontend React.

## Tech Stack
- **Backend**: FastAPI, MongoDB (Motor), Pydantic, JWT, WebSockets, bcrypt
- **Frontend**: React 19, TailwindCSS, Shadcn/UI, Leaflet, react-leaflet-cluster, Sonner, Lucide
- **3rd Party**: Resend (emails OTP), Leaflet/React-Leaflet (cartes)

## Core Features - All Implemented
- [x] Auth complete (OTP email, JWT, roles)
- [x] Dashboard admin (demandes, CSV, temps reel)
- [x] Newsroom / Editeur blocs (text, image, video, quote, alert, table)
- [x] Section immobiliere complete (devises GNF/USD/EUR, clusters carte, filtres, estimation prix, alertes recherche)
- [x] Favoris unifies (articles + annonces + procedures) avec onglets et boutons Bookmark sur chaque carte
- [x] Profils publics agents avec stats
- [x] Badges verification, heatmap prix, recherche quartier
- [x] Favicon Nimba, code nettoye de references emergent
- [x] Formulaire publication annonces corrige (payload propre, gestion erreurs Pydantic)
- [x] Z-index carte corrige (passe sous header et menu)
- [x] Notifications temps reel, recherche globale, pull-to-refresh

## Architecture
```
/app/backend/ - routes/ (auth, articles, properties, procedures, admin, messages), models/, middleware/
/app/frontend/ - components/ (immobilier/, layout/, ui/), pages/ (immobilier/*, procedures/*, admin/*), context/, lib/
```

## Known Issues
- Rate limiting login retourne 520 au lieu de 429 (infra, low priority)

## Enhancement Ideas
- [ ] Visites video, Dashboard analytics agents, Messagerie interne, Partage social, SEO meta tags

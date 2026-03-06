# Matrix News / GIMO - Product Requirements Document

## Original Problem Statement
Plateforme de news et immobilier guineenne avec backend FastAPI et frontend React.

## Tech Stack
- **Backend**: FastAPI, MongoDB (Motor), Pydantic, JWT, WebSockets, bcrypt
- **Frontend**: React 19, TailwindCSS, Shadcn/UI, Leaflet, react-leaflet-cluster, Sonner, Lucide
- **3rd Party**: Resend (emails OTP), Leaflet/React-Leaflet (cartes)

## Core Features Implemented
- [x] Auth complete (OTP email, JWT, roles: admin/auteur/agent/visiteur)
- [x] Dashboard admin (demandes, CSV, suppression, temps reel)
- [x] Newsroom / Editeur d'articles base sur blocs (text, image, video, quote, alert, table)
- [x] Page detail article avec rendu blocs
- [x] Section immobiliere complete (devises GNF/USD/EUR, cartes enrichies, clusters, filtres, popups)
- [x] Favoris unifies (articles + annonces + procedures) avec onglets
- [x] Boutons de sauvegarde directement sur les cartes (articles, annonces, procedures)
- [x] Profils publics agents avec stats
- [x] Alertes de recherche immobiliere (notifications auto)
- [x] Estimation de prix (fourchette + fiabilite)
- [x] Badges verification anti-arnaque
- [x] Carte interactive (clusters, filtres, z-index corrige)
- [x] Favicon Nimba logo
- [x] Code nettoye de toute reference emergent
- [x] Formulaire publication annonces corrige (payload propre)
- [x] Notifications temps reel, recherche globale, pull-to-refresh

## Architecture
```
/app/
├── backend/
│   ├── routes/ (auth, articles, properties, procedures, admin, messages, notifications, upload, payments, server)
│   ├── models/ (user, article, property, procedure)
│   ├── middleware/ (auth)
│   └── config.py, database.py, utils.py
└── frontend/
    ├── src/
    │   ├── components/ (BlockEditor, Header, LikeButton, ArticleCard, ChatHelp, immobilier/, layout/, ui/)
    │   ├── context/ (AuthContext, WebSocketContext)
    │   ├── pages/ (Home, ArticleDetail, ArticleForm, Dashboard, SavedArticles(unified), immobilier/*, procedures/*, admin/*)
    │   └── lib/ (api, categories, contentRenderer, utils)
    └── public/ (nimba-logo.png, favicon.ico, nimba-192.png)
```

## Known Issues
- Rate limiting login retourne 520 au lieu de 429 (infra, low priority)

## Enhancement Ideas
- [ ] Visites video
- [ ] Dashboard analytics agents
- [ ] Messagerie interne agent-client
- [ ] Partage social articles/annonces
- [ ] SEO meta tags dynamiques

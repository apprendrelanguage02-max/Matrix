# Matrix News / GIMO - Product Requirements Document

## Original Problem Statement
Plateforme de news et immobilier guineenne avec un backend FastAPI et un frontend React. L'application inclut:
- Systeme d'authentification avec OTP email et gestion des roles (admin, auteur, agent, visiteur)
- Dashboard administrateur avec gestion des demandes en temps reel
- Section "Newsroom" avec editeur d'articles base sur des blocs modulaires
- Section immobiliere complete avec carte interactive, favoris, profils agents, alertes, estimation
- Notifications temps reel via WebSocket
- Systeme de favoris/sauvegarde

## Tech Stack
- **Backend**: FastAPI, MongoDB (Motor), Pydantic, JWT, WebSockets, bcrypt
- **Frontend**: React 19, TailwindCSS, Shadcn/UI, Leaflet, react-leaflet-cluster, Sonner, Lucide icons
- **3rd Party**: Resend (emails OTP), Leaflet/React-Leaflet (cartes), react-leaflet-cluster (clusters)

## User Personas
1. **Visiteur** - Consulte articles et annonces, estimation de prix
2. **Auteur** - Cree/publie des articles via Newsroom
3. **Agent Immobilier** - Publie des annonces immobilieres
4. **Admin** - Gere utilisateurs, demandes de role, contenu

## Core Features Implemented

### Authentification & Admin
- [x] Auth complete (OTP email, JWT, roles)
- [x] Dashboard admin (gestion demandes, CSV, suppression, temps reel)

### Newsroom / Articles
- [x] Editeur d'articles base sur blocs (text, image, video, quote, alert, table)
- [x] Page de detail article avec rendu des blocs (BUG CORRIGE - Feb 2026)
- [x] Recherche globale
- [x] Systeme de favoris/sauvegarde articles
- [x] Compteurs temps reel (vues, likes)

### Immobilier (P1 - COMPLETE - Mar 2026)
- [x] Standardisation devises (GNF + conversions USD/EUR)
- [x] Cartes d'annonces enrichies (quartier, surface, chambres, salles de bain, type de bien, badge verifie)
- [x] Carte interactive amelioree (clusters MarkerCluster, filtres integres, apercu au clic sur marqueur)
- [x] Recherche par quartier (filtre + endpoint /neighborhoods)
- [x] Page "Mes favoris" (/immobilier/favoris)
- [x] Profils publics agents (/agent/:agentId avec stats)
- [x] Simplification du formulaire de publication (champs categorie, chambres, SDB, surface)
- [x] Formulaire de publication avec nouveaux champs

### Future Features (COMPLETE - Mar 2026)
- [x] Systeme de notifications recherches (alertes /immobilier/alertes)
- [x] Outil estimation de prix (/immobilier/estimation avec fourchette + fiabilite)
- [x] Badges de verification "anti-arnaque" (champ is_verified + badge ShieldCheck)
- [x] Heatmap des prix immobiliers (endpoint /properties/heatmap)

### UX Temps Reel
- [x] Notifications temps reel (WebSocket)
- [x] Pull-to-refresh mobile
- [x] Toasts pour nouveaux articles/annonces
- [x] Mise a jour instantanee vues/likes

## Architecture
```
/app/
├── backend/
│   ├── routes/
│   │   ├── admin.py, auth.py
│   │   ├── articles.py (CRUD + blocs + autosave + stats)
│   │   ├── properties.py (CRUD + map/markers + neighborhoods + heatmap + estimate + saved + alerts + agents)
│   │   ├── messages.py (WebSocket + notifications)
│   │   └── server.py (recherche globale)
│   ├── models/ (user, article, property)
│   ├── middleware/ (auth)
│   └── config.py, database.py, utils.py
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── immobilier/ (PropertyCard, PropertyFilters, PropertyMap)
    │   │   ├── BlockEditor.js, Header.js, LikeButton.js
    │   │   └── ui/ (shadcn)
    │   ├── context/ (AuthContext, WebSocketContext)
    │   ├── pages/
    │   │   ├── immobilier/ (ImmobilierPage, PropertyDetailPage, PropertyFormPage, MapPage, FavoritesPage, AgentProfilePage, SearchAlertsPage, PriceEstimatePage, AgentDashboardPage)
    │   │   └── ArticleDetailPage, ArticleFormPage, etc.
    │   └── lib/ (api, categories, contentRenderer, utils)
    └── ...
```

## Known Issues
- Rate limiting login retourne 520 au lieu de 429 (infra, low priority)
- React hydration warning: span in select (dev tooling only, no production impact)

## Remaining / Enhancement Ideas
- [ ] Visites video (integration video player avancee)
- [ ] Dashboard analytics avance pour agents
- [ ] Systeme de messagerie interne agent-client
- [ ] Partage social des articles et annonces
- [ ] SEO optimization (meta tags dynamiques)

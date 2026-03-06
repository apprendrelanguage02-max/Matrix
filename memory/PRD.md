# Matrix News / GIMO - Product Requirements Document

## Original Problem Statement
Platform de news et immobilier guineenne avec un backend FastAPI et un frontend React. L'application inclut:
- Systeme d'authentification avec OTP email et gestion des roles (admin, auteur, agent, visiteur)
- Dashboard administrateur avec gestion des demandes en temps reel
- Section "Newsroom" avec editeur d'articles base sur des blocs modulaires
- Section immobiliere avec carte interactive (Leaflet)
- Notifications temps reel via WebSocket
- Systeme de favoris/sauvegarde d'articles

## Tech Stack
- **Backend**: FastAPI, MongoDB (Motor), Pydantic, JWT, WebSockets, bcrypt
- **Frontend**: React, TailwindCSS, Shadcn/UI, Leaflet, Sonner, Lucide icons
- **3rd Party**: Resend (emails OTP), Leaflet/React-Leaflet (cartes)

## User Personas
1. **Visiteur** - Consulte articles et annonces
2. **Auteur** - Cree/publie des articles via Newsroom
3. **Agent Immobilier** - Publie des annonces immobilieres
4. **Admin** - Gere utilisateurs, demandes de role, contenu

## Core Features Implemented
- [x] Authentification complete (OTP email, JWT, roles)
- [x] Dashboard admin (gestion demandes, CSV, suppression, temps reel)
- [x] Newsroom / Editeur d'articles base sur blocs (text, image, video, quote, alert, table)
- [x] Page de detail article avec rendu des blocs (BUG CORRIGE - Feb 2026)
- [x] Carte interactive immobiliere (Leaflet)
- [x] Notifications temps reel (WebSocket)
- [x] Recherche globale
- [x] Pull-to-refresh mobile
- [x] Systeme de favoris/sauvegarde articles
- [x] Compteurs temps reel (vues, likes)

## P0 - Done
- [x] Bug critique: Affichage contenu articles (blocs) sur page publique - CORRIGE et TESTE (Feb 2026)
- [x] Test complet Newsroom - VALIDE (iteration 20)

## P1 - Upcoming (Refonte Immobilier)
- [ ] Standardisation devises (GNF + conversions USD/EUR)
- [ ] Amelioration cartes d'annonces (quartier, surface, chambres, type de bien)
- [ ] Carte interactive amelioree (clusters, filtres, apercu au clic)
- [ ] Page "Mes favoris" immobilier
- [ ] Profils publics agents immobiliers
- [ ] Simplification formulaire publication

## P2 - Future/Backlog
- [ ] Systeme de notifications recherches immobilieres
- [ ] Outil estimation de prix
- [ ] Recherche par quartier
- [ ] Visites video
- [ ] Badges verification "anti-arnaque"
- [ ] Heatmap prix immobiliers

## Known Issues
- Rate limiting login retourne 520 au lieu de 429 (infra, low priority)
- Console warning React hydration (span in select) - cosmetic only

## Architecture
```
/app/
├── backend/
│   ├── routes/ (auth, articles, properties, procedures, payments, upload, admin, notifications, messages)
│   ├── models/ (user, article)
│   ├── middleware/ (auth)
│   ├── config.py, database.py, server.py, utils.py
│   └── tests/
└── frontend/
    ├── src/
    │   ├── components/ (BlockEditor, Header, LikeButton, ArticleCard, immobilier/, layout/, ui/)
    │   ├── context/ (AuthContext, WebSocketContext)
    │   ├── pages/ (Home, ArticleDetail, ArticleForm, Dashboard, immobilier/, admin/, procedures/)
    │   └── lib/ (api, categories, contentRenderer, utils)
    └── ...
```

# Matrix News - PRD (Product Requirements Document)

## Original Problem Statement
Application de plateforme full-stack (React/FastAPI/MongoDB) pour Matrix News, une plateforme combinant:
- **News/Articles**: Publication et lecture d'articles de presse
- **Immobilier**: Annonces immobilieres avec geolocalisation, carte interactive, estimation de prix
- **Procedures administratives**: Guide complet pour les demarches administratives (visa, documents, etc.)

## Architecture
- **Frontend**: React, TailwindCSS, Shadcn/UI, @dnd-kit, React-Leaflet
- **Backend**: FastAPI, MongoDB, Pydantic
- **Storage**: AWS S3 / Emergent Object Store (cloud persistant)
- **Auth**: OTP par email (Resend) + login mot de passe
- **Deployment**: Kubernetes container

## Key API Endpoints
- Auth: `/api/auth/send-otp`, `/api/auth/verify-otp`, `/api/auth/login`, `/api/auth/me`
- Articles: CRUD `/api/articles`
- Properties: CRUD `/api/properties`, `/api/properties/nearby`
- Procedures: CRUD `/api/procedures`, `/api/procedures/{id}/files`, `/api/procedures/files/{id}/download`
- Upload: `/api/upload` (retourne URLs cloud relatives)
- Admin: `/api/admin/*`

## Implemented Features
- [x] Systeme d'articles (CRUD, categories, likes, favoris)
- [x] Annonces immobilieres (CRUD, recherche, carte, geolocalisation)
- [x] Estimation de prix immobilier
- [x] Module de procedures v2 (CRUD, etapes drag-and-drop, fichiers cloud)
- [x] Dashboard admin procedures (stats, config, graphiques) — responsive mobile
- [x] Geolocalisation "Biens autour de moi"
- [x] Badges anti-arnaque (verification admin)
- [x] SEO (robots.txt, sitemap.xml, meta-tags)
- [x] Migration stockage cloud (images persistantes, URLs relatives)
- [x] Correction rate limiting (429)
- [x] Support video/liens dans procedures (Mars 2026)
- [x] Auth Gate sur pages detail immobilier et procedures (Mars 2026)
- [x] Correction telechargement fichiers procedures (Mars 2026)
- [x] Menu avatar scrollable sur mobile (Mars 2026)
- [x] Fleche menu avatar alignee avec point vert (Mars 2026)
- [x] Dashboard procedures responsive mobile — sidebar collapsible (Mars 2026)
- [x] Images persistantes via cloud storage avec URLs relatives (Mars 2026)
- [x] Correction caracteres speciaux (accents, apostrophes) — plus de HTML entities (Mars 2026)
- [x] Editeur d'articles : texte s'ecrit normalement (LTR, curseur stable) (Mars 2026)
- [x] Notifications admin : chargement robuste avec gestion d'erreurs (Mars 2026)

## Pending / Backlog
- [ ] Systeme de notifications pour nouvelles annonces
- [ ] Visites video natives dans les annonces
- [ ] Heatmap des prix immobiliers sur la carte

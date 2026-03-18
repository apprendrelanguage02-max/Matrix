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
- **Auth**: OTP email (Resend) + Password, SHA-256 hashed OTP, rate limiting
- **Deployment**: Kubernetes container

## Key API Endpoints
- Auth: `/api/auth/register`, `/api/auth/send-otp`, `/api/auth/verify-otp`, `/api/auth/login`, `/api/auth/me`
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
- [x] Support video/liens dans procedures
- [x] Auth Gate sur pages detail immobilier et procedures
- [x] Correction telechargement fichiers procedures
- [x] Menu avatar scrollable + fleche alignee
- [x] Dashboard procedures responsive mobile
- [x] Correction caracteres speciaux + editeur d'articles
- [x] **Systeme OTP securise** (Mars 2026):
  - Inscription en 3 etapes: Register -> Send OTP -> Verify OTP
  - OTP 6 chiffres, hache SHA-256, expire 5 min
  - 5 tentatives max par code, rate limiting 5 req/min
  - Statuts: pending_verification -> active / pending (pro) -> suspended
  - Champ full_name, eligible_trusted_badge pour agents/auteurs
  - Pages: /inscription, /verification, /connexion
  - Vue admin avec filtres verified/unverified/pending
  - Succes animation + redirect dashboard personnalise

## Pending / Backlog
- [ ] Systeme de notifications pour nouvelles annonces
- [ ] Visites video natives dans les annonces
- [ ] Heatmap des prix immobiliers sur la carte

# Matrix News - PRD (Product Requirements Document)

## Original Problem Statement
Application de plateforme full-stack (React/FastAPI/MongoDB) pour Matrix News, une plateforme combinant:
- **News/Articles**: Publication et lecture d'articles de presse
- **Immobilier**: Annonces immobilieres avec geolocalisation, carte interactive, estimation de prix
- **Procedures administratives**: Guide complet pour les demarches administratives (visa, documents, etc.)

## Core Requirements
1. Systeme d'authentification (OTP par email via Resend)
2. Publication et gestion d'articles
3. Annonces immobilieres avec recherche avancee, carte Leaflet, geolocalisation
4. Module de procedures administratives avec constructeur d'etapes (drag-and-drop)
5. Dashboard admin complet
6. Stockage cloud (AWS S3) pour fichiers et images
7. Systeme de messagerie entre utilisateurs
8. SEO et branding (matrixnews.org)

## Architecture
- **Frontend**: React, TailwindCSS, Shadcn/UI, @dnd-kit, React-Leaflet
- **Backend**: FastAPI, MongoDB, Pydantic
- **Storage**: AWS S3 via boto3
- **Auth**: OTP par email (Resend)
- **Deployment**: Kubernetes container

## Key API Endpoints
- Auth: `/api/auth/send-otp`, `/api/auth/verify-otp`, `/api/auth/me`
- Articles: CRUD `/api/articles`
- Properties: CRUD `/api/properties`, `/api/properties/nearby`
- Procedures: CRUD `/api/procedures`, `/api/procedures/{id}/files`, `/api/procedures/files/{id}/download`
- Upload: `/api/upload`
- Admin: `/api/admin/*`

## Implemented Features (Complete)
- [x] Systeme d'articles (CRUD, categories, likes, favoris)
- [x] Annonces immobilieres (CRUD, recherche, carte, geolocalisation)
- [x] Estimation de prix immobilier
- [x] Module de procedures v2 (CRUD, etapes drag-and-drop, fichiers cloud)
- [x] Dashboard admin procedures (stats, config, graphiques)
- [x] Geolocalisation "Biens autour de moi"
- [x] Badges anti-arnaque (verification admin)
- [x] SEO (robots.txt, sitemap.xml, meta-tags)
- [x] Migration stockage cloud
- [x] Correction rate limiting (429)
- [x] **Support video/liens dans procedures** (Mars 2026)
- [x] **Auth Gate** sur pages detail immobilier et procedures (Mars 2026)
- [x] **Correction telechargement fichiers** procedures (Mars 2026)

## Pending / Backlog
- [ ] Systeme de notifications pour nouvelles annonces
- [ ] Visites video natives dans les annonces
- [ ] Heatmap des prix immobiliers sur la carte

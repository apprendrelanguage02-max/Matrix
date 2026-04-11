# Matrix News - Product Requirements Document

## Original Problem Statement
Plateforme full-stack Matrix News : gestion d'articles, d'annonces immobilières avec cartes interactives Leaflet, de procédures administratives avec drag-and-drop, de fiches PDF professionnelles (ReportLab), et un système d'authentification OTP (via Resend).

## Core Requirements
- Interface premium avec couleurs Orange (#FF6600) / Blanc / Noir
- Logo PDF : `Matrix.png`, Logo site : `nimba-logo.png`
- Composants React modulaires (< 300 lignes idéalement)
- Authentification OTP sécurisée via Resend
- Stockage cloud S3 pour images/fichiers
- Cartes interactives Leaflet
- **Tokens d'auth stockés en cookies httpOnly (sécurité XSS)**

## Tech Stack
- **Frontend**: React, TailwindCSS, lucide-react, @dnd-kit (drag-drop)
- **Backend**: FastAPI, MongoDB (Motor), Pydantic
- **Services**: ReportLab (PDF), Resend (Emails), AWS S3 (Stockage), Leaflet (Maps)
- **Sécurité**: Cookies httpOnly pour les tokens JWT, HTTPS

## What's Been Implemented

### Completed Features
- [x] Système d'authentification OTP avec Resend
- [x] Module immobilier complet (CRUD, cartes, devises, géolocalisation)
- [x] Module procédures V2 (drag-drop, fichiers, vidéos, liens)
- [x] Module fiches PDF premium (ReportLab, sauts de ligne, frais/documents par étape)
- [x] Tableau de bord admin avec base de données complète
- [x] Stockage cloud S3 pour images/fichiers
- [x] Badges de statut utilisateur colorés (vert/actif, rouge/suspendu, jaune/en attente)
- [x] **Refactoring frontend majeur** (Feb 2026) — 7 fichiers >300 lignes découpés en 15+ sous-composants
- [x] **Migration tokens → cookies httpOnly** (Feb 2026) — Protection XSS complète

### Migration cookies httpOnly (Feb 2026)
**Backend:**
- `middleware/auth.py` : Lecture du token depuis cookie `access_token` d'abord, puis fallback sur `Authorization: Bearer`
- `routes/auth.py` : Login/verify-otp settent le cookie httpOnly (secure, samesite=lax, max_age=30j)
- `routes/auth.py` : Nouvel endpoint `POST /auth/logout` pour supprimer le cookie
- `routes/messages.py` : WebSocket supporte l'auth par cookie

**Frontend:**
- `lib/api.js` : `withCredentials: true`, plus de header Authorization
- `context/AuthContext.js` : `isAuthenticated` remplace `token`, validation de session via `/auth/me`
- `context/WebSocketContext.js` : Cookie envoyé automatiquement (same-origin)
- Tous les composants : `token` → `isAuthenticated`

### Bug fix (Feb 2026)
- `routes/admin.py` : Correction `published_at` nullable pour les articles sans date de publication

## Architecture
```
/app/backend/
├── middleware/
│   └── auth.py              # Cookie + Bearer auth
├── routes/
│   ├── auth.py              # Login (cookie set), logout, OTP, /me
│   ├── admin.py             # Admin CRUD
│   └── messages.py          # WebSocket (cookie auth)

/app/frontend/src/
├── lib/
│   └── api.js               # withCredentials: true
├── context/
│   ├── AuthContext.js        # isAuthenticated, login(user), logout, refreshUser
│   └── WebSocketContext.js   # Cookie-based auth
├── components/
│   └── DetailPageHelpers.js  # Shared AuthGateOverlay, VideoPlayer
├── pages/admin/
│   ├── DatabasePage.js       # 112 lignes (orchestrateur)
│   └── database/             # 7 sous-composants
```

## Prioritized Backlog

### P1 - Upcoming
- [ ] Refactoring des fichiers restants 350-480 lignes (MapPage, ArticleFormPage, DashboardPage, ArticleDetailPage)

### P2 - Future
- [ ] Système de notifications pour annonces
- [ ] Heatmap des prix immobiliers
- [ ] Export fiches au format Word (.docx)
- [ ] Visites vidéo natives dans les annonces

## Credentials
- Admin: matrixguinea@gmail.com / admin123

## Known Issues
- Perte potentielle de données lors de l'édition d'annonces (non reproduit récemment)

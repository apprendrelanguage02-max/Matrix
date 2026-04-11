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

## Tech Stack
- **Frontend**: React, TailwindCSS, lucide-react, @dnd-kit (drag-drop)
- **Backend**: FastAPI, MongoDB (Motor), Pydantic
- **Services**: ReportLab (PDF), Resend (Emails), AWS S3 (Stockage), Leaflet (Maps)

## User Personas
- **Admin** : Gestion complète de la plateforme
- **Auteur** : Rédaction d'articles et de fiches
- **Agent immobilier** : Publication d'annonces
- **Visiteur** : Consultation du contenu public

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

### Refactoring Frontend (Feb 2026)
| Fichier | Avant | Après | Réduction |
|---|---|---|---|
| DatabasePage.js | 1148 | 112 | -90% |
| CreateFichePage.js | 760 | 378 | -50% |
| PropertyFormPage.js | 666 | 415 | -38% |
| ProcedureBuilder.js | 634 | 295 | -54% |
| AdminProceduresDashboard.js | 571 | 167 | -71% |
| ProcedureDetailPage.js | 514 | 369 | -28% |
| PropertyDetailPage.js | 483 | 467 | -3% |

## Architecture
```
/app/frontend/src/
├── components/
│   └── DetailPageHelpers.js         # Shared AuthGateOverlay, VideoPlayer, formatDate
├── pages/
│   ├── admin/
│   │   ├── DatabasePage.js          # Orchestrateur (112 lignes)
│   │   ├── database/                # 7 sous-composants
│   │   │   ├── SharedComponents.js
│   │   │   ├── RequestsTab.js
│   │   │   ├── UsersTab.js
│   │   │   ├── ArticlesTab.js
│   │   │   ├── PropertiesTab.js
│   │   │   ├── PaymentsTab.js
│   │   │   └── PriceReferencesTab.js
│   │   ├── fiches/
│   │   │   ├── CreateFichePage.js
│   │   │   ├── FicheFormFields.js
│   │   │   └── FichePreview.js
│   │   └── procedures/
│   │       ├── AdminProceduresDashboard.js
│   │       ├── DashboardHelpers.js
│   │       ├── DashboardTabs.js
│   │       ├── ProcedureBuilder.js
│   │       ├── ProcedureStep.js
│   │       └── ProcedureSidebar.js
│   ├── immobilier/
│   │   ├── PropertyFormPage.js
│   │   └── PropertyFormComponents.js
│   └── procedures/
│       ├── ProcedureDetailPage.js
│       └── ProcedureDetailSidebar.js
```

## Prioritized Backlog

### P1 - Upcoming
- [ ] Migration tokens localStorage → cookies httpOnly (sécurité XSS)
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
- ESLint warnings mineurs dans quelques hooks useEffect (n'impactent pas la fonctionnalité)

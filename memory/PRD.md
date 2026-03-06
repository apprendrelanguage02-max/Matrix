# Matrix News / GIMO — PRD

## Original Problem Statement
Plateforme média full-stack en Guinée (React/FastAPI/MongoDB) avec:
- Newsroom (articles, éditeur par blocs, catégories)
- Section Immobilier (annonces, carte interactive, profils agents, estimation de prix)
- Section Procédures administratives
- Dashboard Admin complet
- Système de favoris unifié (articles, annonces, procédures)
- Authentification OTP + système de rôles (admin, auteur, agent, visiteur)

## Architecture
```
/app/
├── backend/          # FastAPI + MongoDB
│   ├── data/         # guinea_locations.py (communes/quartiers)
│   ├── models/       # Pydantic models
│   ├── routes/       # API routes (admin, articles, properties, procedures, etc.)
│   └── server.py     # App entry point
└── frontend/         # React + TailwindCSS
    └── src/
        ├── components/  # Reusable UI components
        ├── pages/       # Page-level components
        ├── context/     # Auth & WebSocket contexts
        └── lib/         # API client, utilities
```

## What's Been Implemented
- Full Newsroom with block editor, categories, article CRUD
- Full Immobilier section with property CRUD, map (Leaflet), agent profiles
- Price estimation with cascading dropdowns (Ville > Commune > Quartier)
- Admin dashboard: users, articles, properties, payments, role requests, price references
- Unified favorites system (bookmark icon) for articles, properties, procedures
- WebSocket real-time updates (likes, views, notifications)
- OTP-based registration with Resend email
- Search alerts for properties
- CSV exports for admin data

## Completed Bug Fixes (March 2026)
- Fixed: Price estimation page was blank → Now working with cascading dropdowns
- Fixed: Article favorites broken → Save/unsave toggle works correctly
- Fixed: Admin "Demandes" page inaccessible → RequestsTab loads correctly
- Fixed: Property edit data loss → PUT endpoint preserves all fields
- Fixed: Article like notifications going to wrong collection
- Fixed: Saved procedures missing subcategory_name

## 3rd Party Integrations
- Resend: OTP emails
- Leaflet/React-Leaflet: Interactive map
- bcrypt: Password hashing
- JWT: Authentication tokens

## Test Credentials
- Admin: matrixguinea@gmail.com / admin123
- Agent: gui002@gmail.com / agent123

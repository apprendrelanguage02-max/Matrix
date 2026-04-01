# Matrix News — PRD

## Probleme Original
Plateforme full-stack (React/FastAPI/MongoDB) pour un portail d'actualites et immobilier en Guinee.

## Architecture
- **Frontend**: React, TailwindCSS, Shadcn/UI, React-Leaflet, DOMPurify
- **Backend**: FastAPI, MongoDB, Pydantic, ReportLab (PDF)
- **Stockage**: AWS S3 via boto3, cloud proxy `/api/media/cloud/`
- **Auth**: JWT + OTP (SHA-256 + secrets, expiration 5min, 5 tentatives max)
- **Emails**: Resend API (`noreply@matrixnews.org`)

## Fonctionnalites Implementees
1. Systeme d'articles avec categories, recherche, vues, likes
2. Module immobilier complet avec page de creation premium (3 colonnes, carte Leaflet, equipements, conversion GNF/USD/EUR)
3. Module procedures V2 (drag-and-drop, fichiers cloud, videos, image principale)
4. Module Fiches PDF (CRUD, apercu live, generation ReportLab, parametres entreprise)
5. Authentification OTP avec Resend
6. Tableau de bord admin avec badges statut colores
7. Stockage cloud S3

## Session 1 Avril 2026 — Complete
- [x] Code review fixes (XSS/DOMPurify, secrets, React keys, useMemo)
- [x] Module Fiches PDF complet (100% tests)
- [x] Navigation fiches dans dashboard procedures
- [x] Page creation annonce immobiliere premium (3 colonnes, carte interactive, equipements, conversion monetaire, validation)
  - Backend: champs etendus (salons, cuisines, toilettes, etages, commune, points de repere, equipements, etc.)
  - Frontend: layout 3 colonnes, upload photos drag & drop, carte Leaflet interactive, prix GNF/USD/EUR, checkboxes equipements, resume live
  - Tests: 100% backend (9/9) + 100% frontend (14/14)

## Backlog
- P2: Supprimer anciens fichiers procedures V1
- P2: Refactoring composants >300 lignes
- P2: Migration token auth vers httpOnly cookies
- P3: Export Word des fiches
- P3: Notifications recherches sauvegardees
- P3: Visites video natives, heatmap prix

## Credentials Test
- Admin: `matrixguinea@gmail.com` / `admin123`

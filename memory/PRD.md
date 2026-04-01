# Matrix News — PRD

## Probleme Original
Plateforme full-stack (React/FastAPI/MongoDB) pour un portail d'actualites et immobilier en Guinee.

## Architecture
- **Frontend**: React, TailwindCSS, Shadcn/UI, React-Leaflet, DOMPurify
- **Backend**: FastAPI, MongoDB, Pydantic, ReportLab (PDF)
- **Stockage**: AWS S3 via boto3, cloud proxy `/api/media/cloud/`
- **Auth**: JWT + OTP, Resend API

## Fonctionnalites Implementees
1. Systeme d'articles avec categories, recherche, vues, likes
2. Module immobilier complet:
   - Page creation premium 3 colonnes (photos, details, carte)
   - Page detail premium 2 colonnes (galerie/description/equipements/contact | info/localisation/carte)
   - Carte Leaflet interactive avec pin draggable
   - Conversion GNF/USD/EUR
   - Equipements par categories (40+)
   - Communes de Conakry
   - Champs etendus (salons, cuisines, toilettes, etages, annee, commune, reperes)
3. Module procedures V2 (drag-and-drop, fichiers cloud, videos, image principale)
4. Module Fiches PDF (CRUD, apercu live, generation ReportLab, parametres entreprise)
5. Authentification OTP avec Resend
6. Tableau de bord admin avec badges statut colores
7. Stockage cloud S3

## Session 1 Avril 2026 — Complete
- [x] Code review fixes (XSS/DOMPurify, secrets, React keys, useMemo)
- [x] Module Fiches PDF complet (100% tests)
- [x] Page creation annonce immobiliere premium 3 colonnes (100% tests)
- [x] Page detail annonce immobiliere premium:
  - Hero: titre, badges statut/type, prix GNF+USD+EUR, quick stats (surface, chambres, sdb, salons)
  - Galerie photos avec fleches, compteur, thumbnails, badge video
  - Description detaillee (section separee)
  - Equipements & Caracteristiques (section separee, organisee par categories)
  - Contact (section separee: avatar, nom, agent verifie, tel, whatsapp, email, message)
  - Sidebar: Informations principales (type, operation, surface, pieces, annee) + Localisation + Carte
  - Breadcrumb, admin actions, reservation

## Backlog
- P2: Supprimer anciens fichiers procedures V1
- P2: Refactoring composants >300 lignes
- P3: Export Word fiches, notifications, heatmap prix

## Credentials
- Admin: `matrixguinea@gmail.com` / `admin123`

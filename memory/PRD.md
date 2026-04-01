# Matrix News — PRD

## Probleme Original
Plateforme full-stack (React/FastAPI/MongoDB) pour un portail d'actualites et immobilier en Guinee. Inclut gestion d'articles, annonces immobilieres avec geolocalisation, procedures administratives, et systeme d'authentification OTP.

## Architecture
- **Frontend**: React, TailwindCSS, Shadcn/UI, React-Leaflet, DOMPurify
- **Backend**: FastAPI, MongoDB, Pydantic, ReportLab (PDF)
- **Stockage**: AWS S3 via boto3, cloud proxy `/api/media/cloud/`
- **Auth**: JWT + OTP (SHA-256 + secrets module, expiration 5min, 5 tentatives max)
- **Emails**: Resend API (`noreply@matrixnews.org`)
- **Drag & Drop**: @dnd-kit pour le constructeur de procedures

## Fonctionnalites Implementees
1. Systeme d'articles avec categories, recherche, vues, likes
2. Module immobilier complet (CRUD, carte, geolocalisation, alertes, estimation prix)
3. Module procedures V2 (constructeur drag-and-drop, fichiers cloud, videos, liens, image principale)
4. Authentification OTP avec Resend
5. Tableau de bord admin avec gestion utilisateurs (badges statut colores), articles, annonces, paiements
6. Stockage cloud S3 pour tous les fichiers/images
7. **Module Fiches de Procedure PDF** (NOUVEAU) :
   - CRUD complet des fiches (brouillon, publie, archive)
   - Interface 2 colonnes : formulaire a gauche + apercu PDF en direct a droite
   - Sections dynamiques : documents requis, etapes ordonnees, details supplementaires, prestation de service
   - Generation PDF professionnelle via ReportLab (en-tete logo, titres orange, frais, etapes numerotees, signature, pied de page)
   - Parametres entreprise modifiables (logo, nom, slogan, signature, pied de page, devise par defaut)
   - Navigation admin integree (dropdown Header)
   - Routes: /admin/fiches, /admin/fiches/create, /admin/fiches/:id/edit, /admin/parametres-entreprise

## Taches Completees (Session 1 Avril 2026)

### Code Quality (Code Review Fixes)
- [x] XSS: DOMPurify integre dans 6 fichiers (3 editeurs + 3 pages de detail)
- [x] Securite: `random` -> `secrets` dans auth.py et payment.py
- [x] React keys: 12 instances de `key={index}` corrigees avec des cles stables
- [x] Performance: `useMemo` ajoute pour les tri/slice couteux

### Nouveau Module Fiches PDF
- [x] Backend: Modeles Pydantic (FicheCreate/Update, CompanySettings)
- [x] Backend: Routes CRUD fiches + parametres entreprise
- [x] Backend: Service PDF ReportLab (en-tete, titres, frais, documents, etapes, prestation, signature)
- [x] Frontend: Page creation/edition avec formulaire complet et apercu live
- [x] Frontend: Page liste des fiches avec recherche et filtres
- [x] Frontend: Page parametres entreprise
- [x] Integration navigation admin
- [x] Tests: 100% backend (16/16) + 100% frontend (11/11)

## Backlog
- P2: Supprimer anciens fichiers obsoletes procedures V1
- P2: Refactoring composants >300 lignes
- P2: Migration token auth vers httpOnly cookies
- P2: Correction des 88 dependances manquantes dans les hooks React
- P2: Refactoring fonctions backend complexes (websocket_chat, verify_otp, update_procedure)
- P3: Export Word des fiches de procedure
- P3: Systeme de notifications pour recherches sauvegardees
- P3: Integration visites video natives dans les annonces
- P3: Heatmap des prix immobiliers sur carte

## API Endpoints Fiches
- `GET /api/fiches` - Liste (filtre par status)
- `GET /api/fiches/{id}` - Detail
- `POST /api/fiches` - Creation
- `PUT /api/fiches/{id}` - Mise a jour
- `DELETE /api/fiches/{id}` - Suppression
- `POST /api/fiches/{id}/pdf` - Generation PDF
- `POST /api/fiches/preview-pdf` - Apercu PDF sans sauvegarde
- `GET /api/company-settings` - Parametres entreprise
- `PUT /api/company-settings` - Modifier parametres

## Credentials Test
- Admin: `matrixguinea@gmail.com` / `admin123`

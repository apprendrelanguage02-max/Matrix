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
   - Documents requis et frais integres dans chaque etape (pas en section globale)
   - Total des frais calcule et affiche en bas du PDF (sous-total etapes + frais officiels + cout prestation)
   - Logo Matrix.png integre dans le PDF
5. Authentification OTP avec Resend
6. Tableau de bord admin avec badges statut colores
7. Stockage cloud S3

## Session 1 Avril 2026 — Complete
- [x] Code review fixes (XSS/DOMPurify, secrets, React keys, useMemo)
- [x] Module Fiches PDF complet (100% tests)
- [x] Page creation annonce immobiliere premium 3 colonnes (100% tests)
- [x] Page detail annonce immobiliere premium

## Session 2 Avril 2026 — Complete
- [x] Restructuration Fiches PDF: documents et frais par etape (100% tests - iteration 33)
- [x] Logo Matrix.png integre dans le PDF et l'apercu live
- [x] Fix bug variable `currency` referencee avant definition dans pdf_generator.py
- [x] Section "Documents requis" globale supprimee, remplacee par documents dans chaque etape
- [x] Section "Frais et Couts" deplacee en bas de l'apercu et du PDF avec recapitulatif

## Backlog
- P1: Nettoyage/refactoring des routes backend complexes (messages.py, auth.py, procedures.py)
- P1: Correction des hooks React avec dependances manquantes
- P2: Supprimer anciens fichiers procedures V1
- P2: Refactoring composants >300 lignes
- P2: Migration tokens localStorage vers cookies httpOnly
- P3: Export Word fiches, notifications, heatmap prix

## Credentials
- Admin: `matrixguinea@gmail.com` / `admin123`

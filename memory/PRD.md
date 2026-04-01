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
2. Module immobilier complet (premium UI, Leaflet map, conversion GNF/USD/EUR)
3. Module procedures V2 (drag-and-drop, fichiers cloud, videos)
4. Module Fiches PDF Premium:
   - Interface de creation premium (SaaS-style, sections avec icones, barre sticky)
   - Documents requis et frais integres dans chaque etape
   - Selecteur de devise par etape (GNF, EUR, USD, etc.)
   - Total general calcule en bas
   - Logo Matrix.png integre dans le PDF
   - PDF premium avec sections elegantes (barre orange laterale, boites accent, separateurs)
   - Company settings synchronises (logo, nom, slogan, signature, footer)
5. Authentification OTP avec Resend
6. Tableau de bord admin avec badges statut colores
7. Stockage cloud S3

## Session 2 Avril 2026 — Complete
- [x] Correction logo PDF: Matrix.png au lieu de nimba-logo.png
- [x] Nouvelle fonction load_logo() locale (plus de requetes HTTP)
- [x] Refonte visuelle complete de CreateFichePage.js (design premium SaaS)
- [x] Refonte visuelle complete de pdf_generator.py (PDF elegant, professionnel)
- [x] Selecteur de devise par etape (fees_currency par step)
- [x] Company settings default mis a jour vers Matrix.png
- [x] Tests: Backend 8/8, Frontend 9/9 (iteration 34)

## Backlog
- P1: Nettoyage/refactoring des routes backend complexes
- P1: Correction des hooks React avec dependances manquantes
- P2: Supprimer anciens fichiers procedures V1
- P2: Refactoring composants >300 lignes
- P2: Migration tokens localStorage vers cookies httpOnly
- P3: Export Word fiches, notifications, heatmap prix

## Credentials
- Admin: `matrixguinea@gmail.com` / `admin123`

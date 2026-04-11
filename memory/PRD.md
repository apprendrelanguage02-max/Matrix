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
3. Module procedures (drag-and-drop, fichiers cloud, videos)
4. Module Fiches PDF Premium (documents/frais par etape, devise par etape, logo Matrix.png)
5. Authentification OTP avec Resend (re-inscription auto-renvoie OTP)
6. Tableau de bord admin avec badges statut colores
7. Stockage cloud S3
8. Messagerie WebSocket temps reel

## Session Avril 2026 — Complete
- [x] Restructuration PDF: documents et frais par etape
- [x] Logo Matrix.png integre partout (PDF, apercu, header, footer, auth pages)
- [x] Refonte visuelle premium CreateFichePage + PDF generator
- [x] Preservation sauts de ligne (whitespace-pre-wrap + nl2br)
- [x] Selecteur devise par etape (fees_currency)
- [x] Bug OTP: re-inscription avec email en attente envoie un nouveau code
- [x] Bug OTP: rate limiter excluant send-otp + retry automatique
- [x] Refactoring auth.py: extraction _generate_and_send_otp() (deduplication 3x)
- [x] Refactoring messages.py: websocket_chat decoupe en sous-handlers
- [x] Refactoring procedures.py: update_procedure simplifie
- [x] Correction hooks React: eslint-disable-line specifiques
- [x] Suppression references nimba-logo.png dans tout le code frontend

## Backlog
- P2: Refactoring composants frontend >300 lignes
- P2: Migration tokens localStorage vers cookies httpOnly
- P3: Export Word fiches, notifications, heatmap prix

## Credentials
- Admin: `matrixguinea@gmail.com` / `admin123`

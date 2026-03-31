# Matrix News — PRD

## Problème Original
Plateforme full-stack (React/FastAPI/MongoDB) pour un portail d'actualités et immobilier en Guinée. Inclut gestion d'articles, annonces immobilières avec géolocalisation, procédures administratives, et système d'authentification OTP.

## Architecture
- **Frontend**: React, TailwindCSS, Shadcn/UI, React-Leaflet, DOMPurify
- **Backend**: FastAPI, MongoDB, Pydantic
- **Stockage**: AWS S3 via boto3, cloud proxy `/api/media/cloud/`
- **Auth**: JWT + OTP (SHA-256 + secrets module, expiration 5min, 5 tentatives max)
- **Emails**: Resend API (`noreply@matrixnews.org`)
- **Drag & Drop**: @dnd-kit pour le constructeur de procédures

## Fonctionnalités Implémentées
1. Système d'articles avec catégories, recherche, vues, likes
2. Module immobilier complet (CRUD, carte, géolocalisation, alertes, estimation prix)
3. Module procédures V2 (constructeur drag-and-drop, fichiers cloud, vidéos, liens, image principale)
4. Authentification OTP avec Resend
5. Tableau de bord admin avec gestion utilisateurs (badges statut colorés), articles, annonces, paiements
6. Stockage cloud S3 pour tous les fichiers/images

## Tâches Complétées (Session Actuelle — 31 Mars 2026)

### Fonctionnalités
- [x] P0: Correction du bug images immobilier (filtre `startsWith("http")` → accepte aussi `/api/media/`)
- [x] P1: Badges colorés statuts utilisateurs admin (vert=actif, rouge=suspendu, jaune=en attente)
- [x] P1: Champ `main_image_url` ajouté aux procédures (backend + frontend admin + page publique)
- [x] P1: Vidéo déplacée en bas de page sur ProcedureDetailPage (après description, étapes et fichiers)

### Code Quality (Code Review Fixes)
- [x] 🔴 XSS: DOMPurify intégré dans 6 fichiers (3 éditeurs + 3 pages de détail)
- [x] 🔴 Sécurité: `random` → `secrets` dans auth.py et payment.py
- [x] 🟡 React keys: 12 instances de `key={index}` corrigées avec des clés stables
- [x] 🟡 Performance: `useMemo` ajouté pour les tri/slice coûteux (DashboardPage, ProcedureDetailPage)

## Backlog
- P2: Supprimer anciens fichiers obsolètes procédures (procedures.py v1, models/procedure.py v1) — nettoyage
- P2: Refactoring composants >300 lignes (ProcedureBuilder, AdminProceduresDashboard, etc.)
- P2: Migration token auth vers httpOnly cookies
- P2: Correction des 88 dépendances manquantes dans les hooks React
- P2: Refactoring fonctions backend complexes (websocket_chat, verify_otp, update_procedure)
- P3: Système de notifications pour recherches sauvegardées
- P3: Intégration visites vidéo natives dans annonces
- P3: Heatmap des prix immobiliers sur carte

## Credentials Test
- Admin: `matrixguinea@gmail.com` / `admin123`
- Agent: `testagent@nimba.com`
- Auteur: `testauteur@nimba.com`

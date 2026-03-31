# Matrix News — PRD

## Problème Original
Plateforme full-stack (React/FastAPI/MongoDB) pour un portail d'actualités et immobilier en Guinée. Inclut gestion d'articles, annonces immobilières avec géolocalisation, procédures administratives, et système d'authentification OTP.

## Architecture
- **Frontend**: React, TailwindCSS, Shadcn/UI, React-Leaflet
- **Backend**: FastAPI, MongoDB, Pydantic
- **Stockage**: AWS S3 via boto3, cloud proxy `/api/media/cloud/`
- **Auth**: JWT + OTP (SHA-256, expiration 5min, 5 tentatives max)
- **Emails**: Resend API (`noreply@matrixnews.org`)
- **Drag & Drop**: @dnd-kit pour le constructeur de procédures

## Fonctionnalités Implémentées
1. Système d'articles avec catégories, recherche, vues, likes
2. Module immobilier complet (CRUD, carte, géolocalisation, alertes, estimation prix)
3. Module procédures V2 (constructeur drag-and-drop, fichiers cloud, vidéos, liens)
4. Authentification OTP avec Resend
5. Tableau de bord admin avec gestion utilisateurs, articles, annonces, paiements
6. Stockage cloud S3 pour tous les fichiers/images

## Tâches Complétées (Session Actuelle — 31 Mars 2026)
- [x] P0: Correction du bug images immobilier (filtre `startsWith("http")` → accepte aussi `/api/media/`)
- [x] P1: Badges colorés statuts utilisateurs admin (vert=actif, rouge=suspendu, jaune=en attente)
- [x] P1: Champ `main_image_url` ajouté aux procédures (backend + frontend admin + page publique)
- [x] P1: Vidéo déplacée en bas de page sur ProcedureDetailPage (après description, étapes et fichiers)

## Backlog
- P2: Supprimer anciens fichiers obsolètes procédures (procedures.py v1, models/procedure.py v1) — nettoyage
- P3: Système de notifications pour recherches sauvegardées
- P3: Intégration visites vidéo natives dans annonces
- P3: Heatmap des prix immobiliers sur carte
- P3: Bug potentiel perte de données édition annonces (jamais reproduit)

## Credentials Test
- Admin: `matrixguinea@gmail.com` / `admin123`
- Agent: `testagent@nimba.com`
- Auteur: `testauteur@nimba.com`

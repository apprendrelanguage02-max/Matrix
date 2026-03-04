# Matrix News / GIMO - PRD

## Produit
Application media et immobilier pour la Guinee. Plateforme full-stack avec actualites, annonces immobilieres, procedures administratives, et messagerie en temps reel.

## Stack Technique
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Temps reel**: WebSocket natif (unique par utilisateur via WebSocketProvider)
- **Email**: Resend (mode dev/test)
- **Auth**: JWT + OTP par email

## Roles et Acces
- **Admin**: Acces complet (articles + annonces + dashboard admin)
- **Auteur**: Articles uniquement
- **Agent immobilier**: Annonces uniquement
- **Visiteur**: Lecture seule

## Fonctionnalites Implementees
- Auth JWT + OTP email (Resend mode dev)
- Dashboard Admin: CRUD, filtres, pagination, CSV, approbation/rejet temps reel
- Temps reel: WebSocket centralise, notifications cloche admin, broadcast contenu, redirect auto apres approbation
- Recherche globale: articles, annonces, procedures
- UI/UX: Avatar dropdown avec Profil, boutons retour icon-only, footer conditionnel
- Likes sur articles/annonces, messagerie temps reel, suppression conversations

## Backlog
- P1: Resend domaine prod, OTP telephone, brouillons articles
- P2: Carte interactive, paiements reels, notifications push
- P3: Orange Money, inscription agents publique, PWA

## Credentials: matrixguinea@gmail.com / strongpassword123

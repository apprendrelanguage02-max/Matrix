# Matrix News / GIMO - PRD

## Produit
Application media et immobilier pour la Guinee. Plateforme full-stack avec actualites, annonces immobilieres, procedures administratives, et messagerie en temps reel.

## Stack Technique
- **Frontend**: React + TailwindCSS + Shadcn/UI + Leaflet (carte interactive)
- **Backend**: FastAPI + MongoDB
- **Temps reel**: WebSocket natif (unique par utilisateur via WebSocketProvider)
- **Email**: Resend (mode dev/test)
- **Auth**: JWT + OTP par email

## Roles et Acces
- **Admin**: Acces complet (articles + annonces + dashboard admin + carte)
- **Auteur**: Articles uniquement (creer, modifier, supprimer ses articles)
- **Agent immobilier**: Annonces uniquement (publier, modifier ses annonces)
- **Visiteur**: Lecture seule, pas de publication

## Fonctionnalites Implementees

### Authentification
- Login/Register JWT + OTP email (Resend mode dev)
- Roles: admin, auteur, agent, visiteur
- Utilisateurs rejetes bloques au login (HTTP 403)

### Dashboard Admin
- 5 onglets: Demandes, Utilisateurs, Articles, Annonces, Paiements
- CRUD complet, filtres, pagination, CSV authentifie
- Approbation/rejet temps reel via WebSocket + suppression demandes

### Temps Reel (Mars 2026)
- WebSocket centralise via WebSocketProvider (subscribe pattern)
- Notification cloche admin en temps reel (new_role_request)
- Toast notifications quand nouvel article/annonce publie (content_update)
- Compteurs vues en temps reel via view_update broadcast
- Compteurs likes en temps reel via like_update broadcast
- Broadcast articles/annonces a tous les utilisateurs connectes
- Redirection auto apres approbation: agent->/immobilier, auteur->/admin
- Auto-refresh listes quand nouveau contenu publie

### Carte Interactive Leaflet (Mars 2026)
- Page separee /immobilier/carte avec carte plein ecran
- Marqueurs colores par type (Achat=orange, Vente=vert, Location=bleu)
- Filtres: type, ville, statut, prix min/max
- Popup avec image, titre, prix, bouton "Voir l'annonce"
- Legende des couleurs
- Endpoint /api/properties/map/markers

### Recherche Globale
- Endpoint /api/search (articles, annonces, procedures)
- Barre de recherche Header (desktop + mobile) avec debounce 300ms

### UI/UX
- Avatar click ouvre menu deroulant avec Profil
- Boutons retour dynamiques (icone seule)
- Pull-to-refresh mobile (spinner animation)
- Footer conditionnel (liens annonces agents/admins uniquement)
- Systeme de likes avec compteurs temps reel
- Suppression de conversations

### Sections
- News: Articles par categories
- Immobilier: Annonces + carte + filtres + paiements simules
- Procedures: Guide administratif par pays

## API Endpoints Cles
- /api/search?q= : Recherche globale
- /api/properties/map/markers : Marqueurs carte
- /api/admin/notifications : Demandes de role
- /api/admin/export/* : Exports CSV
- /ws/chat?token= : WebSocket temps reel

## Backlog

### P1
- Finalisation Resend (verification domaine production)
- OTP par telephone (Twilio/SMS)
- Mode brouillon articles

### P2
- Paiements reels (Orange Money)
- Notifications push
- Ameliorer le chat

### P3
- Inscription publique agents
- Modele economique (abonnements)
- PWA / mode hors ligne

## Credentials Test
- Admin: matrixguinea@gmail.com / strongpassword123

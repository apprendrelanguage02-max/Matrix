# Matrix News / GIMO - PRD (Product Requirements Document)

## Probleme Original
Application web full-stack combinant un media d'actualites et une marketplace immobiliere pour la Guinee.
- Theme: Orange #FF6600, Noir, Blanc
- Interface: Francais
- Zones couvertes: Conakry et principales villes de Guinee

## Architecture Technique
- **Frontend**: React (CRA + Craco + TailwindCSS) - port 3000
- **Backend**: FastAPI (modulaire) - port 8001
- **Base de donnees**: MongoDB (motor async)
- **Authentification**: JWT (pyjwt + bcrypt) avec roles et systeme d'approbation
- **Messagerie**: WebSocket temps reel + REST API
- **Upload fichiers**: python-multipart, fichiers servis via /api/media/

## Architecture Backend (Refactorise Mars 2026)
```
backend/
├── server.py          # Point d'entree slim (~50 lignes)
├── config.py          # Configuration et constantes
├── database.py        # Connexion MongoDB
├── utils.py           # Utilitaires (sanitize HTML, etc.)
├── models/            # Schemas Pydantic
│   ├── user.py, article.py, property.py
│   ├── procedure.py, payment.py
│   ├── notification.py, message.py
├── middleware/
│   └── auth.py        # JWT, get_current_user, require_*
├── routes/
│   ├── auth.py        # Auth (register/login/profile)
│   ├── articles.py    # CRUD articles + sauvegarde
│   ├── properties.py  # CRUD annonces immobilieres
│   ├── procedures.py  # CRUD procedures/demarches
│   ├── payments.py    # Paiements simules
│   ├── admin.py       # Dashboard admin complet + CSV
│   ├── notifications.py # Notifications utilisateur
│   ├── messages.py    # Messagerie temps reel WebSocket
│   └── upload.py      # Upload fichiers/images/videos
```

## Roles Utilisateurs
1. **Visiteur** - Lecture seule (acces immediat)
2. **Auteur** - Publier articles (necessite approbation admin)
3. **Agent immobilier** - Publier annonces (necessite approbation admin)
4. **Admin** - Acces complet (unique: matrixguinea@gmail.com)

## Fonctionnalites Implementees

### Section News
- Authentification JWT avec 4 roles et approbation
- CRUD articles avec editeur WYSIWYG
- Categories: Actualite, Politique, Sport, Technologie, Economie
- Recherche, pagination, upload images, favoris, compteur vues

### Section Immobilier
- Listing annonces avec filtres, page detail avec galerie
- Publication d'annonce (agents), types: Vente/Achat/Location
- Bouton "Envoyer un message" pour contacter l'agent

### Section Procedures & Demarches
- Listing par pays (Guinee, Canada, France, etc.)
- CRUD admin uniquement avec editeur WYSIWYG
- Bouton "Poser une question" pour contacter l'admin

### Compteur de Likes (Terminé - Fev 2026)
- Bouton cœur (Heart) sur PropertyCard, PropertyDetailPage, ArticleCard, ArticleDetailPage
- Toggle like/unlike avec animation burst + rouge sur activation
- Notification créée pour l'auteur à chaque nouveau like ("X a aimé votre annonce/article")
- liked_by (liste user IDs) + likes_count stockés dans la DB
- Endpoints: POST /api/properties/{id}/like et POST /api/articles/{id}/like

- DB mise à jour : procédures pointaient vers ancien admin (f7f5d389) → corrigé vers admin actuel (acc21120)
- Endpoint public GET /api/admin/contact → retourne toujours l'admin actuel
- ProcedureDetailPage utilise adminContact.id au lieu de procedure.author_id
- Admin voit maintenant les conversations de type procedures dans sa boîte de réception

### Vérification OTP Email (Terminé - Fev 2026)
- POST /api/auth/send-otp : génère code 6 chiffres, stocké 5 min en DB
- POST /api/auth/register : requiert OTP valide pour créer le compte
- Toggle Email/Téléphone dans le formulaire d'inscription
- Mode dev (sans RESEND_API_KEY) : code affiché dans l'interface (boîte ambre)
- Mode prod : email envoyé via Resend (clé à configurer dans backend/.env)
- Tests: 18/18 backend (100%) + 100% frontend
- Chat type WhatsApp via WebSocket (`/api/ws/chat?token=...`)
- Conversations immobilier (visiteur<->agent) et procedures (utilisateur<->admin)
- Icone message visible uniquement dans sections immobilier/procedures
- Badge compteur messages non lus mis à jour en temps réel (WebSocket `unread_update`)
- Indicateur "en ligne" (point vert) sur l'avatar dans la liste des conversations
- Indicateur de frappe animé (typing dots) avec stop automatique
- Carte d'annonce cliquable (PropertyBanner) dans les conversations liées à une annonce
- **WebSocketContext**: UNE seule connexion WebSocket partagée par utilisateur (contexte React)
- Fix critique: bug de livraison de messages résolu (connexions multiples → connexion unique)
- Tests: 33/33 backend + 100% frontend (100% succès, Itérations 14 & 15)

### Dashboard Admin /admin/database
- 5 onglets: Demandes, Utilisateurs, Articles, Annonces, Paiements
- CRUD complet, filtres, pagination, export CSV
- Systeme d'approbation roles (approuver/rejeter)
- Badge cloche qui disparait automatiquement

### Systeme de Notifications
- Admin: notifications pour demandes de role avec badge cloche
- Utilisateurs: notification approuve/rejete (disparait apres 5 min)
- Texte "groupe MatrixNews" au lieu de "administrateur"

### Editeur WYSIWYG
- Integre dans articles, annonces et procedures
- Undo/Redo, Titres H1-H3, formatage complet
- Taille/couleur police, alignement, listes, citations
- Panneau media: Upload fichiers + insertion par URL
- Images/videos repositionnables par drag-and-drop

### Ameliorations UI/UX
- Avatar click -> page profil, chevron -> menu deroulant
- Point vert en ligne sur avatar
- Admin peut supprimer articles/annonces de tous les utilisateurs
- Responsivite complete

## Comptes Test
- **Admin**: matrixguinea@gmail.com / strongpassword123

## Backlog

### P1 - Priorite Haute
- Ameliorer le chat (notifications push, historique persistant)
- Mode brouillon pour articles

### P2 - Priorite Moyenne
- Carte interactive (Leaflet.js) pour annonces
- Notifications email (SendGrid)
- Ouvrir messagerie entre tous les utilisateurs

### P3 - Backlog
- Integration paiements reels (Orange Money)
- Modele economique (abonnements agents)
- PWA / mode hors ligne
- Dashboard analytics avance

## Issues Connues
- Rate limiter retourne parfois HTTP 520 (probleme infra Kubernetes)

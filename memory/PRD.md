# Matrix News / GIMO - PRD (Product Requirements Document)

## Problème Original
Application web full-stack combinant un média d'actualités et une marketplace immobilière pour la Guinée.
- Thème: Orange #FF6600, Noir, Blanc
- Interface: Français
- Zones couvertes: Conakry et principales villes de Guinée

## Architecture Technique
- **Frontend**: React (CRA + Craco + TailwindCSS) → port 3000
- **Backend**: FastAPI → port 8001
- **Base de données**: MongoDB (motor async)
- **Authentification**: JWT (pyjwt + bcrypt)
- **Upload fichiers**: python-multipart, fichiers servis via /api/media/

## Rôles Utilisateurs
1. **Visiteur** - Peut lire les articles et consulter les annonces
2. **Auteur** - Peut créer/modifier/supprimer ses articles
3. **Agent immobilier** - Peut publier et gérer des annonces immobilières
4. **Admin** - Accès complet à toutes les fonctionnalités + gestion de la base de données

## Ce qui a été implémenté (Fév 2026)

### Section News
- Authentification JWT (register/login/logout) avec 4 rôles
- CRUD complet articles (create, read, update, delete)
- Catégories: Actualité, Politique, Sport, Technologie, Économie
- Recherche et pagination
- Upload d'images de couverture (local, pas d'URL externe)
- Éditeur de texte riche (contentEditable)
- Sauvegarde d'articles favoris
- Compteur de vues

### Section Immobilier (Phase 1 - Complète)
- Listing des annonces avec filtres (type, ville, prix, statut)
- Page détail annonce avec galerie d'images
- Formulaire de publication d'annonce (agents uniquement)
- Types: Vente, Achat, Location
- Statuts: Disponible, Réservé, Vendu/Loué
- Interface sobre sans icône décorative

### Section Paiements (Phase 2 - Complète)
- Création de paiements simulés
- Méthodes: Orange Money, Mobile Money, PayCard, Carte bancaire
- Génération de références uniques (format GIMO-YYYYMMDDHHMM-XXXXXXXX)
- Statuts: En attente, Confirmé, Annulé
- Mise à jour automatique du statut des propriétés

### Section Admin - Base de Données (Nouveau)
- **Page /admin/database** accessible uniquement aux admins
- **4 onglets** : Utilisateurs, Articles, Annonces, Paiements
- **Compteurs en temps réel** des totaux
- **Tableau utilisateurs** : Nom, Email, Rôle, Téléphone, Pays, Date d'inscription, Statut
  - Actions: Suspendre/Activer, Changer rôle, Supprimer
  - Filtres: Recherche par nom/email, filtre par rôle
- **Tableau articles** : Titre, Catégorie, Auteur, Date, Vues
  - Actions: Voir, Modifier, Supprimer
  - Filtres: Recherche, filtre par catégorie
- **Tableau annonces** : Titre, Type, Prix, Ville, Agent, Statut
  - Actions: Voir, Modifier, Changer statut, Supprimer
  - Filtres: Type, Ville, Statut
- **Tableau paiements** : Référence, Propriété, Client, Montant, Méthode, Statut, Date
  - Actions: Changer statut, Supprimer
  - Filtres: Statut, Méthode de paiement
- **Export CSV** pour toutes les sections
- **Confirmation obligatoire** avant suppression
- **Pagination** 20 éléments par page

### Fonctionnalités Transverses
- **Responsivité complète** (mobile 375px, tablette 768px, desktop)
- Menu hamburger sur mobile pour la recherche
- Navigation des catégories défilante horizontalement
- Footer responsive avec 4 colonnes → 2 colonnes sur mobile
- Upload de médias (images JPG/PNG/WEBP jusqu'à 5MB, vidéos MP4/WebM jusqu'à 20MB)
- Avatar personnalisable pour le profil utilisateur

## API Routes

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Articles
- GET /api/articles (public, avec pagination et recherche)
- GET /api/articles/:id (public)
- POST /api/articles (auth: auteur/admin)
- PUT /api/articles/:id (auth: auteur/admin, own)
- DELETE /api/articles/:id (auth: auteur/admin, own)

### Immobilier
- GET /api/properties (public, avec filtres)
- GET /api/properties/:id (public)
- POST /api/properties (auth: agent/auteur/admin)
- PUT /api/properties/:id (auth: agent/auteur/admin, own)
- DELETE /api/properties/:id (auth: agent/auteur/admin, own)

### Paiements
- POST /api/payments (auth)
- GET /api/payments/my (auth)
- GET /api/payments (auth: auteur/admin)
- PUT /api/payments/:id/status (auth: auteur/admin)

### Admin (role: admin uniquement)
- GET /api/admin/stats
- GET /api/admin/users
- GET /api/admin/users/:id
- PUT /api/admin/users/:id/status
- PUT /api/admin/users/:id/role
- DELETE /api/admin/users/:id
- GET /api/admin/articles
- DELETE /api/admin/articles/:id
- GET /api/admin/properties
- PUT /api/admin/properties/:id/status
- DELETE /api/admin/properties/:id
- GET /api/admin/payments
- DELETE /api/admin/payments/:id
- GET /api/admin/export/users (CSV)
- GET /api/admin/export/articles (CSV)
- GET /api/admin/export/properties (CSV)
- GET /api/admin/export/payments (CSV)

### Upload
- POST /api/upload (auth)
- GET /api/media/images/{filename} (static)
- GET /api/media/videos/{filename} (static)

## Compte Test
- **Admin**: admin@example.com / adminpassword

## Backlog

### P1 - Priorité Haute
- **Phase 3 - Carte Interactive**
  - Intégration Leaflet.js
  - Affichage des annonces sur carte
  - Centrage par défaut sur Conakry

### P2 - Priorité Moyenne  
- Inscription publique des agents immobiliers
- Notifications par email

### P3 - Backlog
- Modèle économique (abonnements agents)
- Intégration réelle API de paiement
- PWA / mode hors ligne
- Dashboard analytics avancé

## Issues Connues
- Le rate limiter retourne parfois HTTP 520 au lieu de 429 (problème infrastructure Kubernetes, pas de bug code)

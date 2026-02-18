# Matrix News - PRD (Product Requirements Document)

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

## Ce qui a été implémenté (Fév 2026)

### Section News
- Authentification JWT (register/login/logout) avec 3 rôles
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
- POST /api/articles (auth: auteur)
- PUT /api/articles/:id (auth: auteur, own)
- DELETE /api/articles/:id (auth: auteur, own)

### Immobilier
- GET /api/properties (public, avec filtres)
- GET /api/properties/:id (public)
- POST /api/properties (auth: agent/auteur)
- PUT /api/properties/:id (auth: agent/auteur, own)
- DELETE /api/properties/:id (auth: agent/auteur, own)

### Upload
- POST /api/upload (auth)
- GET /api/media/images/{filename} (static)
- GET /api/media/videos/{filename} (static)

### Autres
- GET /api/categories
- GET /api/saved-articles (auth)
- POST /api/saved-articles/:id (auth)
- DELETE /api/saved-articles/:id (auth)

## Compte Test
- **Admin/Auteur**: admin@example.com / adminpassword

## Backlog

### P1 - Priorité Haute
- **Phase 2 - Paiements Simulés**
  - Bouton "Payer/Réserver" sur les annonces
  - Sélection méthode de paiement (Orange Money, Mobile Money)
  - Génération référence unique
  - Historique des paiements (admin)

### P2 - Priorité Moyenne  
- **Phase 3 - Carte Interactive**
  - Intégration Leaflet.js
  - Affichage des annonces sur carte
  - Centrage par défaut sur Conakry

### P3 - Backlog
- Inscription publique des agents immobiliers
- Modèle économique (abonnements agents)
- Intégration réelle API de paiement
- Notifications email
- PWA / mode hors ligne

## Issues Connues
- Le rate limiter retourne parfois HTTP 520 au lieu de 429 (problème infrastructure Kubernetes, pas de bug code)

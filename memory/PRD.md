# Matrix News / GIMO - PRD (Product Requirements Document)

## Probleme Original
Application web full-stack combinant un media d'actualites et une marketplace immobiliere pour la Guinee.
- Theme: Orange #FF6600, Noir, Blanc
- Interface: Francais
- Zones couvertes: Conakry et principales villes de Guinee

## Architecture Technique
- **Frontend**: React (CRA + Craco + TailwindCSS) - port 3000
- **Backend**: FastAPI - port 8001
- **Base de donnees**: MongoDB (motor async)
- **Authentification**: JWT (pyjwt + bcrypt) avec roles et systeme d'approbation
- **Upload fichiers**: python-multipart, fichiers servis via /api/media/

## Roles Utilisateurs
1. **Visiteur** - Peut lire les articles et consulter les annonces (acces immediat)
2. **Auteur** - Peut creer/modifier/supprimer ses articles (necessite approbation admin)
3. **Agent immobilier** - Peut publier et gerer des annonces immobilieres (necessite approbation admin)
4. **Admin** - Acces complet + gestion BDD + approbation roles (unique: matrixguinea@gmail.com)

## Ce qui a ete implemente

### Section News
- Authentification JWT (register/login/logout) avec 4 roles
- CRUD complet articles (create, read, update, delete)
- Categories: Actualite, Politique, Sport, Technologie, Economie
- Recherche et pagination
- Upload d'images de couverture (local)
- Sauvegarde d'articles favoris
- Compteur de vues

### Section Immobilier (Phase 1)
- Listing des annonces avec filtres (type, ville, prix, statut)
- Page detail annonce avec galerie d'images
- Formulaire de publication d'annonce (agents uniquement)
- Types: Vente, Achat, Location
- Statuts: Disponible, Reserve, Vendu/Loue

### Section Paiements (Phase 2 - Simules)
- Creation de paiements simules
- Methodes: Orange Money, Mobile Money, PayCard, Carte bancaire
- Generation de references uniques
- Statuts: En attente, Confirme, Annule

### Section Procedures & Demarches
- Listing avec sous-categories par pays (Guinee, Canada, France, Turquie, Japon)
- CRUD admin uniquement
- Pages de listing, detail et formulaire de creation

### Dashboard Admin /admin/database
- 5 onglets: Demandes, Utilisateurs, Articles, Annonces, Paiements
- Compteurs en temps reel
- CRUD complet avec filtres et pagination
- Export CSV pour toutes les sections
- Confirmation obligatoire avant suppression

### Systeme d'Approbation des Roles (NOUVEAU - Mars 2026)
- Inscription auteur/agent cree un statut "pending" et role "visiteur"
- Notification admin creee automatiquement
- Onglet "Demandes" dans dashboard admin avec boutons Approuver/Rejeter
- Badge notification dans le header pour l'admin
- Banniere "en attente" sur le profil des utilisateurs pending
- 3 options de role a l'inscription (Visiteur, Auteur, Agent)
- Message d'info sur la validation admin pour auteur/agent

### Fonctionnalites Transverses
- Responsivite complete (mobile 375px, tablette 768px, desktop)
- Widget chat d'aide (remplacement badge Emergent)
- Logo Nimba sur les pages de categories
- Menu profil admin reorganise

### Editeur de Texte Enrichi (WYSIWYG) - Mars 2026
- Editeur type Word integre dans les 3 formulaires (articles, annonces, procedures)
- Fonctionnalites: Undo/Redo, Titres H1-H3, Gras/Italique/Souligne/Barre
- Taille de police, couleur du texte, alignement (gauche/centre/droite/justifie)
- Listes a puces et numerotees, citations, separateurs, encadres
- Insertion de liens hypertexte et upload d'images
- Rendu HTML correct dans les pages de detail

## API Routes

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- PUT /api/auth/profile
- PUT /api/auth/password

### Articles
- GET /api/articles
- GET /api/articles/:id
- POST /api/articles
- PUT /api/articles/:id
- DELETE /api/articles/:id

### Immobilier
- GET /api/properties
- GET /api/properties/:id
- POST /api/properties
- PUT /api/properties/:id
- DELETE /api/properties/:id

### Procedures
- GET /api/procedures/subcategories
- GET /api/procedures
- GET /api/procedures/:id
- POST /api/procedures
- PUT /api/procedures/:id
- DELETE /api/procedures/:id

### Paiements
- POST /api/payments
- GET /api/payments/my
- GET /api/payments
- PUT /api/payments/:id/status

### Admin
- GET /api/admin/stats
- GET /api/admin/users (+ CRUD)
- GET /api/admin/articles (+ DELETE)
- GET /api/admin/properties (+ status update, DELETE)
- GET /api/admin/payments (+ DELETE)
- GET /api/admin/export/{data_type} (CSV)
- GET /api/admin/notifications/count
- GET /api/admin/notifications
- PUT /api/admin/notifications/{id}/action

## Comptes Test
- **Admin**: matrixguinea@gmail.com / strongpassword123

## Backlog

### P1 - Priorite Haute
- Refactoring backend: decomposer server.py en modules

### P2 - Priorite Moyenne
- Phase 3 - Carte Interactive (Leaflet.js)
- Inscription publique des agents immobiliers
- Notifications par email

### P3 - Backlog
- Modele economique (abonnements agents)
- Integration reelle API de paiement (Orange Money, etc.)
- PWA / mode hors ligne
- Dashboard analytics avance

## Issues Connues
- Le rate limiter retourne parfois HTTP 520 au lieu de 429 (probleme infrastructure Kubernetes)

# Matrix News - Changelog

## [Mars 2026 - Iteration 4] - Secure OTP Verification System

### Added
- **Systeme OTP securise complet**:
  - Page `/inscription` avec nom complet, email, telephone, mot de passe, selection de role (Visiteur/Auteur/Agent)
  - Page `/verification` avec 6 inputs OTP individuels, collage automatique, tentatives restantes, cooldown 60s, mode dev
  - Page `/connexion` simplifiee (login uniquement)
  - Backend: OTP hache SHA-256, 5 tentatives max, rate limiting 5 req/min, expiration 5 min
  - Statuts utilisateur: `pending_verification` -> `active` (ou `pending` pour roles pro)
  - `eligible_trusted_badge` pour agents et auteurs
  - Vue admin: filtres verified/unverified/pending, stats enrichies
  - Animation de succes + redirect dashboard personnalise
  - Logs de verification avec timestamps

### Changed
- Auth routes reecrites avec securite renforcee
- Modele utilisateur enrichi: full_name, email_verified, verified_at, verification_logs, eligible_trusted_badge
- Header: lien inscription pointe vers /inscription
- Auth gate: bouton "Creer un compte" pointe vers /inscription

### Fixed
- **Caracteres speciaux (HTML entities)**: La fonction `sanitize()` utilisait `html.escape()` qui convertissait `'` en `&#x27;`, `&` en `&amp;`, etc. Remplacee par `re.sub(r'<[^>]+>', '', text)` qui supprime les balises HTML mais preserve tous les caracteres Unicode (accents, apostrophes, guillemets). Donnees existantes nettoyees dans la base.
- **Editeur d'articles (texte a l'envers)**: Le `RichTextBlock` utilisait `dangerouslySetInnerHTML` qui re-rendait le div contentEditable a chaque frappe, reinitialisant le curseur. Corrige avec `useEffect` + `isInitialized` ref pour ne definir innerHTML qu'au montage. Ajout de `dir="ltr"` et `direction: ltr` explicites.
- **Notifications admin (erreur chargement)**: Amelioration de la gestion d'erreur dans `fetchNotifications` — passage de `undefined` au lieu de chaine vide pour le filtre status, ajout de `console.error` pour le debugging.

## [Mars 2026 - Iteration 2] - Bug Fixes: Avatar Dropdown, Dashboard Mobile

### Fixed
- **Menu avatar non scrollable sur mobile/tablette**: Ajout de `max-h-[calc(100vh-70px)]`, `overflow-y-auto` et `overscroll-contain`
- **Fleche du menu mal positionnee**: Repositionnement de `right-4` vers `right-[18px]` pour aligner avec le point vert
- **Dashboard procedures admin: onglets page blanche sur mobile**: Sidebar collapsible (cachee par defaut, bouton hamburger)
- **API calls dashboard separes**: Remplacement du `Promise.all` par 3 appels independants

## [Mars 2026 - Iteration 1] - Auth Gate, Video Support, File Download Fix, Cloud Images

### Added
- **Auth Gate**: Overlay modal sur `/procedures/:id` et `/immobilier/:id` pour utilisateurs non connectes
- **Support Video dans Procedures**: Champ `video_url` au niveau procedure et etape, lecteur YouTube embed ou video native
- **Support Liens dans Etapes**: Champ `links[]` dans chaque etape de procedure

### Fixed
- **Telechargement de fichiers**: Telechargement programmatique (fetch + blob) au lieu de `<a target="_blank">`
- **Images persistantes**: Migration de 59 images locales vers cloud storage, URLs relatives `/api/media/cloud/...`
- **Route upload**: Retourne desormais des URLs relatives cloud (independantes du domaine)

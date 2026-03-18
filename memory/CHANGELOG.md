# Matrix News - Changelog

## [Mars 2026 - Iteration 3] - Special Characters, Editor Fix, Notifications

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

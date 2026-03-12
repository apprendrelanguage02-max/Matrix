# Matrix News - Changelog

## [Mars 2026] - Auth Gate, Video Support, File Download Fix

### Added
- **Auth Gate (Barriere d'authentification)**: Overlay modal sur les pages `/procedures/:id` et `/immobilier/:id` pour les utilisateurs non connectes, avec boutons "Se connecter" et "Creer un compte"
- **Support Video dans Procedures**: Champ `video_url` au niveau procedure et au niveau etape. Lecteur YouTube embed ou video native. Input dans le Procedure Builder admin.
- **Support Liens dans Etapes**: Champ `links[]` dans chaque etape de procedure avec gestion ajout/suppression dans le builder admin et affichage sur la page publique
- **VideoPlayer component**: Composant reutilisable qui detecte automatiquement les URLs YouTube pour afficher un embed ou un lecteur video natif

### Fixed
- **Telechargement de fichiers**: Remplacement de l'approche `<a target="_blank">` par un telechargement programmatique (fetch + blob + createObjectURL) plus fiable cross-browser
- **Nested buttons HTML warning**: Correction du bouton imbrique dans la section etapes de ProcedureDetailPage

### Changed
- Backend `routes/procedures.py`: Les routes create/update sauvegardent desormais `video_url`, `links` dans les etapes et `video_url` au niveau procedure
- Backend `models/procedure.py`: Ajout de `video_url` dans ProcedureUpdate et ProcedureOut
- Frontend `ProcedureBuilder.js`: Nouveaux champs de saisie pour video URL et liens dans le formulaire
- Frontend `ProcedureDetailPage.js`: Affichage video, liens, auth gate, telechargement corrige
- Frontend `PropertyDetailPage.js`: Auth gate overlay pour utilisateurs non connectes

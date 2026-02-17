# NewsApp - PRD

## Problème original
Application web full-stack de publication de news. Orange #FF6600, Noir, Blanc. Interface française. Un auteur admin unique. JWT auth. Images via URL externe. Pas de catégories (V1).

## Architecture
- Frontend: React (CRA + Craco + Tailwind) → port 3000
- Backend: FastAPI → port 8001
- DB: MongoDB (motor async)
- Auth: JWT via pyjwt + bcrypt

## Ce qui a été implémenté (Jan 2026)
- Authentification JWT (register/login/logout)
- CRUD complet articles (create, read, update, delete)
- Protection routes privées (/admin/*)
- Page publique: liste articles + page détail
- Dashboard auteur avec stats
- Formulaire article (titre, contenu, URL image optionnelle + preview)
- Design Swiss Editorial: Oswald + Manrope, Orange #FF6600

## API Routes
- POST /api/auth/register
- POST /api/auth/login
- GET /api/articles (public)
- GET /api/articles/:id (public)
- GET /api/my-articles (auth)
- POST /api/articles (auth)
- PUT /api/articles/:id (auth, own)
- DELETE /api/articles/:id (auth, own)

## Backlog P1
- Recherche d'articles
- Pagination
- Catégories/tags (V2)
- Preview article avant publication
- Multiple auteurs

## Compte admin
- Email: admin@newsapp.fr
- Password: admin123

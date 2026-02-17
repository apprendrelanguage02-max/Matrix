from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query, Response
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import logging
import html
import re
import bleach
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'newsapp_secret_key_change_in_prod')
JWT_ALGORITHM = 'HS256'

# ─── Catégories prédéfinies ────────────────────────────────────────────────────
CATEGORIES = ["Actualité", "Politique", "Sport", "Technologie", "Économie"]

# ─── Rate Limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Trop de tentatives. Réessayez dans une minute."}
    )

api_router = APIRouter(prefix="/api")
security = HTTPBearer()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Sanitisation XSS ─────────────────────────────────────────────────────────
def sanitize(text: str) -> str:
    """Échappe les caractères HTML dangereux."""
    if not text:
        return text
    return html.escape(text.strip())

def sanitize_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    url = url.strip()
    if not re.match(r'^https?://', url):
        return None
    return url

# ─── Pydantic Models ───────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)

    @field_validator('username')
    @classmethod
    def username_alphanum(cls, v):
        if not re.match(r'^[\w\- ]+$', v):
            raise ValueError('Nom d\'utilisateur invalide')
        return v.strip()

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=100)

class UserOut(BaseModel):
    id: str
    username: str
    email: str
    role: str = "visiteur"
    created_at: str = ""

class TokenResponse(BaseModel):
    token: str
    user: UserOut

class ArticleCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    content: str = Field(min_length=10, max_length=50000)
    image_url: Optional[str] = Field(default=None, max_length=2000)
    category: str

    @field_validator('category')
    @classmethod
    def valid_category(cls, v):
        if v not in CATEGORIES:
            raise ValueError(f'Catégorie invalide. Choisissez parmi : {", ".join(CATEGORIES)}')
        return v

class ArticleUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=200)
    content: Optional[str] = Field(default=None, min_length=10, max_length=50000)
    image_url: Optional[str] = Field(default=None, max_length=2000)
    category: Optional[str] = None

    @field_validator('category')
    @classmethod
    def valid_category(cls, v):
        if v is not None and v not in CATEGORIES:
            raise ValueError(f'Catégorie invalide')
        return v

class ArticleOut(BaseModel):
    id: str
    title: str
    content: str
    image_url: Optional[str] = None
    published_at: str
    author_id: str
    author_username: str
    views: int = 0
    category: str = "Actualité"

class PaginatedArticles(BaseModel):
    articles: List[ArticleOut]
    total: int
    page: int
    pages: int
    limit: int

# ─── JWT Helpers ───────────────────────────────────────────────────────────────

def create_token(user_id: str) -> str:
    payload = {"sub": user_id}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token invalide")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Session expirée")
        return user
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")

async def require_author(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "auteur":
        raise HTTPException(status_code=403, detail="Accès réservé aux auteurs")
    return current_user

# ─── Auth Routes ───────────────────────────────────────────────────────────────

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt(rounds=12)).decode()
    user_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "id": user_id,
        "username": sanitize(data.username),
        "email": data.email,
        "hashed_password": hashed,
        "role": "visiteur",
        "created_at": created_at
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id)
    return TokenResponse(
        token=token,
        user=UserOut(id=user_id, username=user_doc["username"], email=data.email, role="visiteur", created_at=created_at)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    # Constant-time comparison even if user not found
    dummy_hash = "$2b$12$dummy_hash_for_timing_attack_prevention_only"
    stored_hash = user["hashed_password"] if user else dummy_hash
    valid = bcrypt.checkpw(data.password.encode(), stored_hash.encode())
    if not user or not valid:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    token = create_token(user["id"])
    return TokenResponse(
        token=token,
        user=UserOut(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            role=user.get("role", "visiteur"),
            created_at=user.get("created_at", "")
        )
    )

@api_router.get("/auth/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserOut(
        id=current_user["id"],
        username=current_user["username"],
        email=current_user["email"],
        role=current_user.get("role", "visiteur"),
        created_at=current_user.get("created_at", "")
    )

# ─── Public Routes ─────────────────────────────────────────────────────────────

@api_router.get("/categories")
async def get_categories():
    return {"categories": CATEGORIES}

@api_router.get("/articles", response_model=PaginatedArticles)
async def get_articles(
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    search: Optional[str] = Query(None, max_length=200)
):
    query = {}
    if category and category in CATEGORIES:
        query["category"] = category
    if search:
        safe_search = re.escape(search.strip())
        query["$or"] = [
            {"title": {"$regex": safe_search, "$options": "i"}},
            {"content": {"$regex": safe_search, "$options": "i"}}
        ]

    total = await db.articles.count_documents(query)
    pages = max(1, -(-total // limit))  # ceil division
    skip = (page - 1) * limit

    articles = await db.articles.find(query, {"_id": 0}).sort("published_at", -1).skip(skip).limit(limit).to_list(limit)

    return PaginatedArticles(
        articles=articles,
        total=total,
        page=page,
        pages=pages,
        limit=limit
    )

@api_router.get("/articles/{article_id}", response_model=ArticleOut)
async def get_article(article_id: str):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article introuvable")
    return article

# ─── Protected Routes ──────────────────────────────────────────────────────────

@api_router.get("/my-articles", response_model=List[ArticleOut])
async def get_my_articles(current_user: dict = Depends(require_author)):
    articles = await db.articles.find(
        {"author_id": current_user["id"]}, {"_id": 0}
    ).sort("published_at", -1).to_list(200)
    return articles

@api_router.post("/articles", response_model=ArticleOut)
async def create_article(data: ArticleCreate, current_user: dict = Depends(require_author)):
    article_id = str(uuid.uuid4())
    article_doc = {
        "id": article_id,
        "title": sanitize(data.title),
        "content": data.content.strip(),  # contenu peut avoir du HTML via img tags
        "image_url": sanitize_url(data.image_url),
        "category": data.category,
        "published_at": datetime.now(timezone.utc).isoformat(),
        "author_id": current_user["id"],
        "author_username": current_user["username"],
        "views": 0
    }
    await db.articles.insert_one(article_doc)
    return article_doc

@api_router.post("/articles/{article_id}/view")
async def increment_view(article_id: str):
    result = await db.articles.find_one_and_update(
        {"id": article_id},
        {"$inc": {"views": 1}},
        return_document=True,
        projection={"_id": 0}
    )
    if not result:
        raise HTTPException(status_code=404, detail="Article introuvable")
    return {"views": result.get("views", 1)}

@api_router.put("/articles/{article_id}", response_model=ArticleOut)
async def update_article(
    article_id: str,
    data: ArticleUpdate,
    current_user: dict = Depends(require_author)
):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article introuvable")
    if article["author_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Non autorisé")

    updates = {}
    if data.title is not None:
        updates["title"] = sanitize(data.title)
    if data.content is not None:
        updates["content"] = data.content.strip()
    if data.image_url is not None:
        updates["image_url"] = sanitize_url(data.image_url)
    if data.category is not None:
        updates["category"] = data.category

    if updates:
        await db.articles.update_one({"id": article_id}, {"$set": updates})

    updated = await db.articles.find_one({"id": article_id}, {"_id": 0})
    return updated

@api_router.delete("/articles/{article_id}")
async def delete_article(article_id: str, current_user: dict = Depends(require_author)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article introuvable")
    if article["author_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Non autorisé")
    await db.articles.delete_one({"id": article_id})
    return {"message": "Article supprimé"}

@api_router.get("/")
async def root():
    return {"message": "Matrix News API v2"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

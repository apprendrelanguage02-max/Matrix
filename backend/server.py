from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query, Response, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
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
import shutil
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

# ─── Upload directories ────────────────────────────────────────────────────────
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_IMAGES_DIR = UPLOAD_DIR / "images"
UPLOAD_VIDEOS_DIR = UPLOAD_DIR / "videos"
UPLOAD_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_VIDEOS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024   # 5 MB
MAX_VIDEO_SIZE = 20 * 1024 * 1024  # 20 MB

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

# Tags et attributs HTML autorisés (contenu Quill)
ALLOWED_TAGS = [
    "p", "br", "strong", "em", "u", "s",
    "h2", "h3", "h4",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "img", "a",
    "span", "div",
]
ALLOWED_ATTRS = {
    "img": ["src", "alt", "title", "loading", "width", "height"],
    "a":   ["href", "title", "target"],
    "*":   ["class"],
}
ALLOWED_PROTOCOLS = ["http", "https", "mailto"]

def sanitize_html(content: str) -> str:
    """Sanitise le HTML Quill contre XSS, valide les URL d'images."""
    if not content:
        return content
    cleaned = bleach.clean(
        content,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    )
    # Valider les src des img : uniquement http/https
    def validate_img_src(m):
        tag = m.group(0)
        src_match = re.search(r'src=["\']([^"\']*)["\']', tag)
        if src_match:
            src = src_match.group(1)
            if not re.match(r'^https?://', src):
                return ""  # Supprimer img avec src invalide
        return tag
    cleaned = re.sub(r'<img[^>]*>', validate_img_src, cleaned)
    return cleaned

def sanitize(text: str) -> str:
    """Échappe les caractères HTML dangereux pour les champs texte."""
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
    phone: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

class UserProfileUpdate(BaseModel):
    username: Optional[str] = Field(default=None, min_length=2, max_length=50)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=30)
    country: Optional[str] = Field(default=None, max_length=100)
    address: Optional[str] = Field(default=None, max_length=300)
    avatar_url: Optional[str] = Field(default=None, max_length=2000)
    bio: Optional[str] = Field(default=None, max_length=500)

class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=100)
    new_password: str = Field(min_length=6, max_length=100)

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

class SavedArticleOut(BaseModel):
    id: str
    user_id: str
    article_id: str
    saved_at: str
    article: Optional[ArticleOut] = None

# ─── JWT Helpers ───────────────────────────────────────────────────────────────

def create_token(user_id: str) -> str:
    payload = {"sub": user_id}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def user_to_out(user: dict) -> UserOut:
    return UserOut(
        id=user["id"],
        username=user["username"],
        email=user["email"],
        role=user.get("role", "visiteur"),
        created_at=user.get("created_at", ""),
        phone=user.get("phone"),
        country=user.get("country"),
        address=user.get("address"),
        avatar_url=user.get("avatar_url"),
        bio=user.get("bio"),
    )

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
    dummy_hash = "$2b$12$dummy_hash_for_timing_attack_prevention_only"
    stored_hash = user["hashed_password"] if user else dummy_hash
    valid = bcrypt.checkpw(data.password.encode(), stored_hash.encode())
    if not user or not valid:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    token = create_token(user["id"])
    return TokenResponse(token=token, user=user_to_out(user))

@api_router.get("/auth/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    return user_to_out(current_user)

@api_router.put("/auth/profile", response_model=UserOut)
async def update_profile(data: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    updates = {}
    if data.username is not None:
        # Check username uniqueness
        existing = await db.users.find_one({"username": sanitize(data.username), "id": {"$ne": current_user["id"]}}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà pris")
        updates["username"] = sanitize(data.username)
    if data.email is not None:
        existing = await db.users.find_one({"email": data.email, "id": {"$ne": current_user["id"]}}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
        updates["email"] = data.email
    if data.phone is not None:
        updates["phone"] = sanitize(data.phone)
    if data.country is not None:
        updates["country"] = sanitize(data.country)
    if data.address is not None:
        updates["address"] = sanitize(data.address)
    if data.avatar_url is not None:
        updates["avatar_url"] = sanitize_url(data.avatar_url)
    if data.bio is not None:
        updates["bio"] = sanitize(data.bio)

    if updates:
        await db.users.update_one({"id": current_user["id"]}, {"$set": updates})

    updated = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    return user_to_out(updated)

@api_router.put("/auth/password")
async def change_password(data: PasswordChange, current_user: dict = Depends(get_current_user)):
    if not bcrypt.checkpw(data.current_password.encode(), current_user["hashed_password"].encode()):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    new_hash = bcrypt.hashpw(data.new_password.encode(), bcrypt.gensalt(rounds=12)).decode()
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"hashed_password": new_hash}})
    return {"message": "Mot de passe mis à jour avec succès"}

# ─── Saved Articles Routes ─────────────────────────────────────────────────────

@api_router.get("/saved-articles", response_model=List[SavedArticleOut])
async def get_saved_articles(current_user: dict = Depends(get_current_user)):
    saved = await db.saved_articles.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).sort("saved_at", -1).to_list(200)

    result = []
    for s in saved:
        art = await db.articles.find_one({"id": s["article_id"]}, {"_id": 0})
        result.append(SavedArticleOut(**s, article=art))
    return result

@api_router.get("/saved-articles/{article_id}/status")
async def get_save_status(article_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.saved_articles.find_one(
        {"user_id": current_user["id"], "article_id": article_id}, {"_id": 0}
    )
    return {"is_saved": existing is not None}

@api_router.post("/saved-articles/{article_id}")
async def save_article(article_id: str, current_user: dict = Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article introuvable")
    existing = await db.saved_articles.find_one(
        {"user_id": current_user["id"], "article_id": article_id}, {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Article déjà sauvegardé")
    saved_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "article_id": article_id,
        "saved_at": datetime.now(timezone.utc).isoformat()
    }
    await db.saved_articles.insert_one(saved_doc)
    return {"message": "Article sauvegardé", "is_saved": True}

@api_router.delete("/saved-articles/{article_id}")
async def unsave_article(article_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.saved_articles.delete_one(
        {"user_id": current_user["id"], "article_id": article_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sauvegarde introuvable")
    return {"message": "Sauvegarde supprimée", "is_saved": False}

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
        "content": sanitize_html(data.content),  # HTML Quill sanitisé
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
        updates["content"] = sanitize_html(data.content)
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


@api_router.post("/upload")
async def upload_media(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload an image (JPG/PNG/WEBP ≤5 MB) or video (MP4/WebM ≤20 MB)."""
    content_type = file.content_type or ""

    if content_type in ALLOWED_IMAGE_TYPES:
        max_size = MAX_IMAGE_SIZE
        save_dir = UPLOAD_IMAGES_DIR
        media_type = "image"
    elif content_type in ALLOWED_VIDEO_TYPES:
        max_size = MAX_VIDEO_SIZE
        save_dir = UPLOAD_VIDEOS_DIR
        media_type = "video"
    else:
        raise HTTPException(status_code=400, detail="Type de fichier non autorisé. Utilisez JPG, PNG, WEBP, MP4 ou WebM.")

    # Read and validate size
    data = await file.read()
    if len(data) > max_size:
        limit_mb = max_size // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Fichier trop volumineux. Limite : {limit_mb} Mo.")

    # Generate unique filename
    ext = Path(file.filename).suffix.lower() if file.filename else ""
    if not ext:
        ext = ".jpg" if media_type == "image" else ".mp4"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    dest = save_dir / unique_name

    # Save file
    with open(dest, "wb") as f:
        f.write(data)

    # Build public URL
    backend_url = os.environ.get("REACT_APP_BACKEND_URL", "")
    public_url = f"{backend_url}/media/{media_type}s/{unique_name}"

    return {"url": public_url, "type": media_type, "filename": unique_name}


app.include_router(api_router)

# ─── Servir les fichiers uploadés ─────────────────────────────────────────────
app.mount("/media", StaticFiles(directory=str(UPLOAD_DIR)), name="media")

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

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
import random
import string
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt

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

# ─── Sous-catégories Procédures ────────────────────────────────────────────────
PROCEDURE_SUBCATEGORIES = [
    {"id": "guinee", "name": "Procédures en Guinée", "flag": "🇬🇳"},
    {"id": "canada", "name": "Procédures Canada", "flag": "🇨🇦"},
    {"id": "france", "name": "Procédures France", "flag": "🇫🇷"},
    {"id": "turquie", "name": "Procédures Turquie", "flag": "🇹🇷"},
    {"id": "japon", "name": "Procédures Japon", "flag": "🇯🇵"},
]

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
    role: str = "visiteur"

    @field_validator('username')
    @classmethod
    def username_alphanum(cls, v):
        if not re.match(r'^[\w\- ]+$', v):
            raise ValueError('Nom d\'utilisateur invalide')
        return v.strip()

    @field_validator('role')
    @classmethod
    def validate_role(cls, v):
        if v not in ("visiteur", "agent"):
            raise ValueError('Rôle invalide. Choisissez visiteur ou agent.')
        return v

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
    status: str = "actif"

class UserAdminOut(BaseModel):
    id: str
    username: str
    email: str
    role: str
    created_at: str = ""
    phone: Optional[str] = None
    country: Optional[str] = None
    status: str = "actif"

class PaginatedUsers(BaseModel):
    users: List[UserAdminOut]
    total: int
    page: int
    pages: int

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
            raise ValueError('Catégorie invalide')
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

# ─── Property Models ───────────────────────────────────────────────────────────
PROPERTY_TYPES = ["achat", "vente", "location"]
PROPERTY_STATUSES = ["disponible", "reserve", "vendu"]

class PropertyCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    type: str
    price: float = Field(gt=0)
    currency: str = "GNF"
    description: str = Field(min_length=10, max_length=20000)
    city: str = Field(min_length=2, max_length=100)
    neighborhood: str = ""
    address: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    seller_name: str = Field(min_length=2, max_length=100)
    seller_phone: str = Field(min_length=8, max_length=25)
    seller_email: str = ""
    seller_whatsapp: str = ""
    images: List[str] = []
    video_url: str = ""

    @field_validator('type')
    @classmethod
    def validate_type(cls, v):
        if v not in PROPERTY_TYPES:
            raise ValueError(f'Type invalide. Valeurs: {PROPERTY_TYPES}')
        return v

class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    city: Optional[str] = None
    neighborhood: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    seller_name: Optional[str] = None
    seller_phone: Optional[str] = None
    seller_email: Optional[str] = None
    seller_whatsapp: Optional[str] = None
    images: Optional[List[str]] = None
    video_url: Optional[str] = None
    status: Optional[str] = None

    @field_validator('type')
    @classmethod
    def validate_type(cls, v):
        if v is not None and v not in PROPERTY_TYPES:
            raise ValueError('Type invalide')
        return v

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        if v is not None and v not in PROPERTY_STATUSES:
            raise ValueError('Statut invalide')
        return v

class PropertyOut(BaseModel):
    id: str
    title: str
    type: str
    price: float
    currency: str
    description: str
    city: str
    neighborhood: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    seller_name: str
    seller_phone: str
    seller_email: str
    seller_whatsapp: str
    images: List[str]
    video_url: str
    status: str
    author_id: str
    author_username: str = ""
    created_at: str
    views: int

class PaginatedProperties(BaseModel):
    properties: List[PropertyOut]
    total: int
    pages: int

# ─── Payment Models ────────────────────────────────────────────────────────────
PAYMENT_METHODS = ["orange_money", "mobile_money", "paycard", "carte_bancaire"]
PAYMENT_STATUSES = ["en_attente", "confirme", "annule"]

def generate_reference() -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M")
    chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"GIMO-{ts}-{chars}"

class PaymentCreate(BaseModel):
    property_id: str
    amount: float = Field(gt=0)
    currency: str = "GNF"
    method: str
    phone: str = ""

    @field_validator('method')
    @classmethod
    def validate_method(cls, v):
        if v not in PAYMENT_METHODS:
            raise ValueError(f'Méthode invalide: {PAYMENT_METHODS}')
        return v

class PaymentOut(BaseModel):
    id: str
    reference: str
    property_id: str
    property_title: str
    user_id: str
    user_email: str
    amount: float
    currency: str
    method: str
    status: str
    phone: str
    created_at: str

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
        status=user.get("status", "actif"),
    )

def user_to_admin_out(user: dict) -> UserAdminOut:
    return UserAdminOut(
        id=user["id"],
        username=user["username"],
        email=user["email"],
        role=user.get("role", "visiteur"),
        created_at=user.get("created_at", ""),
        phone=user.get("phone"),
        country=user.get("country"),
        status=user.get("status", "actif"),
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
    if current_user.get("role") not in ("auteur", "admin"):
        raise HTTPException(status_code=403, detail="Accès réservé aux auteurs")
    return current_user

async def require_agent(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("agent", "auteur", "admin"):
        raise HTTPException(status_code=403, detail="Accès réservé aux agents immobiliers")
    return current_user

async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
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
        "role": data.role,
        "created_at": created_at
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id)
    return TokenResponse(
        token=token,
        user=UserOut(id=user_id, username=user_doc["username"], email=data.email, role=data.role, created_at=created_at)
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


# ═══════════════════════════════════════════════════════════════════════════════
# IMMOBILIER — PROPERTIES
# ═══════════════════════════════════════════════════════════════════════════════

@api_router.get("/properties", response_model=PaginatedProperties)
async def get_properties(
    type: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    status: Optional[str] = Query("disponible"),
    price_min: Optional[float] = Query(None),
    price_max: Optional[float] = Query(None),
    sort: str = Query("recent"),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
):
    query = {}
    if type and type in PROPERTY_TYPES:
        query["type"] = type
    if city:
        query["city"] = {"$regex": city.strip(), "$options": "i"}
    if status and status in PROPERTY_STATUSES:
        query["status"] = status
    elif status == "all":
        pass
    else:
        query["status"] = "disponible"
    if price_min is not None:
        query.setdefault("price", {})["$gte"] = price_min
    if price_max is not None:
        query.setdefault("price", {})["$lte"] = price_max

    sort_field, sort_dir = "created_at", -1
    if sort == "price_asc":
        sort_field, sort_dir = "price", 1
    elif sort == "price_desc":
        sort_field, sort_dir = "price", -1

    total = await db.properties.count_documents(query)
    skip = (page - 1) * limit
    props = await db.properties.find(query, {"_id": 0}).sort(sort_field, sort_dir).skip(skip).limit(limit).to_list(limit)

    # Enrich with author username
    for p in props:
        author = await db.users.find_one({"id": p.get("author_id", "")}, {"_id": 0, "username": 1})
        p["author_username"] = author["username"] if author else ""

    return PaginatedProperties(properties=props, total=total, pages=max(1, -(-total // limit)))


@api_router.get("/properties/{property_id}", response_model=PropertyOut)
async def get_property(property_id: str):
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Annonce introuvable")
    author = await db.users.find_one({"id": prop.get("author_id", "")}, {"_id": 0, "username": 1})
    prop["author_username"] = author["username"] if author else ""
    return prop


@api_router.post("/properties/{property_id}/view")
async def view_property(property_id: str):
    await db.properties.update_one({"id": property_id}, {"$inc": {"views": 1}})
    return {"ok": True}


@api_router.post("/properties", response_model=PropertyOut)
async def create_property(data: PropertyCreate, current_user: dict = Depends(require_agent)):
    prop_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    prop = {
        "id": prop_id,
        "title": sanitize(data.title),
        "type": data.type,
        "price": data.price,
        "currency": data.currency,
        "description": sanitize_html(data.description),
        "city": sanitize(data.city),
        "neighborhood": sanitize(data.neighborhood),
        "address": sanitize(data.address),
        "latitude": data.latitude,
        "longitude": data.longitude,
        "seller_name": sanitize(data.seller_name),
        "seller_phone": sanitize(data.seller_phone),
        "seller_email": sanitize(data.seller_email),
        "seller_whatsapp": sanitize(data.seller_whatsapp),
        "images": [url for url in data.images if url.startswith("http")],
        "video_url": sanitize_url(data.video_url) or "",
        "status": "disponible",
        "author_id": current_user["id"],
        "created_at": now,
        "views": 0,
    }
    await db.properties.insert_one(prop)
    prop["author_username"] = current_user.get("username", "")
    return prop


@api_router.put("/properties/{property_id}", response_model=PropertyOut)
async def update_property(property_id: str, data: PropertyUpdate, current_user: dict = Depends(require_agent)):
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Annonce introuvable")
    if current_user.get("role") != "auteur" and prop["author_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Vous ne pouvez modifier que vos propres annonces")

    updates = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if "title" in updates:
        updates["title"] = sanitize(updates["title"])
    if "description" in updates:
        updates["description"] = sanitize_html(updates["description"])
    if "city" in updates:
        updates["city"] = sanitize(updates["city"])
    if "images" in updates:
        updates["images"] = [u for u in updates["images"] if u.startswith("http")]

    await db.properties.update_one({"id": property_id}, {"$set": updates})
    prop.update(updates)
    author = await db.users.find_one({"id": prop.get("author_id", "")}, {"_id": 0, "username": 1})
    prop["author_username"] = author["username"] if author else ""
    return prop


@api_router.delete("/properties/{property_id}")
async def delete_property(property_id: str, current_user: dict = Depends(require_agent)):
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Annonce introuvable")
    if current_user.get("role") != "auteur" and prop["author_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Vous ne pouvez supprimer que vos propres annonces")
    await db.properties.delete_one({"id": property_id})
    return {"ok": True}


@api_router.get("/my-properties", response_model=List[PropertyOut])
async def get_my_properties(current_user: dict = Depends(require_agent)):
    props = await db.properties.find({"author_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for p in props:
        p["author_username"] = current_user.get("username", "")
    return props


# ═══════════════════════════════════════════════════════════════════════════════
# PAIEMENTS
# ═══════════════════════════════════════════════════════════════════════════════

@api_router.post("/payments", response_model=PaymentOut)
async def create_payment(data: PaymentCreate, current_user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": data.property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Propriété introuvable")
    if prop.get("status") != "disponible":
        raise HTTPException(status_code=400, detail="Cette propriété n'est plus disponible")

    payment_id = str(uuid.uuid4())
    reference = generate_reference()
    now = datetime.now(timezone.utc).isoformat()
    payment = {
        "id": payment_id,
        "reference": reference,
        "property_id": data.property_id,
        "property_title": prop.get("title", ""),
        "user_id": current_user["id"],
        "user_email": current_user.get("email", ""),
        "amount": data.amount,
        "currency": data.currency,
        "method": data.method,
        "phone": sanitize(data.phone),
        "status": "en_attente",
        "created_at": now,
    }
    await db.payments.insert_one(payment)
    # Update property status to reserved
    await db.properties.update_one({"id": data.property_id}, {"$set": {"status": "reserve"}})
    return payment


@api_router.get("/payments/my", response_model=List[PaymentOut])
async def get_my_payments(current_user: dict = Depends(get_current_user)):
    payments = await db.payments.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return payments


@api_router.get("/payments", response_model=List[PaymentOut])
async def get_all_payments(current_user: dict = Depends(require_author)):
    payments = await db.payments.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return payments


@api_router.put("/payments/{payment_id}/status")
async def update_payment_status(payment_id: str, status: str = Query(...), current_user: dict = Depends(require_author)):
    if status not in PAYMENT_STATUSES:
        raise HTTPException(status_code=400, detail="Statut invalide")
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement introuvable")

    await db.payments.update_one({"id": payment_id}, {"$set": {"status": status}})

    # If cancelled, restore property to disponible
    if status == "annule":
        await db.properties.update_one({"id": payment["property_id"]}, {"$set": {"status": "disponible"}})
    elif status == "confirme":
        # Mark as sold/rented
        prop = await db.properties.find_one({"id": payment["property_id"]}, {"_id": 0})
        if prop:
            new_status = "loue" if prop.get("type") == "location" else "vendu"
            await db.properties.update_one({"id": payment["property_id"]}, {"$set": {"status": new_status}})

    return {"ok": True}


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
    public_url = f"{backend_url}/api/media/{media_type}s/{unique_name}"

    return {"url": public_url, "type": media_type, "filename": unique_name}


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN DATABASE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(require_admin)):
    """Get dashboard statistics for admin."""
    total_users = await db.users.count_documents({})
    total_articles = await db.articles.count_documents({})
    total_properties = await db.properties.count_documents({})
    total_payments = await db.payments.count_documents({})
    
    return {
        "total_users": total_users,
        "total_articles": total_articles,
        "total_properties": total_properties,
        "total_payments": total_payments,
    }


@api_router.get("/admin/users", response_model=PaginatedUsers)
async def get_admin_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
    role: str = Query("", max_length=20),
    current_user: dict = Depends(require_admin)
):
    """Get paginated users list for admin."""
    query = {}
    if search:
        query["$or"] = [
            {"username": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    if role:
        query["role"] = role
    
    total = await db.users.count_documents(query)
    pages = (total + limit - 1) // limit
    skip = (page - 1) * limit
    
    users = await db.users.find(query, {"_id": 0, "hashed_password": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return PaginatedUsers(
        users=[user_to_admin_out(u) for u in users],
        total=total,
        page=page,
        pages=pages
    )


@api_router.get("/admin/users/{user_id}")
async def get_admin_user_detail(user_id: str, current_user: dict = Depends(require_admin)):
    """Get single user detail for admin."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return user


@api_router.put("/admin/users/{user_id}/status")
async def update_user_status(user_id: str, status: str = Query(...), current_user: dict = Depends(require_admin)):
    """Suspend or activate a user."""
    if status not in ("actif", "suspendu"):
        raise HTTPException(status_code=400, detail="Statut invalide. Utilisez 'actif' ou 'suspendu'.")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier votre propre statut")
    
    await db.users.update_one({"id": user_id}, {"$set": {"status": status}})
    return {"ok": True, "message": f"Utilisateur {'suspendu' if status == 'suspendu' else 'activé'} avec succès"}


@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, role: str = Query(...), current_user: dict = Depends(require_admin)):
    """Update user role (admin only)."""
    if role not in ("visiteur", "auteur", "agent", "admin"):
        raise HTTPException(status_code=400, detail="Rôle invalide")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier votre propre rôle")
    
    await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    return {"ok": True, "message": f"Rôle mis à jour vers '{role}'"}


@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    """Delete a user and their data."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
    
    # Delete user and their related data
    await db.users.delete_one({"id": user_id})
    await db.articles.delete_many({"author_id": user_id})
    await db.properties.delete_many({"author_id": user_id})
    await db.saved_articles.delete_many({"user_id": user_id})
    await db.payments.delete_many({"user_id": user_id})
    
    return {"ok": True, "message": "Utilisateur et données associées supprimés"}


class ArticleAdminOut(BaseModel):
    id: str
    title: str
    category: str
    author_id: str
    author_username: str
    published_at: str
    views: int
    status: str = "publie"

class PaginatedArticlesAdmin(BaseModel):
    articles: List[ArticleAdminOut]
    total: int
    page: int
    pages: int


@api_router.get("/admin/articles", response_model=PaginatedArticlesAdmin)
async def get_admin_articles(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
    category: str = Query("", max_length=50),
    current_user: dict = Depends(require_admin)
):
    """Get paginated articles for admin."""
    query = {}
    if search:
        query["title"] = {"$regex": search, "$options": "i"}
    if category:
        query["category"] = category
    
    total = await db.articles.count_documents(query)
    pages = (total + limit - 1) // limit
    skip = (page - 1) * limit
    
    articles = await db.articles.find(query, {"_id": 0}).sort("published_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Batch fetch authors
    author_ids = list(set(a.get("author_id", "") for a in articles if a.get("author_id")))
    authors = await db.users.find({"id": {"$in": author_ids}}, {"_id": 0, "id": 1, "username": 1}).to_list(100)
    authors_map = {u["id"]: u["username"] for u in authors}
    
    result = []
    for a in articles:
        result.append(ArticleAdminOut(
            id=a["id"],
            title=a["title"],
            category=a.get("category", "Actualité"),
            author_id=a.get("author_id", ""),
            author_username=authors_map.get(a.get("author_id", ""), ""),
            published_at=a.get("published_at", ""),
            views=a.get("views", 0),
            status=a.get("status", "publie")
        ))
    
    return PaginatedArticlesAdmin(articles=result, total=total, page=page, pages=pages)


@api_router.delete("/admin/articles/{article_id}")
async def admin_delete_article(article_id: str, current_user: dict = Depends(require_admin)):
    """Delete any article (admin only)."""
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article introuvable")
    
    await db.articles.delete_one({"id": article_id})
    await db.saved_articles.delete_many({"article_id": article_id})
    
    return {"ok": True, "message": "Article supprimé"}


class PropertyAdminOut(BaseModel):
    id: str
    title: str
    type: str
    price: float
    currency: str
    city: str
    author_id: str
    author_username: str
    status: str
    created_at: str

class PaginatedPropertiesAdmin(BaseModel):
    properties: List[PropertyAdminOut]
    total: int
    page: int
    pages: int


@api_router.get("/admin/properties", response_model=PaginatedPropertiesAdmin)
async def get_admin_properties(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
    type: str = Query("", max_length=20),
    city: str = Query("", max_length=50),
    status: str = Query("", max_length=20),
    current_user: dict = Depends(require_admin)
):
    """Get paginated properties for admin."""
    query = {}
    if search:
        query["title"] = {"$regex": search, "$options": "i"}
    if type:
        query["type"] = type
    if city:
        query["city"] = city
    if status:
        query["status"] = status
    
    total = await db.properties.count_documents(query)
    pages = (total + limit - 1) // limit
    skip = (page - 1) * limit
    
    props = await db.properties.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Batch fetch authors
    author_ids = list(set(p.get("author_id", "") for p in props if p.get("author_id")))
    authors = await db.users.find({"id": {"$in": author_ids}}, {"_id": 0, "id": 1, "username": 1}).to_list(100)
    authors_map = {u["id"]: u["username"] for u in authors}
    
    result = []
    for p in props:
        result.append(PropertyAdminOut(
            id=p["id"],
            title=p["title"],
            type=p["type"],
            price=p["price"],
            currency=p.get("currency", "GNF"),
            city=p.get("city", ""),
            author_id=p.get("author_id", ""),
            author_username=authors_map.get(p.get("author_id", ""), ""),
            status=p.get("status", "disponible"),
            created_at=p.get("created_at", "")
        ))
    
    return PaginatedPropertiesAdmin(properties=result, total=total, page=page, pages=pages)


@api_router.put("/admin/properties/{property_id}/status")
async def admin_update_property_status(property_id: str, status: str = Query(...), current_user: dict = Depends(require_admin)):
    """Update property status (admin only)."""
    if status not in PROPERTY_STATUSES + ["loue"]:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Annonce introuvable")
    
    await db.properties.update_one({"id": property_id}, {"$set": {"status": status}})
    return {"ok": True, "message": f"Statut mis à jour vers '{status}'"}


@api_router.delete("/admin/properties/{property_id}")
async def admin_delete_property(property_id: str, current_user: dict = Depends(require_admin)):
    """Delete any property (admin only)."""
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Annonce introuvable")
    
    await db.properties.delete_one({"id": property_id})
    await db.payments.delete_many({"property_id": property_id})
    
    return {"ok": True, "message": "Annonce supprimée"}


class PaymentAdminOut(BaseModel):
    id: str
    reference: str
    property_id: str
    property_title: str
    user_id: str
    user_email: str
    amount: float
    currency: str
    method: str
    phone: str
    status: str
    created_at: str

class PaginatedPaymentsAdmin(BaseModel):
    payments: List[PaymentAdminOut]
    total: int
    page: int
    pages: int


@api_router.get("/admin/payments", response_model=PaginatedPaymentsAdmin)
async def get_admin_payments(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: str = Query("", max_length=20),
    method: str = Query("", max_length=30),
    current_user: dict = Depends(require_admin)
):
    """Get paginated payments for admin."""
    query = {}
    if status:
        query["status"] = status
    if method:
        query["method"] = method
    
    total = await db.payments.count_documents(query)
    pages = (total + limit - 1) // limit
    skip = (page - 1) * limit
    
    payments = await db.payments.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return PaginatedPaymentsAdmin(
        payments=[PaymentAdminOut(**p) for p in payments],
        total=total,
        page=page,
        pages=pages
    )


@api_router.delete("/admin/payments/{payment_id}")
async def admin_delete_payment(payment_id: str, current_user: dict = Depends(require_admin)):
    """Delete a payment record (admin only)."""
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement introuvable")
    
    # Restore property status if needed
    if payment.get("status") == "en_attente":
        await db.properties.update_one({"id": payment["property_id"]}, {"$set": {"status": "disponible"}})
    
    await db.payments.delete_one({"id": payment_id})
    return {"ok": True, "message": "Paiement supprimé"}


@api_router.get("/admin/export/users")
async def export_users_csv(current_user: dict = Depends(require_admin)):
    """Export users as CSV."""
    users = await db.users.find({}, {"_id": 0, "hashed_password": 0}).to_list(10000)
    
    csv_lines = ["id,username,email,role,phone,country,status,created_at"]
    for u in users:
        line = f'"{u.get("id", "")}","{u.get("username", "")}","{u.get("email", "")}","{u.get("role", "")}","{u.get("phone", "")}","{u.get("country", "")}","{u.get("status", "actif")}","{u.get("created_at", "")}"'
        csv_lines.append(line)
    
    csv_content = "\n".join(csv_lines)
    return Response(content=csv_content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=utilisateurs.csv"})


@api_router.get("/admin/export/articles")
async def export_articles_csv(current_user: dict = Depends(require_admin)):
    """Export articles as CSV."""
    articles = await db.articles.find({}, {"_id": 0, "content": 0}).to_list(10000)
    
    csv_lines = ["id,title,category,author_id,published_at,views"]
    for a in articles:
        title = a.get("title", "").replace('"', '""')
        line = f'"{a.get("id", "")}","{title}","{a.get("category", "")}","{a.get("author_id", "")}","{a.get("published_at", "")}",{a.get("views", 0)}'
        csv_lines.append(line)
    
    csv_content = "\n".join(csv_lines)
    return Response(content=csv_content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=articles.csv"})


@api_router.get("/admin/export/properties")
async def export_properties_csv(current_user: dict = Depends(require_admin)):
    """Export properties as CSV."""
    props = await db.properties.find({}, {"_id": 0, "description": 0, "images": 0}).to_list(10000)
    
    csv_lines = ["id,title,type,price,currency,city,status,author_id,created_at"]
    for p in props:
        title = p.get("title", "").replace('"', '""')
        line = f'"{p.get("id", "")}","{title}","{p.get("type", "")}",{p.get("price", 0)},"{p.get("currency", "GNF")}","{p.get("city", "")}","{p.get("status", "")}","{p.get("author_id", "")}","{p.get("created_at", "")}"'
        csv_lines.append(line)
    
    csv_content = "\n".join(csv_lines)
    return Response(content=csv_content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=annonces.csv"})


@api_router.get("/admin/export/payments")
async def export_payments_csv(current_user: dict = Depends(require_admin)):
    """Export payments as CSV."""
    payments = await db.payments.find({}, {"_id": 0}).to_list(10000)
    
    csv_lines = ["id,reference,property_title,user_email,amount,currency,method,status,created_at"]
    for p in payments:
        title = p.get("property_title", "").replace('"', '""')
        line = f'"{p.get("id", "")}","{p.get("reference", "")}","{title}","{p.get("user_email", "")}",{p.get("amount", 0)},"{p.get("currency", "GNF")}","{p.get("method", "")}","{p.get("status", "")}","{p.get("created_at", "")}"'
        csv_lines.append(line)
    
    csv_content = "\n".join(csv_lines)
    return Response(content=csv_content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=paiements.csv"})


app.include_router(api_router)

# ─── Servir les fichiers uploadés ─────────────────────────────────────────────
app.mount("/api/media", StaticFiles(directory=str(UPLOAD_DIR)), name="media")

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

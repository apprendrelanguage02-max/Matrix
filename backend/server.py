from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'newsapp_secret_key_change_in_prod')
JWT_ALGORITHM = 'HS256'

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Pydantic Models ───────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    username: str
    email: str

class TokenResponse(BaseModel):
    token: str
    user: UserOut

class ArticleCreate(BaseModel):
    title: str
    content: str
    image_url: Optional[str] = None

class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None

class ArticleOut(BaseModel):
    id: str
    title: str
    content: str
    image_url: Optional[str] = None
    published_at: str
    author_id: str
    author_username: str
    views: int = 0

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
            raise HTTPException(status_code=401, detail="Utilisateur introuvable")
        return user
    except (jwt.InvalidTokenError, Exception):
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")

# ─── Auth Routes ───────────────────────────────────────────────────────────────

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "username": data.username,
        "email": data.email,
        "hashed_password": hashed,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)

    token = create_token(user_id)
    return TokenResponse(
        token=token,
        user=UserOut(id=user_id, username=data.username, email=data.email)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    if not bcrypt.checkpw(data.password.encode(), user["hashed_password"].encode()):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    token = create_token(user["id"])
    return TokenResponse(
        token=token,
        user=UserOut(id=user["id"], username=user["username"], email=user["email"])
    )

# ─── Public Article Routes ─────────────────────────────────────────────────────

@api_router.get("/articles", response_model=List[ArticleOut])
async def get_articles():
    articles = await db.articles.find({}, {"_id": 0}).sort("published_at", -1).to_list(100)
    return articles

@api_router.get("/articles/{article_id}", response_model=ArticleOut)
async def get_article(article_id: str):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article introuvable")
    return article

# ─── Protected Article Routes ──────────────────────────────────────────────────

@api_router.get("/my-articles", response_model=List[ArticleOut])
async def get_my_articles(current_user: dict = Depends(get_current_user)):
    articles = await db.articles.find(
        {"author_id": current_user["id"]}, {"_id": 0}
    ).sort("published_at", -1).to_list(100)
    return articles

@api_router.post("/articles", response_model=ArticleOut)
async def create_article(data: ArticleCreate, current_user: dict = Depends(get_current_user)):
    article_id = str(uuid.uuid4())
    article_doc = {
        "id": article_id,
        "title": data.title.strip(),
        "content": data.content.strip(),
        "image_url": data.image_url.strip() if data.image_url else None,
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
    current_user: dict = Depends(get_current_user)
):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article introuvable")
    if article["author_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Non autorisé")

    updates = {}
    if data.title is not None:
        updates["title"] = data.title.strip()
    if data.content is not None:
        updates["content"] = data.content.strip()
    if data.image_url is not None:
        updates["image_url"] = data.image_url.strip() if data.image_url else None

    if updates:
        await db.articles.update_one({"id": article_id}, {"$set": updates})

    updated = await db.articles.find_one({"id": article_id}, {"_id": 0})
    return updated

@api_router.delete("/articles/{article_id}")
async def delete_article(article_id: str, current_user: dict = Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article introuvable")
    if article["author_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Non autorisé")
    await db.articles.delete_one({"id": article_id})
    return {"message": "Article supprimé"}

@api_router.get("/")
async def root():
    return {"message": "NewsApp API v1"}

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

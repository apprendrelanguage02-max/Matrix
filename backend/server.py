from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware
from datetime import datetime

from app.core.database import db
from app.core.config import settings
from app.models.user import UserOut   # 🔥 NOUVEL IMPORT

# ─────────────────────────────────────────
# APP INIT
# ─────────────────────────────────────────

app = FastAPI(title="News App API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ⚠️ en prod limite au domaine frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────
# RATE LIMIT
# ─────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# ─────────────────────────────────────────
# UTILS
# ─────────────────────────────────────────

def sanitize(value: str) -> str:
    if not value:
        return value
    return value.strip()

def sanitize_url(value: str) -> str:
    if not value:
        return value
    return value.strip()

def user_to_out(user: dict):
    return UserOut(
        id=user["id"],
        username=user["username"],
        email=user["email"],
        role=user.get("role", "reader"),
        created_at=user.get("created_at"),
        phone=user.get("phone"),
        country=user.get("country"),
        address=user.get("address"),
        avatar_url=user.get("avatar_url"),
        bio=user.get("bio"),
    )

# ─────────────────────────────────────────
# API ROUTER
# ─────────────────────────────────────────

api_router = APIRouter(prefix="/api")

# ─────────────────────────────────────────
# IMPORT ROUTES
# ─────────────────────────────────────────

from app.routes.auth import router as auth_router

api_router.include_router(auth_router)

app.include_router(api_router)

# ─────────────────────────────────────────
# ROOT ENDPOINT
# ─────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "News App API",
        "timestamp": datetime.utcnow()
    }
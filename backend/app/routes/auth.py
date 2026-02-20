from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter
from slowapi.util import get_remote_address
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt

from app.core.config import settings
from app.models.user import (
    UserRegister,
    UserLogin,
    UserProfileUpdate,
    PasswordChange,
    UserOut,
    TokenResponse
)
from app.models.auth import TokenResponse
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()
limiter = Limiter(key_func=get_remote_address)


# ─── JWT Helpers ─────────────────────────

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


# ─── AUTH ROUTES ─────────────────────────

@router.post("/register", response_model=TokenResponse)
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
        user=UserOut(
            id=user_id,
            username=user_doc["username"],
            email=data.email,
            role=data.role,
            created_at=created_at
        )
    )


@router.post("/login", response_model=TokenResponse)
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


@router.get("/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    return user_to_out(current_user)


@router.put("/profile", response_model=UserOut)
async def update_profile(data: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    updates = {}

    if data.username is not None:
        existing = await db.users.find_one(
            {"username": sanitize(data.username), "id": {"$ne": current_user["id"]}},
            {"_id": 0},
        )
        if existing:
            raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà pris")
        updates["username"] = sanitize(data.username)

    if data.email is not None:
        existing = await db.users.find_one(
            {"email": data.email, "id": {"$ne": current_user["id"]}},
            {"_id": 0},
        )
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


@router.put("/password")
async def change_password(data: PasswordChange, current_user: dict = Depends(get_current_user)):
    if not bcrypt.checkpw(
        data.current_password.encode(),
        current_user["hashed_password"].encode()
    ):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")

    new_hash = bcrypt.hashpw(data.new_password.encode(), bcrypt.gensalt(rounds=12)).decode()

    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"hashed_password": new_hash}}
    )

    return {"message": "Mot de passe mis à jour avec succès"}
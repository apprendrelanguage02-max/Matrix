from fastapi import APIRouter, HTTPException, Depends, Request
from database import db
from config import JWT_SECRET, JWT_ALGORITHM
from models.user import (
    UserRegister, UserLogin, UserOut, UserProfileUpdate,
    PasswordChange, TokenResponse, user_to_out
)
from middleware.auth import get_current_user
from utils import sanitize, sanitize_url
import bcrypt
import uuid
import jwt
import random
import os
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, EmailStr

router = APIRouter(tags=["auth"])
logger = logging.getLogger(__name__)


def create_token(user_id: str) -> str:
    payload = {"sub": user_id}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def _send_otp_email(email: str, code: str):
    """Send OTP via Resend. Falls back to dev mode if no API key."""
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        logger.info(f"[DEV MODE] OTP for {email}: {code}")
        return False  # dev mode

    try:
        import resend
        resend.api_key = api_key
        html = f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#FF6600;margin-bottom:8px">GIMO / Matrix News</h2>
          <p style="color:#333;margin-bottom:24px">Voici votre code de vérification :</p>
          <div style="background:#f5f5f5;border:2px solid #FF6600;border-radius:8px;padding:24px;text-align:center">
            <span style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#000">{code}</span>
          </div>
          <p style="color:#888;font-size:13px;margin-top:16px">Ce code expire dans 5 minutes. Ne le partagez pas.</p>
        </div>
        """
        params = {
            "from": "GIMO <onboarding@resend.dev>",
            "to": [email],
            "subject": f"Votre code de vérification : {code}",
            "html": html,
        }
        await asyncio.to_thread(resend.Emails.send, params)
        return True
    except Exception as e:
        logger.error(f"Resend error: {e}")
        return False


class OTPRequest(BaseModel):
    email: EmailStr


@router.post("/send-otp")
async def send_otp(data: OTPRequest):
    """Generate and send 6-digit OTP to email."""
    # Check if email is already registered
    existing = await db.users.find_one({"email": data.email}, {"_id": 0, "id": 1})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé.")

    # Generate 6-digit OTP
    code = str(random.randint(100000, 999999))
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(minutes=5)).isoformat()

    # Store (replace any previous OTP for this email)
    await db.otp_codes.delete_many({"email": data.email})
    await db.otp_codes.insert_one({
        "email": data.email,
        "code": code,
        "created_at": now.isoformat(),
        "expires_at": expires_at,
        "verified": False,
    })

    sent = await _send_otp_email(data.email, code)

    if not sent:
        # Dev mode: return code so it can be displayed in UI
        return {"sent": False, "dev_otp": code, "message": "Mode développement : email service non configuré."}

    return {"sent": True, "message": f"Code envoyé à {data.email}"}


@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister):
    if data.role == "admin":
        raise HTTPException(status_code=403, detail="Rôle non autorisé")

    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    # Verify OTP
    otp_code = getattr(data, "otp", None)
    if not otp_code:
        raise HTTPException(status_code=400, detail="Le code de vérification est requis.")

    otp_doc = await db.otp_codes.find_one({"email": data.email}, {"_id": 0})
    if not otp_doc:
        raise HTTPException(status_code=400, detail="Aucun code envoyé pour cet email. Demandez un nouveau code.")

    # Check expiry
    try:
        expires_at = datetime.fromisoformat(otp_doc["expires_at"])
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            await db.otp_codes.delete_many({"email": data.email})
            raise HTTPException(status_code=400, detail="Le code a expiré. Demandez un nouveau code.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Erreur de validation du code.")

    if otp_doc["code"] != str(otp_code).strip():
        raise HTTPException(status_code=400, detail="Code incorrect. Vérifiez et réessayez.")

    # OTP valid – clean up
    await db.otp_codes.delete_many({"email": data.email})

    hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt(rounds=12)).decode()
    user_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    requires_approval = data.role in ("auteur", "agent")
    actual_role = "visiteur" if requires_approval else data.role
    status = "pending" if requires_approval else "actif"

    user_doc = {
        "id": user_id,
        "username": sanitize(data.username),
        "email": data.email,
        "hashed_password": hashed,
        "role": actual_role,
        "requested_role": data.role if requires_approval else None,
        "status": status,
        "created_at": created_at
    }
    await db.users.insert_one(user_doc)

    if requires_approval:
        role_label = "Auteur" if data.role == "auteur" else "Agent immobilier"
        await db.admin_notifications.insert_one({
            "id": str(uuid.uuid4()),
            "type": "role_request",
            "user_id": user_id,
            "user_email": data.email,
            "user_username": sanitize(data.username),
            "requested_role": data.role,
            "message": f"Nouvelle demande de rôle {role_label} de {sanitize(data.username)} ({data.email})",
            "status": "pending",
            "created_at": created_at,
            "processed_at": ""
        })

    token = create_token(user_id)
    return TokenResponse(
        token=token,
        user=UserOut(
            id=user_id, username=user_doc["username"], email=data.email,
            role=actual_role, created_at=created_at, status=status
        )
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    # Valid bcrypt hash for timing-attack prevention (never matches real passwords)
    dummy_hash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/ufn/P0SqS"
    stored_hash = user["hashed_password"] if user else dummy_hash
    try:
        valid = bcrypt.checkpw(data.password.encode(), stored_hash.encode())
    except ValueError:
        valid = False
    if not user or not valid:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    if user.get("status") == "bloque":
        raise HTTPException(status_code=403, detail="Votre compte a été bloqué. Contactez l'administrateur.")
    if user.get("status") == "suspendu":
        raise HTTPException(status_code=403, detail="Votre compte est temporairement suspendu.")

    token = create_token(user["id"])
    return TokenResponse(token=token, user=user_to_out(user))


@router.get("/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    return user_to_out(current_user)


@router.put("/profile", response_model=UserOut)
async def update_profile(data: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    updates = {}
    if data.username is not None:
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


@router.put("/password")
async def change_password(data: PasswordChange, current_user: dict = Depends(get_current_user)):
    if not bcrypt.checkpw(data.current_password.encode(), current_user["hashed_password"].encode()):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    new_hash = bcrypt.hashpw(data.new_password.encode(), bcrypt.gensalt(rounds=12)).decode()
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"hashed_password": new_hash}})
    return {"message": "Mot de passe mis à jour avec succès"}

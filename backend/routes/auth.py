from fastapi import APIRouter, HTTPException, Depends, Request
from database import db
from config import JWT_SECRET, JWT_ALGORITHM
from models.user import (
    UserRegister, UserLogin, UserOut, UserProfileUpdate,
    PasswordChange, TokenResponse, user_to_out
)
from middleware.auth import get_current_user
from utils import sanitize, sanitize_url
from routes.messages import manager
import bcrypt
import uuid
import jwt
import hashlib
import secrets
import os
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, EmailStr
from collections import defaultdict
import time

router = APIRouter(tags=["auth"])
logger = logging.getLogger(__name__)

# ── Rate limiting (in-memory, per-endpoint) ──────────────────────────────────
_rate_limits = defaultdict(list)  # key -> list of timestamps
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_SEND = 5  # max send-otp per minute per email
RATE_LIMIT_MAX_VERIFY = 10  # max verify-otp per minute per email


def _check_rate_limit(key: str, max_requests: int):
    now = time.time()
    _rate_limits[key] = [t for t in _rate_limits[key] if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_limits[key]) >= max_requests:
        raise HTTPException(status_code=429, detail="Trop de tentatives. Veuillez patienter 1 minute.")
    _rate_limits[key].append(now)


def create_token(user_id: str) -> str:
    payload = {"sub": user_id}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _hash_otp(code: str) -> str:
    """Hash OTP with SHA-256 for secure storage."""
    return hashlib.sha256(code.encode()).hexdigest()


async def _send_otp_email(email: str, code: str) -> bool:
    """Send OTP via Resend with verified matrixnews.org domain."""
    api_key = os.environ.get("RESEND_API_KEY", "")
    sender = os.environ.get("SENDER_EMAIL", "Matrix News <noreply@matrixnews.org>")

    if not api_key:
        logger.error("RESEND_API_KEY not configured")
        return False

    try:
        import resend
        resend.api_key = api_key

        html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%">
        <tr><td style="background-color:#000000;padding:24px 32px;text-align:center">
          <h1 style="margin:0;color:#FF6600;font-size:28px;font-weight:800;letter-spacing:4px;text-transform:uppercase">MATRIX NEWS</h1>
          <p style="margin:4px 0 0;color:#888888;font-size:11px;letter-spacing:2px;text-transform:uppercase">Verification de votre compte</p>
        </td></tr>
        <tr><td style="background-color:#FF6600;height:4px"></td></tr>
        <tr><td style="background-color:#ffffff;padding:40px 32px">
          <p style="margin:0 0 8px;color:#333333;font-size:16px;font-weight:600">Bonjour,</p>
          <p style="margin:0 0 28px;color:#666666;font-size:14px;line-height:22px">
            Voici votre code de verification pour activer votre compte Matrix News.
            Ce code est valable pendant <strong style="color:#000">5 minutes</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background-color:#fafafa;border:2px solid #FF6600;border-radius:8px;padding:28px;text-align:center">
              <p style="margin:0 0 8px;color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:2px">Votre code de verification</p>
              <p style="margin:0;font-size:42px;font-weight:800;letter-spacing:16px;color:#000000;font-family:monospace">{code}</p>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;color:#999999;font-size:12px;line-height:18px;text-align:center">
            Si vous n'avez pas demande ce code, ignorez simplement cet email.<br>
            <strong style="color:#FF6600">Ne partagez jamais ce code avec qui que ce soit.</strong>
          </p>
        </td></tr>
        <tr><td style="background-color:#000000;padding:20px 32px;text-align:center">
          <p style="margin:0;color:#888888;font-size:11px">
            &copy; 2026 Matrix News &mdash; <a href="https://matrixnews.org" style="color:#FF6600;text-decoration:none">matrixnews.org</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

        result = await asyncio.to_thread(resend.Emails.send, {
            "from": sender,
            "to": [email],
            "subject": "Votre code de verification Matrix News",
            "html": html,
        })
        logger.info(f"OTP email sent to {email} | {result}")
        return True
    except Exception as e:
        logger.error(f"Resend FAILED for {email} | {e}")
        return False


class OTPRequest(BaseModel):
    email: EmailStr


class OTPVerify(BaseModel):
    email: EmailStr
    otp: str


# ── STEP 1: Register (creates pending_verification account) ─────────────────
@router.post("/register")
async def register(data: UserRegister):
    if data.role == "admin":
        raise HTTPException(status_code=403, detail="Role non autorise")

    existing = await db.users.find_one({"email": data.email}, {"_id": 0, "id": 1, "status": 1})
    if existing:
        if existing.get("status") == "pending_verification":
            raise HTTPException(status_code=400, detail="Un compte avec cet email est en attente de verification. Verifiez votre email.")
        raise HTTPException(status_code=400, detail="Cet email est deja utilise")

    hashed_pw = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt(rounds=12)).decode()
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    is_professional = data.role in ("auteur", "agent")

    user_doc = {
        "id": user_id,
        "full_name": sanitize(data.full_name),
        "username": sanitize(data.username),
        "email": data.email,
        "phone": sanitize(data.phone) if data.phone else None,
        "hashed_password": hashed_pw,
        "role": "visiteur" if is_professional else data.role,
        "requested_role": data.role if is_professional else None,
        "status": "pending_verification",
        "email_verified": False,
        "eligible_trusted_badge": is_professional,
        "created_at": now,
        "updated_at": now,
        "verified_at": None,
        "verification_logs": [],
    }
    await db.users.insert_one(user_doc)

    logger.info(f"User registered (pending_verification): {data.email} as {data.role}")

    # Generate and send OTP immediately during registration
    code = str(secrets.randbelow(900000) + 100000)
    hashed_code = _hash_otp(code)
    now_dt = datetime.now(timezone.utc)
    expires_at = (now_dt + timedelta(minutes=5)).isoformat()

    await db.otp_codes.delete_many({"email": data.email})
    await db.otp_codes.insert_one({
        "email": data.email,
        "code_hash": hashed_code,
        "created_at": now_dt.isoformat(),
        "expires_at": expires_at,
        "attempts": 0,
        "max_attempts": 5,
        "verified": False,
    })

    otp_sent = await _send_otp_email(data.email, code)
    logger.info(f"OTP sent during registration for {data.email}: sent={otp_sent}")

    return {
        "message": "Compte cree. Verifiez votre email pour activer votre compte.",
        "user_id": user_id,
        "email": data.email,
        "otp_sent": otp_sent,
    }


# ── STEP 2: Send OTP (email only) ───────────────────────────────────────────
@router.post("/send-otp")
async def send_otp(data: OTPRequest):
    _check_rate_limit(f"send_otp:{data.email}", RATE_LIMIT_MAX_SEND)

    user = await db.users.find_one({"email": data.email}, {"_id": 0, "id": 1, "status": 1, "email_verified": 1})
    if not user:
        raise HTTPException(status_code=404, detail="Aucun compte trouve avec cet email. Inscrivez-vous d'abord.")

    if user.get("email_verified") and user.get("status") != "pending_verification":
        raise HTTPException(status_code=400, detail="Cet email est deja verifie.")

    code = str(secrets.randbelow(900000) + 100000)
    hashed_code = _hash_otp(code)
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(minutes=5)).isoformat()

    await db.otp_codes.delete_many({"email": data.email})
    await db.otp_codes.insert_one({
        "email": data.email,
        "code_hash": hashed_code,
        "created_at": now.isoformat(),
        "expires_at": expires_at,
        "attempts": 0,
        "max_attempts": 5,
        "verified": False,
    })

    sent = await _send_otp_email(data.email, code)

    logger.info(f"OTP generated for {data.email} (sent={sent})")

    if not sent:
        raise HTTPException(status_code=500, detail="Erreur lors de l'envoi du code. Veuillez reessayer.")

    return {"sent": True, "message": f"Code envoye a {data.email}"}


# ── STEP 3: Verify OTP (activates account) ──────────────────────────────────
@router.post("/verify-otp")
async def verify_otp(data: OTPVerify):
    _check_rate_limit(f"verify_otp:{data.email}", RATE_LIMIT_MAX_VERIFY)

    otp_doc = await db.otp_codes.find_one({"email": data.email}, {"_id": 0})
    if not otp_doc:
        raise HTTPException(status_code=400, detail="Aucun code envoye pour cet email. Demandez un nouveau code.")

    if otp_doc.get("attempts", 0) >= otp_doc.get("max_attempts", 5):
        await db.otp_codes.delete_many({"email": data.email})
        raise HTTPException(status_code=429, detail="Trop de tentatives echouees. Demandez un nouveau code.")

    try:
        expires_at = datetime.fromisoformat(otp_doc["expires_at"])
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            await db.otp_codes.delete_many({"email": data.email})
            raise HTTPException(status_code=400, detail="Le code a expire. Demandez un nouveau code.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Erreur de validation du code.")

    input_hash = _hash_otp(str(data.otp).strip())

    if otp_doc["code_hash"] != input_hash:
        await db.otp_codes.update_one(
            {"email": data.email},
            {"$inc": {"attempts": 1}}
        )
        remaining = otp_doc.get("max_attempts", 5) - otp_doc.get("attempts", 0) - 1
        if remaining <= 0:
            await db.otp_codes.delete_many({"email": data.email})
            raise HTTPException(status_code=429, detail="Trop de tentatives echouees. Demandez un nouveau code.")
        raise HTTPException(status_code=400, detail=f"Code incorrect. {remaining} tentative(s) restante(s).")

    await db.otp_codes.delete_many({"email": data.email})

    now = datetime.now(timezone.utc).isoformat()
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    is_professional = user.get("requested_role") in ("auteur", "agent")
    new_status = "pending" if is_professional else "active"

    update_fields = {
        "email_verified": True,
        "verified_at": now,
        "status": new_status,
        "updated_at": now,
    }

    log_entry = {
        "action": "email_verified",
        "timestamp": now,
        "ip": None,
    }
    await db.users.update_one(
        {"email": data.email},
        {"$set": update_fields, "$push": {"verification_logs": log_entry}}
    )

    if is_professional:
        role_label = "Auteur" if user["requested_role"] == "auteur" else "Agent immobilier"
        await db.admin_notifications.insert_one({
            "id": str(uuid.uuid4()),
            "type": "role_request",
            "user_id": user["id"],
            "user_email": data.email,
            "user_username": user.get("username", ""),
            "requested_role": user["requested_role"],
            "message": f"Nouvelle demande de role {role_label} de {user.get('username', '')} ({data.email})",
            "status": "pending",
            "created_at": now,
            "processed_at": ""
        })
        admins = await db.users.find({"role": "admin"}, {"_id": 0, "id": 1}).to_list(10)
        for adm in admins:
            await manager.send_to_user(adm["id"], {
                "type": "new_role_request",
                "message": f"Nouvelle demande de role {role_label} de {user.get('username', '')}",
            })

    token = create_token(user["id"])
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})

    logger.info(f"OTP verified for {data.email}, status -> {new_status}")

    return TokenResponse(token=token, user=user_to_out(updated_user))


# ── Login ────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    dummy_hash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/ufn/P0SqS"
    stored_hash = user["hashed_password"] if user else dummy_hash
    try:
        valid = bcrypt.checkpw(data.password.encode(), stored_hash.encode())
    except ValueError:
        valid = False
    if not user or not valid:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    status = user.get("status", "active")
    if status == "pending_verification":
        raise HTTPException(status_code=403, detail="Votre compte n'est pas encore verifie. Verifiez votre email.")
    if status in ("bloque", "suspended"):
        raise HTTPException(status_code=403, detail="Votre compte a ete bloque. Contactez l'administrateur.")
    if status == "rejected":
        raise HTTPException(status_code=403, detail="Votre demande de role a ete refusee.")

    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_seen": now}})

    token = create_token(user["id"])
    return TokenResponse(token=token, user=user_to_out(user))


# ── Get me ───────────────────────────────────────────────────────────────────
@router.get("/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    return user_to_out(current_user)


# ── Update profile ──────────────────────────────────────────────────────────
@router.put("/profile", response_model=UserOut)
async def update_profile(data: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    updates = {}
    if data.username is not None:
        existing = await db.users.find_one({"username": sanitize(data.username), "id": {"$ne": current_user["id"]}}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est deja pris")
        updates["username"] = sanitize(data.username)
    if data.full_name is not None:
        updates["full_name"] = sanitize(data.full_name)
    if data.email is not None:
        existing = await db.users.find_one({"email": data.email, "id": {"$ne": current_user["id"]}}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="Cet email est deja utilise")
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
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"id": current_user["id"]}, {"$set": updates})

    updated = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    return user_to_out(updated)


# ── Change password ──────────────────────────────────────────────────────────
@router.put("/password")
async def change_password(data: PasswordChange, current_user: dict = Depends(get_current_user)):
    if not bcrypt.checkpw(data.current_password.encode(), current_user["hashed_password"].encode()):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    new_hash = bcrypt.hashpw(data.new_password.encode(), bcrypt.gensalt(rounds=12)).decode()
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"hashed_password": new_hash}})
    return {"message": "Mot de passe mis a jour avec succes"}

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import db
from config import JWT_SECRET, JWT_ALGORITHM, SUPER_ADMIN_EMAIL
import jwt
from typing import Optional

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    token = None
    # 1. Try httpOnly cookie first
    token = request.cookies.get("access_token")
    # 2. Fallback to Bearer header
    if not token and credentials:
        token = credentials.credentials
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifie")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token invalide")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Session expirée")
        # Update last_seen for online status
        from datetime import datetime, timezone
        await db.users.update_one({"id": user_id}, {"$set": {"last_seen": datetime.now(timezone.utc).isoformat()}})
        return user
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")


async def require_author(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("auteur", "admin"):
        raise HTTPException(status_code=403, detail="Accès réservé aux auteurs")
    return current_user


async def require_agent(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("agent", "admin"):
        raise HTTPException(status_code=403, detail="Accès réservé aux agents immobiliers")
    return current_user


async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    if current_user.get("email") != SUPER_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    return current_user

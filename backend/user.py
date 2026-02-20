from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os
from fastapi import HTTPException
from config import JWT_SECRET, JWT_ALGORITHM

router = APIRouter(prefix="/api/user", tags=["User"])

security = HTTPBearer()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Token invalide")

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "message": "Route sécurisée ✅",
        "user": current_user
    }
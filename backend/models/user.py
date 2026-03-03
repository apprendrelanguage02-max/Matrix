from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional
import re


class UserRegister(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    role: str = Field(default="visiteur")
    phone: Optional[str] = None
    country: Optional[str] = None
    otp: str = Field(..., min_length=6, max_length=6, description="Code OTP à 6 chiffres")

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if not re.match(r'^[a-zA-Z0-9_àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ\s-]+$', v):
            raise ValueError("Nom d'utilisateur invalide")
        return v.strip()

    @field_validator('role')
    @classmethod
    def validate_role(cls, v):
        if v not in ('visiteur', 'auteur', 'agent'):
            raise ValueError("Rôle invalide")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    username: str
    email: str
    role: str
    phone: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    status: Optional[str] = "actif"
    last_seen: Optional[str] = None
    created_at: Optional[str] = None


class UserAdminOut(BaseModel):
    id: str
    username: str
    email: str
    role: str
    phone: Optional[str] = None
    country: Optional[str] = None
    status: Optional[str] = "actif"
    last_seen: Optional[str] = None
    created_at: Optional[str] = None


class PaginatedUsers(BaseModel):
    users: list
    total: int
    page: int
    pages: int


class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if v is not None:
            v = v.strip()
            if len(v) < 2:
                raise ValueError("Nom trop court")
            if not re.match(r'^[a-zA-Z0-9_àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ\s-]+$', v):
                raise ValueError("Caractères invalides")
        return v


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


class TokenResponse(BaseModel):
    token: str
    user: UserOut


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
        last_seen=user.get("last_seen"),
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
        last_seen=user.get("last_seen"),
    )

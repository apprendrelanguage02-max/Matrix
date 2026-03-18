from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional
import re


class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    role: str = Field(default="visiteur")
    phone: Optional[str] = None
    country: Optional[str] = None

    @field_validator('full_name')
    @classmethod
    def validate_full_name(cls, v):
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Le nom complet est requis")
        return v

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
    full_name: Optional[str] = None
    email: str
    role: str
    phone: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    status: Optional[str] = "active"
    eligible_trusted_badge: Optional[bool] = False
    last_seen: Optional[str] = None
    created_at: Optional[str] = None


class UserAdminOut(BaseModel):
    id: str
    username: str
    full_name: Optional[str] = None
    email: str
    role: str
    phone: Optional[str] = None
    country: Optional[str] = None
    status: Optional[str] = "active"
    eligible_trusted_badge: Optional[bool] = False
    email_verified: Optional[bool] = False
    verified_at: Optional[str] = None
    last_seen: Optional[str] = None
    created_at: Optional[str] = None


class PaginatedUsers(BaseModel):
    users: list
    total: int
    page: int
    pages: int


class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
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
    status = user.get("status", "active")
    if status == "actif":
        status = "active"
    return UserOut(
        id=user["id"],
        username=user["username"],
        full_name=user.get("full_name"),
        email=user["email"],
        role=user.get("role", "visiteur"),
        created_at=user.get("created_at", ""),
        phone=user.get("phone"),
        country=user.get("country"),
        address=user.get("address"),
        avatar_url=user.get("avatar_url"),
        bio=user.get("bio"),
        status=status,
        eligible_trusted_badge=user.get("eligible_trusted_badge", False),
        last_seen=user.get("last_seen"),
    )


def user_to_admin_out(user: dict) -> UserAdminOut:
    status = user.get("status", "active")
    if status == "actif":
        status = "active"
    return UserAdminOut(
        id=user["id"],
        username=user["username"],
        full_name=user.get("full_name"),
        email=user["email"],
        role=user.get("role", "visiteur"),
        created_at=user.get("created_at", ""),
        phone=user.get("phone"),
        country=user.get("country"),
        status=status,
        eligible_trusted_badge=user.get("eligible_trusted_badge", False),
        email_verified=user.get("email_verified", False),
        verified_at=user.get("verified_at"),
        last_seen=user.get("last_seen"),
    )

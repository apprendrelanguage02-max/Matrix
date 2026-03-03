from pydantic import BaseModel, Field, field_validator
from typing import Optional, List

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
    likes_count: int = 0
    liked_by: List[str] = []


class PaginatedProperties(BaseModel):
    properties: List[PropertyOut]
    total: int
    pages: int

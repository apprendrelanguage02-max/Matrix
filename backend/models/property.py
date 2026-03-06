from pydantic import BaseModel, Field, field_validator
from typing import Optional, List

PROPERTY_TYPES = ["achat", "vente", "location"]
PROPERTY_STATUSES = ["disponible", "reserve", "vendu"]
PROPERTY_CATEGORIES = ["villa", "appartement", "terrain", "bureau", "commerce", "entrepot", "maison", "studio", "duplex", "autre"]

# Approximate fixed conversion rates (updated periodically)
GNF_TO_USD = 1 / 8600
GNF_TO_EUR = 1 / 9300


def convert_price(price_gnf):
    """Convert GNF price to USD and EUR equivalents."""
    return {
        "gnf": price_gnf,
        "usd": round(price_gnf * GNF_TO_USD, 2),
        "eur": round(price_gnf * GNF_TO_EUR, 2),
    }


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
    # New fields
    property_category: str = "autre"
    bedrooms: int = 0
    bathrooms: int = 0
    surface_area: float = 0
    is_verified: bool = False

    @field_validator('type')
    @classmethod
    def validate_type(cls, v):
        if v not in PROPERTY_TYPES:
            raise ValueError(f'Type invalide. Valeurs: {PROPERTY_TYPES}')
        return v

    @field_validator('property_category')
    @classmethod
    def validate_category(cls, v):
        if v and v not in PROPERTY_CATEGORIES:
            return "autre"
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
    # New fields
    property_category: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    surface_area: Optional[float] = None
    is_verified: Optional[bool] = None

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
    # New fields
    property_category: str = "autre"
    bedrooms: int = 0
    bathrooms: int = 0
    surface_area: float = 0
    is_verified: bool = False
    price_converted: dict = {}


class PaginatedProperties(BaseModel):
    properties: List[PropertyOut]
    total: int
    pages: int


class SavedPropertyOut(BaseModel):
    id: str
    property_id: str
    title: str
    type: str
    price: float
    currency: str
    city: str
    neighborhood: str = ""
    image_url: Optional[str] = None
    bedrooms: int = 0
    surface_area: float = 0
    saved_at: str


class SearchAlertCreate(BaseModel):
    city: str = ""
    neighborhood: str = ""
    type: str = ""
    min_price: float = 0
    max_price: float = 0
    property_category: str = ""
    min_bedrooms: int = 0


class SearchAlertOut(BaseModel):
    id: str
    user_id: str
    city: str = ""
    neighborhood: str = ""
    type: str = ""
    min_price: float = 0
    max_price: float = 0
    property_category: str = ""
    min_bedrooms: int = 0
    created_at: str
    last_notified: Optional[str] = None

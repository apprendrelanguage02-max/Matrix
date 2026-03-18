from pydantic import BaseModel, Field, field_validator
from typing import Optional, List


# ─── Constants ──────────────────────────────────────────────────────────────────

PROCEDURE_CATEGORIES = [
    {"id": "visa_immigration", "name": "Visa / Immigration"},
    {"id": "etudes", "name": "Etudes"},
    {"id": "documents_administratifs", "name": "Documents administratifs"},
    {"id": "travail", "name": "Travail"},
    {"id": "passeport", "name": "Passeport"},
    {"id": "permis_residence", "name": "Permis de residence"},
    {"id": "sante", "name": "Sante"},
    {"id": "entrepreneuriat", "name": "Entrepreneuriat"},
    {"id": "autre", "name": "Autre"},
]

PROCEDURE_COUNTRIES = [
    {"id": "guinee", "name": "Guinee", "flag": "gn"},
    {"id": "canada", "name": "Canada", "flag": "ca"},
    {"id": "france", "name": "France", "flag": "fr"},
    {"id": "usa", "name": "Etats-Unis", "flag": "us"},
    {"id": "turquie", "name": "Turquie", "flag": "tr"},
    {"id": "japon", "name": "Japon", "flag": "jp"},
    {"id": "allemagne", "name": "Allemagne", "flag": "de"},
    {"id": "chine", "name": "Chine", "flag": "cn"},
    {"id": "maroc", "name": "Maroc", "flag": "ma"},
    {"id": "senegal", "name": "Senegal", "flag": "sn"},
    {"id": "royaume_uni", "name": "Royaume-Uni", "flag": "gb"},
    {"id": "espagne", "name": "Espagne", "flag": "es"},
    {"id": "italie", "name": "Italie", "flag": "it"},
    {"id": "belgique", "name": "Belgique", "flag": "be"},
    {"id": "suisse", "name": "Suisse", "flag": "ch"},
    {"id": "autre", "name": "Autre", "flag": "un"},
]

COMPLEXITY_LEVELS = ["facile", "modere", "difficile"]
LANGUAGES = [
    {"id": "fr", "name": "Francais", "flag": "fr"},
    {"id": "en", "name": "English", "flag": "gb"},
    {"id": "ar", "name": "Arabe", "flag": "sa"},
]

# Backward compat alias
PROCEDURE_SUBCATEGORIES = PROCEDURE_COUNTRIES


# ─── Embedded Models ────────────────────────────────────────────────────────────

class ProcedureStepInput(BaseModel):
    id: Optional[str] = None
    order: int = 0
    title: str = Field(min_length=1, max_length=300)
    description: str = ""
    required_documents: List[str] = []
    links: List[dict] = []  # [{url, label}]
    video_url: str = ""
    mandatory: bool = True


class QuickActionInput(BaseModel):
    id: Optional[str] = None
    label: str = Field(min_length=1, max_length=200)
    action_type: str = "navigate"  # navigate, download, start_procedure


# ─── Create / Update ────────────────────────────────────────────────────────────

class ProcedureCreate(BaseModel):
    title: str = Field(min_length=3, max_length=300)
    description: str = ""
    category: str = "autre"
    keywords: List[str] = []
    country: str = "guinee"
    language: str = "fr"
    complexity: str = "modere"
    active: bool = True
    status: str = "draft"  # draft, published
    image_url: Optional[str] = ""
    video_url: Optional[str] = ""
    main_image_url: Optional[str] = ""
    steps: List[ProcedureStepInput] = []
    quick_actions: List[QuickActionInput] = []

    # Legacy compat
    subcategory: Optional[str] = None
    content: Optional[str] = None


class ProcedureUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=300)
    description: Optional[str] = None
    category: Optional[str] = None
    keywords: Optional[List[str]] = None
    country: Optional[str] = None
    language: Optional[str] = None
    complexity: Optional[str] = None
    active: Optional[bool] = None
    status: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    main_image_url: Optional[str] = None
    steps: Optional[List[ProcedureStepInput]] = None
    quick_actions: Optional[List[QuickActionInput]] = None
    content: Optional[str] = None


# ─── Output Models ──────────────────────────────────────────────────────────────

class ProcedureStepOut(BaseModel):
    id: str = ""
    order: int = 0
    title: str = ""
    description: str = ""
    required_documents: List[str] = []
    links: List[dict] = []
    video_url: str = ""
    mandatory: bool = True


class QuickActionOut(BaseModel):
    id: str = ""
    label: str = ""
    action_type: str = "navigate"


class ProcedureFileOut(BaseModel):
    id: str
    procedure_id: str
    file_name: str
    original_filename: str = ""
    storage_path: str = ""
    content_type: str = ""
    file_type: str = "pdf"
    size: int = 0
    created_at: str = ""


class ProcedureOut(BaseModel):
    id: str
    title: str
    description: str = ""
    category: str = "autre"
    category_name: str = ""
    keywords: List[str] = []
    country: str = ""
    country_name: str = ""
    country_flag: str = ""
    language: str = "fr"
    complexity: str = "modere"
    active: bool = True
    status: str = "draft"
    image_url: str = ""
    video_url: str = ""
    main_image_url: str = ""
    steps: List[ProcedureStepOut] = []
    quick_actions: List[QuickActionOut] = []
    files: List[ProcedureFileOut] = []
    author_id: str = ""
    author_username: str = ""
    created_at: str = ""
    updated_at: str = ""
    views: int = 0
    version: int = 1
    # Legacy compat
    subcategory: str = ""
    subcategory_name: str = ""
    subcategory_flag: str = ""
    content: str = ""


class PaginatedProcedures(BaseModel):
    procedures: List[ProcedureOut]
    total: int
    page: int
    pages: int


# ─── Chat Actions ───────────────────────────────────────────────────────────────

class ChatActionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    country: str = ""
    procedure_id: Optional[str] = None


class ChatActionOut(BaseModel):
    id: str
    title: str
    country: str = ""
    country_name: str = ""
    country_flag: str = ""
    procedure_id: Optional[str] = None
    active: bool = True
    created_at: str = ""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List

PROCEDURE_SUBCATEGORIES = [
    {"id": "guinee", "name": "Guinée", "flag": "🇬🇳"},
    {"id": "canada", "name": "Canada", "flag": "🇨🇦"},
    {"id": "france", "name": "France", "flag": "🇫🇷"},
    {"id": "usa", "name": "États-Unis", "flag": "🇺🇸"},
    {"id": "turquie", "name": "Turquie", "flag": "🇹🇷"},
    {"id": "japon", "name": "Japon", "flag": "🇯🇵"},
    {"id": "allemagne", "name": "Allemagne", "flag": "🇩🇪"},
    {"id": "chine", "name": "Chine", "flag": "🇨🇳"},
]


class ProcedureCreate(BaseModel):
    title: str = Field(min_length=5, max_length=200)
    subcategory: str
    content: str = Field(min_length=10)
    image_url: Optional[str] = ""

    @field_validator('subcategory')
    @classmethod
    def validate_subcategory(cls, v):
        valid_ids = [s["id"] for s in PROCEDURE_SUBCATEGORIES]
        if v not in valid_ids:
            raise ValueError(f'Sous-catégorie invalide: {valid_ids}')
        return v


class ProcedureUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    subcategory: Optional[str] = None
    content: Optional[str] = Field(None, min_length=10)
    image_url: Optional[str] = None

    @field_validator('subcategory')
    @classmethod
    def validate_subcategory(cls, v):
        if v is None:
            return v
        valid_ids = [s["id"] for s in PROCEDURE_SUBCATEGORIES]
        if v not in valid_ids:
            raise ValueError(f'Sous-catégorie invalide: {valid_ids}')
        return v


class ProcedureOut(BaseModel):
    id: str
    title: str
    subcategory: str
    subcategory_name: str = ""
    subcategory_flag: str = ""
    content: str
    image_url: str = ""
    author_id: str
    author_username: str = ""
    created_at: str
    updated_at: str = ""
    views: int = 0


class PaginatedProcedures(BaseModel):
    procedures: List[ProcedureOut]
    total: int
    page: int
    pages: int

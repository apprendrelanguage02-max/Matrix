from pydantic import BaseModel, Field, field_validator
from typing import Optional, List


class ArticleCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=10)
    category: str
    image_url: Optional[str] = None

    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        return v.strip()

class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None

    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        if v is not None:
            return v.strip()
        return v

class ArticleOut(BaseModel):
    id: str
    title: str
    content: str
    category: str
    author_id: str
    author_name: str = ""
    author_username: str = ""
    image_url: Optional[str] = None
    views: int = 0
    published_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class PaginatedArticles(BaseModel):
    articles: List[ArticleOut]
    total: int
    page: int
    pages: int

class SavedArticleOut(BaseModel):
    id: str
    article_id: str
    title: str
    category: str
    author_name: str
    image_url: Optional[str] = None
    saved_at: Optional[str] = None

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Any


class ArticleBlock(BaseModel):
    id: str
    type: str  # text, image, video, quote, alert, table
    data: dict = {}


class ArticleCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str = ""
    blocks: List[ArticleBlock] = []
    category: str
    subtitle: str = ""
    tags: List[str] = []
    image_url: Optional[str] = None
    image_alt: str = ""
    is_breaking: bool = False
    slug: str = ""
    meta_title: str = ""
    meta_description: str = ""
    status: str = "draft"  # draft, published, scheduled
    scheduled_at: Optional[str] = None

    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        return v.strip()


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    blocks: Optional[List[ArticleBlock]] = None
    category: Optional[str] = None
    subtitle: Optional[str] = None
    tags: Optional[List[str]] = None
    image_url: Optional[str] = None
    image_alt: Optional[str] = None
    is_breaking: Optional[bool] = None
    slug: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    status: Optional[str] = None
    scheduled_at: Optional[str] = None

    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        if v is not None:
            return v.strip()
        return v


class ArticleOut(BaseModel):
    id: str
    title: str
    content: str = ""
    blocks: List[Any] = []
    category: str
    subtitle: str = ""
    tags: List[str] = []
    author_id: str
    author_name: str = ""
    author_username: str = ""
    image_url: Optional[str] = None
    image_alt: str = ""
    is_breaking: bool = False
    slug: str = ""
    meta_title: str = ""
    meta_description: str = ""
    status: str = "published"
    scheduled_at: Optional[str] = None
    views: int = 0
    likes_count: int = 0
    liked_by: List[str] = []
    word_count: int = 0
    reading_time: int = 0
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

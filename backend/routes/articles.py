from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List
from database import db
from config import CATEGORIES
from models.article import (
    ArticleCreate, ArticleUpdate, ArticleOut,
    PaginatedArticles, SavedArticleOut
)
from middleware.auth import get_current_user, require_author
from utils import sanitize, sanitize_html, sanitize_url
from routes.messages import manager
from pymongo import ReturnDocument
from datetime import datetime, timezone
import uuid

router = APIRouter(tags=["articles"])


# ─── Saved Articles ────────────────────────────────────────────────────────────

@router.get("/saved-articles", response_model=List[SavedArticleOut])
async def get_saved_articles(current_user: dict = Depends(get_current_user)):
    saved = await db.saved_articles.find({"user_id": current_user["id"]}, {"_id": 0}).sort("saved_at", -1).to_list(200)
    result = []
    for s in saved:
        article = await db.articles.find_one({"id": s["article_id"]}, {"_id": 0})
        if article:
            result.append(SavedArticleOut(
                id=s["id"], article_id=s["article_id"], title=article["title"],
                category=article.get("category", ""), author_name=article.get("author_name", ""),
                image_url=article.get("image_url"), saved_at=s.get("saved_at")
            ))
    return result


@router.get("/saved-articles/{article_id}/status")
async def get_save_status(article_id: str, current_user: dict = Depends(get_current_user)):
    saved = await db.saved_articles.find_one({"user_id": current_user["id"], "article_id": article_id}, {"_id": 0})
    return {"saved": saved is not None}


@router.post("/saved-articles/{article_id}")
async def save_article(article_id: str, current_user: dict = Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article introuvable")
    existing = await db.saved_articles.find_one({"user_id": current_user["id"], "article_id": article_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Article déjà sauvegardé")
    saved_doc = {
        "id": str(uuid.uuid4()), "user_id": current_user["id"],
        "article_id": article_id, "saved_at": datetime.now(timezone.utc).isoformat()
    }
    await db.saved_articles.insert_one(saved_doc)
    return {"message": "Article sauvegardé", "id": saved_doc["id"]}


@router.delete("/saved-articles/{article_id}")
async def unsave_article(article_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.saved_articles.delete_one({"user_id": current_user["id"], "article_id": article_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article non trouvé dans vos sauvegardes")
    return {"message": "Article retiré des sauvegardes"}


# ─── Public Routes ─────────────────────────────────────────────────────────────

@router.get("/categories")
async def get_categories():
    return CATEGORIES


@router.get("/articles", response_model=PaginatedArticles)
async def get_articles(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    category: str = Query("", max_length=100),
    search: str = Query("", max_length=200),
):
    query = {}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}},
        ]
    total = await db.articles.count_documents(query)
    pages = max(1, (total + limit - 1) // limit)
    skip = (page - 1) * limit
    articles = await db.articles.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return PaginatedArticles(
        articles=[ArticleOut(**a) for a in articles],
        total=total, page=page, pages=pages
    )


@router.get("/articles/{article_id}", response_model=ArticleOut)
async def get_article(article_id: str):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article introuvable")
    result = await db.articles.find_one_and_update(
        {"id": article_id}, {"$inc": {"views": 1}},
        projection={"_id": 0, "views": 1}, return_document=ReturnDocument.AFTER
    )
    await manager.broadcast_all({"type": "view_update", "content_type": "article", "id": article_id, "views": result["views"]})
    return ArticleOut(**article)


# ─── Protected Routes ──────────────────────────────────────────────────────────

@router.get("/my-articles", response_model=List[ArticleOut])
async def get_my_articles(current_user: dict = Depends(require_author)):
    articles = await db.articles.find({"author_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [ArticleOut(**a) for a in articles]


@router.post("/articles", response_model=ArticleOut)
async def create_article(data: ArticleCreate, current_user: dict = Depends(require_author)):
    if data.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Catégorie invalide: {data.category}")
    now = datetime.now(timezone.utc).isoformat()
    article = {
        "id": str(uuid.uuid4()),
        "title": sanitize(data.title),
        "content": sanitize_html(data.content),
        "category": data.category,
        "image_url": sanitize_url(data.image_url),
        "author_id": current_user["id"],
        "author_name": current_user["username"],
        "author_username": current_user["username"],
        "views": 0,
        "created_at": now,
        "published_at": now,
        "updated_at": now,
    }
    await db.articles.insert_one(article)
    del article["_id"]
    # Broadcast to all users for real-time updates
    await manager.broadcast_all({"type": "content_update", "content_type": "article", "action": "created", "title": sanitize(data.title)})
    return ArticleOut(**article)


@router.put("/articles/{article_id}", response_model=ArticleOut)
async def update_article(article_id: str, data: ArticleUpdate, current_user: dict = Depends(require_author)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article introuvable")
    if current_user.get("role") != "admin" and article["author_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Non autorisé")
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.title is not None:
        updates["title"] = sanitize(data.title)
    if data.content is not None:
        updates["content"] = sanitize_html(data.content)
    if data.category is not None:
        if data.category not in CATEGORIES:
            raise HTTPException(status_code=400, detail="Catégorie invalide")
        updates["category"] = data.category
    if data.image_url is not None:
        updates["image_url"] = sanitize_url(data.image_url)
    await db.articles.update_one({"id": article_id}, {"$set": updates})
    updated = await db.articles.find_one({"id": article_id}, {"_id": 0})
    await manager.broadcast_all({"type": "content_update", "content_type": "article", "action": "updated"})
    return ArticleOut(**updated)


@router.delete("/articles/{article_id}")
async def delete_article(article_id: str, current_user: dict = Depends(require_author)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article introuvable")
    if current_user.get("role") != "admin" and article["author_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Non autorisé")
    await db.articles.delete_one({"id": article_id})
    return {"message": "Article supprimé"}


@router.post("/articles/{article_id}/like")
async def toggle_article_like(article_id: str, current_user: dict = Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0, "id": 1, "liked_by": 1, "title": 1, "author_id": 1})
    if not article:
        raise HTTPException(status_code=404, detail="Article introuvable")

    user_id = current_user["id"]
    liked_by = article.get("liked_by", [])
    already_liked = user_id in liked_by

    if already_liked:
        await db.articles.update_one(
            {"id": article_id},
            {"$pull": {"liked_by": user_id}, "$inc": {"likes_count": -1}}
        )
        action = "unlike"
    else:
        await db.articles.update_one(
            {"id": article_id},
            {"$addToSet": {"liked_by": user_id}, "$inc": {"likes_count": 1}}
        )
        action = "like"
        # Notify article author (not self-like)
        if article.get("author_id") and article["author_id"] != user_id:
            import uuid as _uuid
            await db.user_notifications.insert_one({
                "id": str(_uuid.uuid4()),
                "user_id": article["author_id"],
                "type": "article_like",
                "message": f"{current_user.get('username', 'Un utilisateur')} a aimé votre article \"{article.get('title', '')}\"",
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

    updated = await db.articles.find_one({"id": article_id}, {"_id": 0, "likes_count": 1, "liked_by": 1})
    await manager.broadcast_all({"type": "like_update", "content_type": "article", "id": article_id, "likes_count": updated.get("likes_count", 0), "liked_by": updated.get("liked_by", [])})
    return {"action": action, "likes_count": updated.get("likes_count", 0), "liked_by": updated.get("liked_by", [])}

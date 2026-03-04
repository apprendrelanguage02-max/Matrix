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
import re
import math

router = APIRouter(tags=["articles"])


def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text[:100]


def compute_word_count(content, blocks):
    text = ""
    if blocks:
        for b in blocks:
            d = b if isinstance(b, dict) else b.dict()
            t = d.get("type", "")
            data = d.get("data", {})
            if t == "text":
                text += " " + re.sub(r'<[^>]*>', '', data.get("content", ""))
            elif t == "quote":
                text += " " + data.get("text", "")
            elif t == "alert":
                text += " " + data.get("content", "")
            elif t == "image":
                text += " " + data.get("caption", "")
    elif content:
        text = re.sub(r'<[^>]*>', '', content)
    words = len(text.split())
    return words, max(1, math.ceil(words / 200))


# ─── Public Routes ─────────────────────────────────────────────────────────────

@router.get("/articles", response_model=PaginatedArticles)
async def list_articles(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    category: str = Query("", max_length=50),
    search: str = Query("", max_length=200),
):
    query = {"status": "published"}
    if category:
        query["category"] = category
    if search:
        regex = {"$regex": search.strip(), "$options": "i"}
        query["$or"] = [{"title": regex}, {"content": regex}]

    total = await db.articles.count_documents(query)
    pages = max(1, math.ceil(total / limit))
    skip = (page - 1) * limit
    articles = await db.articles.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return PaginatedArticles(
        articles=[ArticleOut(**a) for a in articles],
        total=total, page=page, pages=pages
    )


@router.get("/articles/category/{category}", response_model=PaginatedArticles)
async def list_articles_by_category(
    category: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    query = {"category": category, "status": "published"}
    total = await db.articles.count_documents(query)
    pages = max(1, math.ceil(total / limit))
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
    articles = await db.articles.find(
        {"author_id": current_user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return [ArticleOut(**a) for a in articles]


@router.get("/my-articles/stats")
async def get_my_stats(current_user: dict = Depends(require_author)):
    uid = current_user["id"]
    pipeline_total = [{"$match": {"author_id": uid}}, {"$count": "total"}]
    pipeline_published = [{"$match": {"author_id": uid, "status": "published"}}, {"$count": "total"}]
    pipeline_drafts = [{"$match": {"author_id": uid, "status": "draft"}}, {"$count": "total"}]
    pipeline_scheduled = [{"$match": {"author_id": uid, "status": "scheduled"}}, {"$count": "total"}]
    pipeline_views = [{"$match": {"author_id": uid}}, {"$group": {"_id": None, "total": {"$sum": "$views"}}}]
    pipeline_likes = [{"$match": {"author_id": uid}}, {"$group": {"_id": None, "total": {"$sum": "$likes_count"}}}]

    total = await db.articles.aggregate(pipeline_total).to_list(1)
    published = await db.articles.aggregate(pipeline_published).to_list(1)
    drafts = await db.articles.aggregate(pipeline_drafts).to_list(1)
    scheduled = await db.articles.aggregate(pipeline_scheduled).to_list(1)
    views = await db.articles.aggregate(pipeline_views).to_list(1)
    likes = await db.articles.aggregate(pipeline_likes).to_list(1)

    return {
        "total": total[0]["total"] if total else 0,
        "published": published[0]["total"] if published else 0,
        "drafts": drafts[0]["total"] if drafts else 0,
        "scheduled": scheduled[0]["total"] if scheduled else 0,
        "total_views": views[0]["total"] if views else 0,
        "total_likes": likes[0]["total"] if likes else 0,
    }


@router.post("/articles", response_model=ArticleOut)
async def create_article(data: ArticleCreate, current_user: dict = Depends(require_author)):
    if data.category and data.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Categorie invalide: {data.category}")
    now = datetime.now(timezone.utc).isoformat()
    word_count, reading_time = compute_word_count(data.content, data.blocks)
    slug = data.slug if data.slug else slugify(data.title)
    blocks_raw = [b.dict() if hasattr(b, 'dict') else b for b in data.blocks]
    article = {
        "id": str(uuid.uuid4()),
        "title": sanitize(data.title),
        "subtitle": sanitize(data.subtitle) if data.subtitle else "",
        "content": sanitize_html(data.content) if data.content else "",
        "blocks": blocks_raw,
        "category": data.category,
        "tags": [sanitize(t) for t in data.tags[:10]],
        "image_url": sanitize_url(data.image_url),
        "image_alt": sanitize(data.image_alt) if data.image_alt else "",
        "is_breaking": data.is_breaking,
        "slug": slug,
        "meta_title": sanitize(data.meta_title) if data.meta_title else "",
        "meta_description": sanitize(data.meta_description) if data.meta_description else "",
        "status": data.status if data.status in ("draft", "published", "scheduled") else "draft",
        "scheduled_at": data.scheduled_at,
        "author_id": current_user["id"],
        "author_name": current_user["username"],
        "author_username": current_user["username"],
        "views": 0,
        "word_count": word_count,
        "reading_time": reading_time,
        "likes_count": 0,
        "liked_by": [],
        "created_at": now,
        "published_at": now if data.status == "published" else None,
        "updated_at": now,
    }
    await db.articles.insert_one(article)
    del article["_id"]
    if data.status == "published":
        await manager.broadcast_all({"type": "content_update", "content_type": "article", "action": "created", "title": sanitize(data.title)})
    return ArticleOut(**article)


@router.put("/articles/{article_id}", response_model=ArticleOut)
async def update_article(article_id: str, data: ArticleUpdate, current_user: dict = Depends(require_author)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article introuvable")
    if current_user.get("role") != "admin" and article["author_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Non autorise")
    now = datetime.now(timezone.utc).isoformat()
    updates = {"updated_at": now}
    if data.title is not None:
        updates["title"] = sanitize(data.title)
    if data.subtitle is not None:
        updates["subtitle"] = sanitize(data.subtitle)
    if data.content is not None:
        updates["content"] = sanitize_html(data.content)
    if data.blocks is not None:
        updates["blocks"] = [b.dict() if hasattr(b, 'dict') else b for b in data.blocks]
    if data.category is not None:
        if data.category not in CATEGORIES:
            raise HTTPException(status_code=400, detail="Categorie invalide")
        updates["category"] = data.category
    if data.tags is not None:
        updates["tags"] = [sanitize(t) for t in data.tags[:10]]
    if data.image_url is not None:
        updates["image_url"] = sanitize_url(data.image_url)
    if data.image_alt is not None:
        updates["image_alt"] = sanitize(data.image_alt)
    if data.is_breaking is not None:
        updates["is_breaking"] = data.is_breaking
    if data.slug is not None:
        updates["slug"] = data.slug
    if data.meta_title is not None:
        updates["meta_title"] = sanitize(data.meta_title)
    if data.meta_description is not None:
        updates["meta_description"] = sanitize(data.meta_description)
    if data.status is not None:
        updates["status"] = data.status
        if data.status == "published" and not article.get("published_at"):
            updates["published_at"] = now
    if data.scheduled_at is not None:
        updates["scheduled_at"] = data.scheduled_at

    # Recompute word count
    new_content = updates.get("content", article.get("content", ""))
    new_blocks = updates.get("blocks", article.get("blocks", []))
    wc, rt = compute_word_count(new_content, new_blocks)
    updates["word_count"] = wc
    updates["reading_time"] = rt

    await db.articles.update_one({"id": article_id}, {"$set": updates})
    updated = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if updates.get("status") == "published":
        await manager.broadcast_all({"type": "content_update", "content_type": "article", "action": "updated"})
    return ArticleOut(**updated)


@router.put("/articles/{article_id}/autosave")
async def autosave_article(article_id: str, data: ArticleUpdate, current_user: dict = Depends(require_author)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article introuvable")
    if current_user.get("role") != "admin" and article["author_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Non autorise")
    now = datetime.now(timezone.utc).isoformat()
    updates = {"updated_at": now}
    if data.title is not None:
        updates["title"] = sanitize(data.title)
    if data.subtitle is not None:
        updates["subtitle"] = sanitize(data.subtitle)
    if data.content is not None:
        updates["content"] = sanitize_html(data.content)
    if data.blocks is not None:
        updates["blocks"] = [b.dict() if hasattr(b, 'dict') else b for b in data.blocks]
    if data.category is not None:
        updates["category"] = data.category
    if data.tags is not None:
        updates["tags"] = [sanitize(t) for t in data.tags[:10]]
    if data.image_url is not None:
        updates["image_url"] = sanitize_url(data.image_url)
    if data.meta_title is not None:
        updates["meta_title"] = sanitize(data.meta_title)
    if data.meta_description is not None:
        updates["meta_description"] = sanitize(data.meta_description)
    await db.articles.update_one({"id": article_id}, {"$set": updates})
    return {"ok": True, "saved_at": now}


@router.delete("/articles/{article_id}")
async def delete_article(article_id: str, current_user: dict = Depends(require_author)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article introuvable")
    if current_user.get("role") != "admin" and article["author_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Non autorise")
    await db.articles.delete_one({"id": article_id})
    await db.saved_articles.delete_many({"article_id": article_id})
    return {"message": "Article supprime"}


# ─── Saved Articles ────────────────────────────────────────────────────────────

@router.post("/saved-articles/{article_id}")
async def save_article(article_id: str, current_user: dict = Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0, "title": 1, "category": 1, "author_name": 1, "image_url": 1})
    if not article:
        raise HTTPException(status_code=404, detail="Article introuvable")
    existing = await db.saved_articles.find_one({"user_id": current_user["id"], "article_id": article_id})
    if existing:
        await db.saved_articles.delete_one({"user_id": current_user["id"], "article_id": article_id})
        return {"action": "unsaved"}
    await db.saved_articles.insert_one({
        "id": str(uuid.uuid4()), "user_id": current_user["id"], "article_id": article_id,
        "title": article.get("title", ""), "category": article.get("category", ""),
        "author_name": article.get("author_name", ""), "image_url": article.get("image_url"),
        "saved_at": datetime.now(timezone.utc).isoformat()
    })
    return {"action": "saved"}


@router.get("/saved-articles/{article_id}/status")
async def get_saved_status(article_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.saved_articles.find_one({"user_id": current_user["id"], "article_id": article_id})
    return {"is_saved": existing is not None}


@router.get("/saved-articles", response_model=List[SavedArticleOut])
async def get_saved_articles(current_user: dict = Depends(get_current_user)):
    saved = await db.saved_articles.find({"user_id": current_user["id"]}, {"_id": 0}).sort("saved_at", -1).to_list(100)
    return [SavedArticleOut(**s) for s in saved]


# ─── Likes ─────────────────────────────────────────────────────────────────────

@router.post("/articles/{article_id}/like")
async def toggle_like(article_id: str, current_user: dict = Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article introuvable")
    user_id = current_user["id"]
    liked_by = article.get("liked_by", [])
    if user_id in liked_by:
        action = "unliked"
        await db.articles.update_one({"id": article_id}, {"$pull": {"liked_by": user_id}, "$inc": {"likes_count": -1}})
    else:
        action = "liked"
        await db.articles.update_one({"id": article_id}, {"$push": {"liked_by": user_id}, "$inc": {"likes_count": 1}})
        if article["author_id"] != user_id:
            await db.admin_notifications.insert_one({
                "id": str(uuid.uuid4()), "type": "like", "user_id": article["author_id"],
                "message": f"{current_user['username']} a aime votre article \"{article['title']}\"",
                "status": "info", "created_at": datetime.now(timezone.utc).isoformat()
            })
    updated = await db.articles.find_one({"id": article_id}, {"_id": 0, "likes_count": 1, "liked_by": 1})
    await manager.broadcast_all({"type": "like_update", "content_type": "article", "id": article_id, "likes_count": updated.get("likes_count", 0), "liked_by": updated.get("liked_by", [])})
    return {"action": action, "likes_count": updated.get("likes_count", 0), "liked_by": updated.get("liked_by", [])}

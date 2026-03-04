from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from database import db
from models.property import (
    PropertyCreate, PropertyUpdate, PropertyOut,
    PaginatedProperties, PROPERTY_TYPES, PROPERTY_STATUSES
)
from middleware.auth import get_current_user, require_agent
from utils import sanitize, sanitize_html, sanitize_url
from routes.messages import manager
from pymongo import ReturnDocument
import uuid
from datetime import datetime, timezone

router = APIRouter(tags=["properties"])


@router.get("/properties/map/markers")
async def get_map_markers(
    type: str = Query("", max_length=20),
    city: str = Query("", max_length=100),
    status: str = Query("", max_length=20),
    min_price: float = Query(0, ge=0),
    max_price: float = Query(0, ge=0),
):
    query = {"latitude": {"$ne": None}, "longitude": {"$ne": None}}
    if type:
        query["type"] = type
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if status:
        query["status"] = status
    if min_price > 0:
        query["price"] = query.get("price", {})
        query["price"]["$gte"] = min_price
    if max_price > 0:
        query["price"] = query.get("price", {})
        query["price"]["$lte"] = max_price
    props = await db.properties.find(query, {
        "_id": 0, "id": 1, "title": 1, "type": 1, "price": 1, "currency": 1,
        "city": 1, "latitude": 1, "longitude": 1, "images": 1, "status": 1
    }).to_list(500)
    for p in props:
        p["image"] = p.get("images", [None])[0] if p.get("images") else None
        p.pop("images", None)
    return props


@router.get("/properties", response_model=PaginatedProperties)
async def get_properties(
    type: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    status: Optional[str] = Query("disponible"),
    price_min: Optional[float] = Query(None),
    price_max: Optional[float] = Query(None),
    sort: str = Query("recent"),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
):
    query = {}
    if type and type in PROPERTY_TYPES:
        query["type"] = type
    if city:
        query["city"] = {"$regex": city.strip(), "$options": "i"}
    if status and status in PROPERTY_STATUSES:
        query["status"] = status
    elif status == "all":
        pass
    else:
        query["status"] = "disponible"
    if price_min is not None:
        query.setdefault("price", {})["$gte"] = price_min
    if price_max is not None:
        query.setdefault("price", {})["$lte"] = price_max

    sort_field, sort_dir = "created_at", -1
    if sort == "price_asc":
        sort_field, sort_dir = "price", 1
    elif sort == "price_desc":
        sort_field, sort_dir = "price", -1

    total = await db.properties.count_documents(query)
    skip = (page - 1) * limit
    props = await db.properties.find(query, {"_id": 0}).sort(sort_field, sort_dir).skip(skip).limit(limit).to_list(limit)

    for p in props:
        author = await db.users.find_one({"id": p.get("author_id", "")}, {"_id": 0, "username": 1})
        p["author_username"] = author["username"] if author else ""

    return PaginatedProperties(properties=props, total=total, pages=max(1, -(-total // limit)))


@router.get("/properties/{property_id}", response_model=PropertyOut)
async def get_property(property_id: str):
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Annonce introuvable")
    author = await db.users.find_one({"id": prop.get("author_id", "")}, {"_id": 0, "username": 1})
    prop["author_username"] = author["username"] if author else ""
    return prop


@router.post("/properties/{property_id}/view")
async def view_property(property_id: str):
    result = await db.properties.find_one_and_update(
        {"id": property_id}, {"$inc": {"views": 1}},
        projection={"_id": 0, "views": 1}, return_document=ReturnDocument.AFTER
    )
    if result:
        await manager.broadcast_all({"type": "view_update", "content_type": "property", "id": property_id, "views": result["views"]})
    return {"ok": True}


@router.post("/properties", response_model=PropertyOut)
async def create_property(data: PropertyCreate, current_user: dict = Depends(require_agent)):
    prop_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    prop = {
        "id": prop_id,
        "title": sanitize(data.title),
        "type": data.type,
        "price": data.price,
        "currency": data.currency,
        "description": sanitize_html(data.description),
        "city": sanitize(data.city),
        "neighborhood": sanitize(data.neighborhood),
        "address": sanitize(data.address),
        "latitude": data.latitude,
        "longitude": data.longitude,
        "seller_name": sanitize(data.seller_name),
        "seller_phone": sanitize(data.seller_phone),
        "seller_email": sanitize(data.seller_email),
        "seller_whatsapp": sanitize(data.seller_whatsapp),
        "images": [url for url in data.images if url.startswith("http")],
        "video_url": sanitize_url(data.video_url) or "",
        "status": "disponible",
        "author_id": current_user["id"],
        "created_at": now,
        "views": 0,
        "likes_count": 0,
        "liked_by": [],
    }
    await db.properties.insert_one(prop)
    prop["author_username"] = current_user.get("username", "")
    del prop["_id"]
    await manager.broadcast_all({"type": "content_update", "content_type": "property", "action": "created", "title": sanitize(data.title)})
    return prop


@router.put("/properties/{property_id}", response_model=PropertyOut)
async def update_property(property_id: str, data: PropertyUpdate, current_user: dict = Depends(require_agent)):
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Annonce introuvable")
    if current_user.get("role") != "admin" and prop["author_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Vous ne pouvez modifier que vos propres annonces")

    updates = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if "title" in updates:
        updates["title"] = sanitize(updates["title"])
    if "description" in updates:
        updates["description"] = sanitize_html(updates["description"])
    if "city" in updates:
        updates["city"] = sanitize(updates["city"])
    if "images" in updates:
        updates["images"] = [u for u in updates["images"] if u.startswith("http")]

    await db.properties.update_one({"id": property_id}, {"$set": updates})
    prop.update(updates)
    author = await db.users.find_one({"id": prop.get("author_id", "")}, {"_id": 0, "username": 1})
    prop["author_username"] = author["username"] if author else ""
    await manager.broadcast_all({"type": "content_update", "content_type": "property", "action": "updated"})
    return prop


@router.delete("/properties/{property_id}")
async def delete_property(property_id: str, current_user: dict = Depends(require_agent)):
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Annonce introuvable")
    if current_user.get("role") != "admin" and prop["author_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Vous ne pouvez supprimer que vos propres annonces")
    await db.properties.delete_one({"id": property_id})
    return {"ok": True}


@router.get("/my-properties", response_model=List[PropertyOut])
async def get_my_properties(current_user: dict = Depends(require_agent)):
    props = await db.properties.find({"author_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for p in props:
        p["author_username"] = current_user.get("username", "")
    return props


@router.post("/properties/{property_id}/like")
async def toggle_property_like(property_id: str, current_user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0, "id": 1, "liked_by": 1, "title": 1, "author_id": 1})
    if not prop:
        raise HTTPException(status_code=404, detail="Annonce introuvable")

    user_id = current_user["id"]
    liked_by = prop.get("liked_by", [])
    already_liked = user_id in liked_by

    if already_liked:
        await db.properties.update_one(
            {"id": property_id},
            {"$pull": {"liked_by": user_id}, "$inc": {"likes_count": -1}}
        )
        action = "unlike"
    else:
        await db.properties.update_one(
            {"id": property_id},
            {"$addToSet": {"liked_by": user_id}, "$inc": {"likes_count": 1}}
        )
        action = "like"
        # Notify property owner (not self-like)
        if prop.get("author_id") and prop["author_id"] != user_id:
            import uuid as _uuid
            await db.user_notifications.insert_one({
                "id": str(_uuid.uuid4()),
                "user_id": prop["author_id"],
                "type": "property_like",
                "message": f"{current_user.get('username', 'Un utilisateur')} a aimé votre annonce \"{prop.get('title', '')}\"",
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

    updated = await db.properties.find_one({"id": property_id}, {"_id": 0, "likes_count": 1, "liked_by": 1})
    await manager.broadcast_all({"type": "like_update", "content_type": "property", "id": property_id, "likes_count": updated.get("likes_count", 0), "liked_by": updated.get("liked_by", [])})
    return {"action": action, "likes_count": updated.get("likes_count", 0), "liked_by": updated.get("liked_by", [])}

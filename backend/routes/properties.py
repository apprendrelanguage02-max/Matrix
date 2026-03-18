from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from database import db
from models.property import (
    PropertyCreate, PropertyUpdate, PropertyOut,
    PaginatedProperties, SavedPropertyOut, SearchAlertCreate, SearchAlertOut,
    PROPERTY_TYPES, PROPERTY_STATUSES, PROPERTY_CATEGORIES, convert_price
)
from middleware.auth import get_current_user, require_agent, require_admin
from utils import sanitize, sanitize_html, sanitize_url
from routes.messages import manager
from pymongo import ReturnDocument
import uuid
import math
from datetime import datetime, timezone

router = APIRouter(tags=["properties"])


def enrich_property(p):
    """Add price conversion to property dict."""
    if p.get("currency", "GNF") == "GNF":
        p["price_converted"] = convert_price(p["price"])
    else:
        p["price_converted"] = {"gnf": p["price"], "usd": 0, "eur": 0}
    return p


# ─── Map Markers ────────────────────────────────────────────────────────────────

@router.get("/properties/map/markers")
async def get_map_markers(
    type: str = Query("", max_length=20),
    city: str = Query("", max_length=100),
    status: str = Query("", max_length=20),
    min_price: float = Query(0, ge=0),
    max_price: float = Query(0, ge=0),
    neighborhood: str = Query("", max_length=100),
    property_category: str = Query("", max_length=50),
):
    query = {"latitude": {"$ne": None}, "longitude": {"$ne": None}}
    if type:
        query["type"] = type
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if status:
        query["status"] = status
    if neighborhood:
        query["neighborhood"] = {"$regex": neighborhood, "$options": "i"}
    if property_category:
        query["property_category"] = property_category
    if min_price > 0:
        query["price"] = query.get("price", {})
        query["price"]["$gte"] = min_price
    if max_price > 0:
        query["price"] = query.get("price", {})
        query["price"]["$lte"] = max_price
    props = await db.properties.find(query, {
        "_id": 0, "id": 1, "title": 1, "type": 1, "price": 1, "currency": 1,
        "city": 1, "neighborhood": 1, "latitude": 1, "longitude": 1, "images": 1,
        "status": 1, "bedrooms": 1, "surface_area": 1, "property_category": 1
    }).to_list(500)
    for p in props:
        p["image"] = p.get("images", [None])[0] if p.get("images") else None
        p.pop("images", None)
        if p.get("currency", "GNF") == "GNF":
            p["price_converted"] = convert_price(p["price"])
    return props


# ─── Neighborhoods ──────────────────────────────────────────────────────────────

@router.get("/properties/neighborhoods")
async def get_neighborhoods(city: str = Query("", max_length=100)):
    """Get distinct neighborhoods, optionally filtered by city."""
    query = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    neighborhoods = await db.properties.distinct("neighborhood", query)
    return [n for n in neighborhoods if n]


# ─── Nearby Properties ──────────────────────────────────────────────────────────

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@router.get("/properties/nearby")
async def get_nearby_properties(
    lat: float = Query(...), lng: float = Query(...),
    radius_km: float = Query(5, ge=1, le=50),
    type: str = Query("", max_length=20),
    limit: int = Query(50, ge=1, le=100),
):
    # Rough bounding box to pre-filter (1 degree ~ 111km)
    delta = radius_km / 111.0
    query = {
        "latitude": {"$gte": lat - delta, "$lte": lat + delta, "$ne": None},
        "longitude": {"$gte": lng - delta, "$lte": lng + delta, "$ne": None},
        "status": "disponible",
    }
    if type:
        query["type"] = type
    candidates = await db.properties.find(query, {
        "_id": 0, "id": 1, "title": 1, "type": 1, "price": 1, "currency": 1,
        "city": 1, "neighborhood": 1, "latitude": 1, "longitude": 1, "images": 1,
        "status": 1, "bedrooms": 1, "bathrooms": 1, "surface_area": 1,
        "property_category": 1, "address": 1, "seller_name": 1,
    }).to_list(500)
    results = []
    for p in candidates:
        dist = haversine_km(lat, lng, p["latitude"], p["longitude"])
        if dist <= radius_km:
            p["distance_km"] = round(dist, 2)
            p["image"] = p.get("images", [None])[0] if p.get("images") else None
            p.pop("images", None)
            if p.get("currency", "GNF") == "GNF":
                p["price_converted"] = convert_price(p["price"])
            results.append(p)
    results.sort(key=lambda x: x["distance_km"])
    return {"properties": results[:limit], "total": len(results), "radius_km": radius_km, "center": {"lat": lat, "lng": lng}}


# ─── Heatmap Data ───────────────────────────────────────────────────────────────

@router.get("/properties/heatmap")
async def get_heatmap_data():
    """Return lat/lng/price data for price heatmap."""
    props = await db.properties.find(
        {"latitude": {"$ne": None}, "longitude": {"$ne": None}, "status": "disponible"},
        {"_id": 0, "latitude": 1, "longitude": 1, "price": 1, "currency": 1}
    ).to_list(1000)
    return [
        {"lat": p["latitude"], "lng": p["longitude"], "price": p["price"],
         "intensity": min(1.0, p["price"] / 5000000000)}
        for p in props
    ]


# ─── Price Estimation ───────────────────────────────────────────────────────────

@router.get("/properties/estimate")
async def estimate_price(
    city: str = Query(..., min_length=2),
    commune: str = Query(""),
    neighborhood: str = Query(""),
    property_category: str = Query("autre"),
    bedrooms: int = Query(0, ge=0),
    surface_area: float = Query(0, ge=0),
):
    """Estimate price based on admin-set price references + similar properties."""
    # First check if admin has set price references
    ref_query = {"city": city}
    if commune:
        ref_query["commune"] = commune
    if neighborhood:
        ref_query["quartier"] = neighborhood

    # Try most specific match first (city+commune+quartier), then city+commune, then city
    ref = None
    if neighborhood and commune:
        ref = await db.price_references.find_one({"city": city, "commune": commune, "quartier": neighborhood}, {"_id": 0})
    if not ref and commune:
        ref = await db.price_references.find_one({"city": city, "commune": commune, "quartier": ""}, {"_id": 0})
    if not ref:
        ref = await db.price_references.find_one({"city": city, "commune": "", "quartier": ""}, {"_id": 0})

    if ref and ref.get("price_per_sqm", 0) > 0:
        price_per_sqm = ref["price_per_sqm"]
        # Use admin price reference for estimation
        area = surface_area if surface_area > 0 else 200  # default 200m²
        estimated = round(price_per_sqm * area)
        return {
            "estimated_price": estimated,
            "price_per_sqm": price_per_sqm,
            "surface_used": area,
            "sample_count": 0,
            "confidence": "high",
            "source": "reference",
            "price_range": {"min": round(estimated * 0.85), "max": round(estimated * 1.15)},
            "price_converted": convert_price(estimated),
        }

    # Fallback to similar properties analysis
    query = {"city": {"$regex": city, "$options": "i"}, "status": "disponible"}
    if commune:
        query["neighborhood"] = {"$regex": commune, "$options": "i"}
    if neighborhood:
        query["neighborhood"] = {"$regex": neighborhood, "$options": "i"}
    if property_category and property_category != "autre":
        query["property_category"] = property_category
    if bedrooms > 0:
        query["bedrooms"] = {"$gte": max(0, bedrooms - 1), "$lte": bedrooms + 1}

    similar = await db.properties.find(query, {"_id": 0, "price": 1, "surface_area": 1, "bedrooms": 1}).to_list(50)

    if not similar:
        query = {"city": {"$regex": city, "$options": "i"}, "status": "disponible"}
        similar = await db.properties.find(query, {"_id": 0, "price": 1, "surface_area": 1}).to_list(50)

    if not similar:
        return {"estimated_price": 0, "sample_count": 0, "confidence": "low", "source": "none", "price_range": {"min": 0, "max": 0}}

    prices = [p["price"] for p in similar]
    avg = sum(prices) / len(prices)
    min_p, max_p = min(prices), max(prices)
    confidence = "high" if len(similar) >= 10 else "medium" if len(similar) >= 3 else "low"

    return {
        "estimated_price": round(avg),
        "sample_count": len(similar),
        "confidence": confidence,
        "source": "similar",
        "price_range": {"min": round(min_p), "max": round(max_p)},
        "price_converted": convert_price(round(avg)),
    }


# ─── Public List ────────────────────────────────────────────────────────────────

@router.get("/properties", response_model=PaginatedProperties)
async def get_properties(
    type: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    neighborhood: Optional[str] = Query(None),
    status: Optional[str] = Query("disponible"),
    price_min: Optional[float] = Query(None),
    price_max: Optional[float] = Query(None),
    property_category: Optional[str] = Query(None),
    bedrooms: Optional[int] = Query(None),
    sort: str = Query("recent"),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
):
    query = {}
    if type and type in PROPERTY_TYPES:
        query["type"] = type
    if city:
        query["city"] = {"$regex": city.strip(), "$options": "i"}
    if neighborhood:
        query["neighborhood"] = {"$regex": neighborhood.strip(), "$options": "i"}
    if property_category and property_category in PROPERTY_CATEGORIES:
        query["property_category"] = property_category
    if bedrooms is not None and bedrooms > 0:
        query["bedrooms"] = {"$gte": bedrooms}
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
        enrich_property(p)

    return PaginatedProperties(properties=props, total=total, pages=max(1, -(-total // limit)))


# ─── Single Property ────────────────────────────────────────────────────────────

@router.get("/properties/{property_id}", response_model=PropertyOut)
async def get_property(property_id: str):
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Annonce introuvable")
    author = await db.users.find_one({"id": prop.get("author_id", "")}, {"_id": 0, "username": 1})
    prop["author_username"] = author["username"] if author else ""
    enrich_property(prop)
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


# ─── CRUD ───────────────────────────────────────────────────────────────────────

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
        "images": [url for url in data.images if url.startswith("http") or url.startswith("/api/media/")],
        "video_url": sanitize_url(data.video_url) or "",
        "status": "disponible",
        "author_id": current_user["id"],
        "created_at": now,
        "views": 0,
        "likes_count": 0,
        "liked_by": [],
        "property_category": data.property_category,
        "bedrooms": data.bedrooms,
        "bathrooms": data.bathrooms,
        "surface_area": data.surface_area,
        "is_verified": False,
    }
    await db.properties.insert_one(prop)
    prop["author_username"] = current_user.get("username", "")
    del prop["_id"]
    enrich_property(prop)
    await manager.broadcast_all({"type": "content_update", "content_type": "property", "action": "created", "title": sanitize(data.title)})

    # Check search alerts
    await _notify_search_alerts(prop)

    return prop


async def _notify_search_alerts(prop):
    """Notify users whose search alerts match this new property."""
    query = {}
    alerts = await db.search_alerts.find({}, {"_id": 0}).to_list(500)
    for alert in alerts:
        match = True
        if alert.get("city") and alert["city"].lower() not in prop.get("city", "").lower():
            match = False
        if alert.get("neighborhood") and alert["neighborhood"].lower() not in prop.get("neighborhood", "").lower():
            match = False
        if alert.get("type") and alert["type"] != prop.get("type"):
            match = False
        if alert.get("property_category") and alert["property_category"] != prop.get("property_category"):
            match = False
        if alert.get("min_price") and prop["price"] < alert["min_price"]:
            match = False
        if alert.get("max_price") and alert["max_price"] > 0 and prop["price"] > alert["max_price"]:
            match = False
        if alert.get("min_bedrooms") and prop.get("bedrooms", 0) < alert["min_bedrooms"]:
            match = False

        if match:
            now = datetime.now(timezone.utc).isoformat()
            await db.user_notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": alert["user_id"],
                "type": "search_alert",
                "message": f"Nouvelle annonce correspondant a vos criteres : {prop['title']} a {prop['city']}",
                "is_read": False,
                "created_at": now,
                "property_id": prop["id"],
            })
            await db.search_alerts.update_one({"id": alert["id"]}, {"$set": {"last_notified": now}})
            await manager.send_to_user(alert["user_id"], {
                "type": "search_alert",
                "message": f"Nouvelle annonce : {prop['title']}",
                "property_id": prop["id"],
            })


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
        updates["images"] = [u for u in updates["images"] if u.startswith("http") or u.startswith("/api/media/")]

    await db.properties.update_one({"id": property_id}, {"$set": updates})
    prop.update(updates)
    author = await db.users.find_one({"id": prop.get("author_id", "")}, {"_id": 0, "username": 1})
    prop["author_username"] = author["username"] if author else ""
    enrich_property(prop)
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
    await db.saved_properties.delete_many({"property_id": property_id})
    return {"ok": True}


# ─── My Properties ──────────────────────────────────────────────────────────────

@router.get("/my-properties", response_model=List[PropertyOut])
async def get_my_properties(current_user: dict = Depends(require_agent)):
    props = await db.properties.find({"author_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for p in props:
        p["author_username"] = current_user.get("username", "")
        enrich_property(p)
    return props


# ─── Saved / Favorites ─────────────────────────────────────────────────────────

@router.post("/saved-properties/{property_id}")
async def toggle_save_property(property_id: str, current_user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": property_id}, {
        "_id": 0, "title": 1, "type": 1, "price": 1, "currency": 1,
        "city": 1, "neighborhood": 1, "images": 1, "bedrooms": 1, "surface_area": 1
    })
    if not prop:
        raise HTTPException(status_code=404, detail="Annonce introuvable")
    existing = await db.saved_properties.find_one({"user_id": current_user["id"], "property_id": property_id})
    if existing:
        await db.saved_properties.delete_one({"user_id": current_user["id"], "property_id": property_id})
        return {"action": "unsaved"}
    await db.saved_properties.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "property_id": property_id,
        "title": prop.get("title", ""),
        "type": prop.get("type", ""),
        "price": prop.get("price", 0),
        "currency": prop.get("currency", "GNF"),
        "city": prop.get("city", ""),
        "neighborhood": prop.get("neighborhood", ""),
        "image_url": prop.get("images", [None])[0] if prop.get("images") else None,
        "bedrooms": prop.get("bedrooms", 0),
        "surface_area": prop.get("surface_area", 0),
        "saved_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"action": "saved"}


@router.get("/saved-properties/{property_id}/status")
async def get_saved_property_status(property_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.saved_properties.find_one({"user_id": current_user["id"], "property_id": property_id})
    return {"is_saved": existing is not None}


@router.get("/saved-properties", response_model=List[SavedPropertyOut])
async def get_saved_properties(current_user: dict = Depends(get_current_user)):
    saved = await db.saved_properties.find({"user_id": current_user["id"]}, {"_id": 0}).sort("saved_at", -1).to_list(100)
    return [SavedPropertyOut(**s) for s in saved]


# ─── Search Alerts ──────────────────────────────────────────────────────────────

@router.post("/search-alerts", response_model=SearchAlertOut)
async def create_search_alert(data: SearchAlertCreate, current_user: dict = Depends(get_current_user)):
    count = await db.search_alerts.count_documents({"user_id": current_user["id"]})
    if count >= 10:
        raise HTTPException(status_code=400, detail="Maximum 10 alertes de recherche.")
    now = datetime.now(timezone.utc).isoformat()
    alert = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "city": sanitize(data.city),
        "neighborhood": sanitize(data.neighborhood),
        "type": data.type if data.type in PROPERTY_TYPES else "",
        "min_price": data.min_price,
        "max_price": data.max_price,
        "property_category": data.property_category if data.property_category in PROPERTY_CATEGORIES else "",
        "min_bedrooms": data.min_bedrooms,
        "created_at": now,
        "last_notified": None,
    }
    await db.search_alerts.insert_one(alert)
    del alert["_id"]
    return SearchAlertOut(**alert)


@router.get("/search-alerts", response_model=List[SearchAlertOut])
async def get_search_alerts(current_user: dict = Depends(get_current_user)):
    alerts = await db.search_alerts.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(10)
    return [SearchAlertOut(**a) for a in alerts]


@router.delete("/search-alerts/{alert_id}")
async def delete_search_alert(alert_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.search_alerts.delete_one({"id": alert_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alerte introuvable")
    return {"ok": True}


# ─── Agent Profile ──────────────────────────────────────────────────────────────

@router.get("/agents/{agent_id}/profile")
async def get_agent_profile(agent_id: str):
    user = await db.users.find_one({"id": agent_id}, {"_id": 0, "hashed_password": 0})
    if not user or user.get("role") not in ("agent", "admin"):
        raise HTTPException(status_code=404, detail="Agent introuvable")
    # Count properties
    total_props = await db.properties.count_documents({"author_id": agent_id})
    available_props = await db.properties.count_documents({"author_id": agent_id, "status": "disponible"})
    total_views = 0
    async for p in db.properties.find({"author_id": agent_id}, {"_id": 0, "views": 1}):
        total_views += p.get("views", 0)
    return {
        "id": user["id"],
        "username": user.get("username", ""),
        "email": user.get("email", ""),
        "role": user.get("role", ""),
        "created_at": user.get("created_at", ""),
        "bio": user.get("bio", ""),
        "phone": user.get("phone", ""),
        "avatar_url": user.get("avatar_url", ""),
        "stats": {
            "total_properties": total_props,
            "available_properties": available_props,
            "total_views": total_views,
        }
    }


@router.get("/agents/{agent_id}/properties", response_model=List[PropertyOut])
async def get_agent_properties(agent_id: str):
    user = await db.users.find_one({"id": agent_id}, {"_id": 0, "id": 1, "role": 1, "username": 1})
    if not user or user.get("role") not in ("agent", "admin"):
        raise HTTPException(status_code=404, detail="Agent introuvable")
    props = await db.properties.find(
        {"author_id": agent_id, "status": "disponible"}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    for p in props:
        p["author_username"] = user.get("username", "")
        enrich_property(p)
    return props


# ─── Likes ──────────────────────────────────────────────────────────────────────

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
        if prop.get("author_id") and prop["author_id"] != user_id:
            await db.user_notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": prop["author_id"],
                "type": "property_like",
                "message": f"{current_user.get('username', 'Un utilisateur')} a aime votre annonce \"{prop.get('title', '')}\"",
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

    updated = await db.properties.find_one({"id": property_id}, {"_id": 0, "likes_count": 1, "liked_by": 1})
    await manager.broadcast_all({"type": "like_update", "content_type": "property", "id": property_id, "likes_count": updated.get("likes_count", 0), "liked_by": updated.get("liked_by", [])})
    return {"action": action, "likes_count": updated.get("likes_count", 0), "liked_by": updated.get("liked_by", [])}



# ─── Admin Verification Badge ────────────────────────────────────────────────

@router.post("/properties/{property_id}/verify")
async def toggle_verify_property(property_id: str, current_user: dict = Depends(require_admin)):
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0, "id": 1, "is_verified": 1})
    if not prop:
        raise HTTPException(status_code=404, detail="Annonce introuvable")
    new_status = not prop.get("is_verified", False)
    await db.properties.update_one({"id": property_id}, {"$set": {"is_verified": new_status}})
    return {"is_verified": new_status, "message": "Annonce verifiee" if new_status else "Verification retiree"}

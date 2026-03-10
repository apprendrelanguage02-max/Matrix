import os
import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from database import client
from config import UPLOAD_DIR
from routes.auth import router as auth_router
from routes.articles import router as articles_router
from routes.properties import router as properties_router
from routes.procedures import router as procedures_router
from routes.payments import router as payments_router
from routes.upload import router as upload_router
from routes.admin import router as admin_router
from routes.notifications import router as notifications_router
from routes.messages import router as messages_router
from database import db

app = FastAPI(title="Matrix News API", version="3.0")

# ─── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Register Routers ──────────────────────────────────────────────────────────
PREFIX = "/api"

app.include_router(auth_router, prefix=f"{PREFIX}/auth")
app.include_router(articles_router, prefix=PREFIX)
app.include_router(properties_router, prefix=PREFIX)
app.include_router(procedures_router, prefix=PREFIX)
app.include_router(payments_router, prefix=PREFIX)
app.include_router(upload_router, prefix=PREFIX)
app.include_router(admin_router, prefix=f"{PREFIX}/admin")
app.include_router(notifications_router, prefix=PREFIX)
app.include_router(messages_router, prefix=PREFIX)

# ─── Root ──────────────────────────────────────────────────────────────────────
@app.get("/api/")
async def root():
    return {"message": "Matrix News API v3"}


# ─── Guinea Locations (Public) ─────────────────────────────────────────────────
from data.guinea_locations import GUINEA_LOCATIONS, get_cities, get_communes, get_quartiers
from fastapi import Query as FQ

@app.get("/api/locations/cities")
async def list_cities():
    return get_cities()

@app.get("/api/locations/communes")
async def list_communes(city: str = FQ("")):
    return get_communes(city)

@app.get("/api/locations/quartiers")
async def list_quartiers(city: str = FQ(""), commune: str = FQ("")):
    return get_quartiers(city, commune)

@app.get("/api/locations/all")
async def all_locations():
    return GUINEA_LOCATIONS

@app.get("/api/price-references/public")
async def public_price_references(city: str = FQ(""), commune: str = FQ(""), quartier: str = FQ("")):
    query = {}
    if city:
        query["city"] = city
    if commune:
        query["commune"] = commune
    if quartier:
        query["quartier"] = quartier
    refs = await db.price_references.find(query, {"_id": 0}).to_list(200)
    return refs


# ─── Global Search ─────────────────────────────────────────────────────────────
from fastapi import Query as Q

@app.get("/api/search")
async def global_search(q: str = Q("", max_length=200)):
    if not q.strip():
        return {"articles": [], "properties": [], "procedures": []}
    # Escape user input so malformed patterns (e.g. "[") do not crash Mongo regex parsing.
    # We still keep case-insensitive substring search semantics via the "i" option.
    safe_query = re.escape(q.strip())
    regex = {"$regex": safe_query, "$options": "i"}
    articles = await db.articles.find(
        {"$or": [{"title": regex}, {"content": regex}]}, {"_id": 0, "id": 1, "title": 1, "category": 1, "image_url": 1, "author_name": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    properties = await db.properties.find(
        {"$or": [{"title": regex}, {"description": regex}, {"city": regex}]}, {"_id": 0, "id": 1, "title": 1, "type": 1, "city": 1, "price": 1, "currency": 1, "images": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    for p in properties:
        p["image"] = p.get("images", [None])[0] if p.get("images") else None
        p.pop("images", None)
    procedures = await db.procedures.find(
        {"$or": [{"title": regex}, {"content": regex}]}, {"_id": 0, "id": 1, "title": 1, "country": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    return {"articles": articles, "properties": properties, "procedures": procedures}

# ─── Serve uploaded files ──────────────────────────────────────────────────────
app.mount("/api/media", StaticFiles(directory=str(UPLOAD_DIR)), name="media")

# ─── Shutdown ──────────────────────────────────────────────────────────────────
@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

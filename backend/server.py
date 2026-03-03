import os
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

# ─── Serve uploaded files ──────────────────────────────────────────────────────
app.mount("/api/media", StaticFiles(directory=str(UPLOAD_DIR)), name="media")

# ─── Shutdown ──────────────────────────────────────────────────────────────────
@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

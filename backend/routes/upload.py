from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from database import db
from config import (
    ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES,
    MAX_IMAGE_SIZE, MAX_VIDEO_SIZE,
    UPLOAD_IMAGES_DIR, UPLOAD_VIDEOS_DIR
)
from middleware.auth import get_current_user
import uuid
import os
from pathlib import Path

router = APIRouter(tags=["upload"])


@router.post("/upload")
async def upload_media(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    content_type = file.content_type or ""

    if content_type in ALLOWED_IMAGE_TYPES:
        max_size = MAX_IMAGE_SIZE
        save_dir = UPLOAD_IMAGES_DIR
        media_type = "image"
    elif content_type in ALLOWED_VIDEO_TYPES:
        max_size = MAX_VIDEO_SIZE
        save_dir = UPLOAD_VIDEOS_DIR
        media_type = "video"
    else:
        raise HTTPException(status_code=400, detail="Type de fichier non autorisé. Utilisez JPG, PNG, WEBP, MP4 ou WebM.")

    data = await file.read()
    if len(data) > max_size:
        limit_mb = max_size // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Fichier trop volumineux. Limite : {limit_mb} Mo.")

    ext = Path(file.filename).suffix.lower() if file.filename else ""
    if not ext:
        ext = ".jpg" if media_type == "image" else ".mp4"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    dest = save_dir / unique_name

    with open(dest, "wb") as f:
        f.write(data)

    backend_url = os.environ.get("REACT_APP_BACKEND_URL", "")
    public_url = f"{backend_url}/api/media/{media_type}s/{unique_name}"

    return {"url": public_url, "type": media_type, "filename": unique_name}

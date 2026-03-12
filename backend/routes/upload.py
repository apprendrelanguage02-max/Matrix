from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from middleware.auth import get_current_user
from cloud_storage import put_object, APP_NAME
import uuid
from pathlib import Path

router = APIRouter(tags=["upload"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50 MB


@router.post("/upload")
async def upload_media(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    content_type = file.content_type or ""

    if content_type in ALLOWED_IMAGE_TYPES:
        max_size = MAX_IMAGE_SIZE
        media_type = "image"
        folder = "images"
    elif content_type in ALLOWED_VIDEO_TYPES:
        max_size = MAX_VIDEO_SIZE
        media_type = "video"
        folder = "videos"
    else:
        raise HTTPException(status_code=400, detail="Type de fichier non autorise. Utilisez JPG, PNG, WEBP, MP4 ou WebM.")

    data = await file.read()
    if len(data) > max_size:
        limit_mb = max_size // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Fichier trop volumineux. Limite : {limit_mb} Mo.")

    ext = Path(file.filename).suffix.lower() if file.filename else ""
    if not ext:
        ext = ".jpg" if media_type == "image" else ".mp4"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    storage_path = f"{APP_NAME}/{folder}/{unique_name}"

    result = put_object(storage_path, data, content_type)

    # Always return a RELATIVE cloud proxy URL (deployment-independent)
    public_url = f"/api/media/cloud/{result['path']}"

    return {"url": public_url, "type": media_type, "filename": unique_name, "storage_path": result["path"]}

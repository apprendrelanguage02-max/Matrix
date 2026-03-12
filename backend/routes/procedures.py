from fastapi import APIRouter, HTTPException, Depends, Query, File, UploadFile, Response
from typing import List, Optional
from database import db
from models.procedure import (
    ProcedureCreate, ProcedureUpdate, ProcedureOut, ProcedureStepOut, QuickActionOut,
    PaginatedProcedures, ProcedureFileOut, ChatActionCreate, ChatActionOut,
    PROCEDURE_CATEGORIES, PROCEDURE_COUNTRIES, PROCEDURE_SUBCATEGORIES,
    COMPLEXITY_LEVELS, LANGUAGES,
)
from middleware.auth import require_admin, get_current_user
from utils import sanitize, sanitize_html, sanitize_url
from cloud_storage import put_object, get_object, APP_NAME
import uuid
from datetime import datetime, timezone

router = APIRouter(tags=["procedures"])


# ─── Helpers ────────────────────────────────────────────────────────────────────

def get_country_info(country_id: str):
    for c in PROCEDURE_COUNTRIES:
        if c["id"] == country_id:
            return c
    return {"id": country_id, "name": country_id, "flag": "un"}


def get_category_name(cat_id: str):
    for c in PROCEDURE_CATEGORIES:
        if c["id"] == cat_id:
            return c["name"]
    return cat_id


def get_subcategory_info(subcat_id: str):
    return get_country_info(subcat_id)


async def enrich_procedure(p: dict) -> dict:
    """Transform a raw procedure document into ProcedureOut-compatible dict."""
    country = get_country_info(p.get("country", p.get("subcategory", "")))
    cat_name = get_category_name(p.get("category", "autre"))
    author = await db.users.find_one({"id": p.get("author_id", "")}, {"_id": 0, "username": 1})

    # Load files
    files = await db.procedure_files.find(
        {"procedure_id": p["id"], "is_deleted": False}, {"_id": 0}
    ).to_list(50)

    steps = [ProcedureStepOut(**s).model_dump() for s in p.get("steps", [])]
    quick_actions = [QuickActionOut(**q).model_dump() for q in p.get("quick_actions", [])]

    return {
        "id": p["id"],
        "title": p.get("title", ""),
        "description": p.get("description", ""),
        "category": p.get("category", "autre"),
        "category_name": cat_name,
        "keywords": p.get("keywords", []),
        "country": country["id"],
        "country_name": country["name"],
        "country_flag": country["flag"],
        "language": p.get("language", "fr"),
        "complexity": p.get("complexity", "modere"),
        "active": p.get("active", True),
        "status": p.get("status", "published"),
        "image_url": p.get("image_url", ""),
        "video_url": p.get("video_url", ""),
        "steps": steps,
        "quick_actions": quick_actions,
        "files": [ProcedureFileOut(**f).model_dump() for f in files],
        "author_id": p.get("author_id", ""),
        "author_username": author["username"] if author else "",
        "created_at": p.get("created_at", ""),
        "updated_at": p.get("updated_at", ""),
        "views": p.get("views", 0),
        "version": p.get("version", 1),
        # Legacy compat
        "subcategory": country["id"],
        "subcategory_name": country["name"],
        "subcategory_flag": country.get("flag", ""),
        "content": p.get("content", p.get("description", "")),
    }


# ─── Reference Data ─────────────────────────────────────────────────────────────

@router.get("/procedures/categories")
async def get_procedure_categories():
    return PROCEDURE_CATEGORIES


@router.get("/procedures/countries")
async def get_procedure_countries():
    return PROCEDURE_COUNTRIES


@router.get("/procedures/subcategories")
async def get_procedure_subcategories():
    return PROCEDURE_SUBCATEGORIES


@router.get("/procedures/languages")
async def get_procedure_languages():
    return LANGUAGES


@router.get("/procedures/complexity-levels")
async def get_complexity_levels():
    return COMPLEXITY_LEVELS


# ─── CRUD Procedures ────────────────────────────────────────────────────────────

@router.get("/procedures", response_model=PaginatedProcedures)
async def get_procedures(
    category: str = Query("", max_length=50),
    country: str = Query("", max_length=50),
    subcategory: str = Query("", max_length=50),
    search: str = Query("", max_length=100),
    status: str = Query("", max_length=20),
    complexity: str = Query("", max_length=20),
    active_only: bool = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    query = {}
    if category:
        query["category"] = category
    # Support both country and legacy subcategory
    country_filter = country or subcategory
    if country_filter:
        query["$or"] = [{"country": country_filter}, {"subcategory": country_filter}]
    if search:
        query["$or"] = query.get("$or", []) + [
            {"title": {"$regex": search, "$options": "i"}},
            {"keywords": {"$regex": search, "$options": "i"}},
        ]
        if not country_filter:
            pass  # $or already set
    if status:
        query["status"] = status
    if complexity:
        query["complexity"] = complexity
    if active_only:
        query["active"] = True

    total = await db.procedures.count_documents(query)
    pages = max(1, (total + limit - 1) // limit)
    skip = (page - 1) * limit

    procedures = await db.procedures.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    result = []
    for p in procedures:
        enriched = await enrich_procedure(p)
        result.append(enriched)

    return PaginatedProcedures(procedures=result, total=total, page=page, pages=pages)


@router.get("/procedures/stats")
async def get_procedures_stats(current_user: dict = Depends(require_admin)):
    total = await db.procedures.count_documents({})
    published = await db.procedures.count_documents({"status": "published"})
    drafts = await db.procedures.count_documents({"status": "draft"})
    active = await db.procedures.count_documents({"active": True})
    total_files = await db.procedure_files.count_documents({"is_deleted": False})
    total_chat_actions = await db.chat_actions.count_documents({})

    # By category
    pipeline = [{"$group": {"_id": "$category", "count": {"$sum": 1}}}]
    by_category = {r["_id"]: r["count"] async for r in db.procedures.aggregate(pipeline)}

    # By country
    pipeline2 = [{"$group": {"_id": {"$ifNull": ["$country", "$subcategory"]}, "count": {"$sum": 1}}}]
    by_country = {r["_id"]: r["count"] async for r in db.procedures.aggregate(pipeline2)}

    # Total views
    pipeline3 = [{"$group": {"_id": None, "total": {"$sum": "$views"}}}]
    views_result = await db.procedures.aggregate(pipeline3).to_list(1)
    total_views = views_result[0]["total"] if views_result else 0

    return {
        "total": total, "published": published, "drafts": drafts, "active": active,
        "total_files": total_files, "total_chat_actions": total_chat_actions,
        "total_views": total_views,
        "by_category": by_category, "by_country": by_country,
    }


@router.get("/procedures/{procedure_id}")
async def get_procedure(procedure_id: str):
    proc = await db.procedures.find_one({"id": procedure_id}, {"_id": 0})
    if not proc:
        raise HTTPException(status_code=404, detail="Procedure introuvable")

    await db.procedures.update_one({"id": procedure_id}, {"$inc": {"views": 1}})
    proc["views"] = proc.get("views", 0) + 1

    enriched = await enrich_procedure(proc)
    return enriched


@router.post("/procedures")
async def create_procedure(data: ProcedureCreate, current_user: dict = Depends(require_admin)):
    procedure_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    # Process steps: ensure each has an ID and order
    steps = []
    for i, s in enumerate(data.steps):
        steps.append({
            "id": s.id or str(uuid.uuid4()),
            "order": s.order if s.order > 0 else i + 1,
            "title": sanitize(s.title),
            "description": s.description,
            "required_documents": s.required_documents,
            "links": s.links,
            "video_url": sanitize_url(s.video_url) if s.video_url else "",
            "mandatory": s.mandatory,
        })

    quick_actions = []
    for q in data.quick_actions:
        quick_actions.append({
            "id": q.id or str(uuid.uuid4()),
            "label": sanitize(q.label),
            "action_type": q.action_type,
        })

    proc = {
        "id": procedure_id,
        "title": sanitize(data.title),
        "description": data.description or "",
        "category": data.category,
        "keywords": data.keywords,
        "country": data.country,
        "language": data.language,
        "complexity": data.complexity,
        "active": data.active,
        "status": data.status,
        "image_url": sanitize_url(data.image_url) if data.image_url else "",
        "video_url": sanitize_url(data.video_url) if data.video_url else "",
        "steps": steps,
        "quick_actions": quick_actions,
        "content": data.content or data.description or "",
        "subcategory": data.subcategory or data.country,
        "author_id": current_user["id"],
        "created_at": now,
        "updated_at": now,
        "views": 0,
        "version": 1,
        "versions_history": [],
    }
    await db.procedures.insert_one(proc)
    if "_id" in proc:
        del proc["_id"]

    enriched = await enrich_procedure(proc)
    return enriched


@router.put("/procedures/{procedure_id}")
async def update_procedure(procedure_id: str, data: ProcedureUpdate, current_user: dict = Depends(require_admin)):
    proc = await db.procedures.find_one({"id": procedure_id}, {"_id": 0})
    if not proc:
        raise HTTPException(status_code=404, detail="Procedure introuvable")

    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}

    # Save current version to history
    version_snapshot = {
        "version": proc.get("version", 1),
        "title": proc.get("title"),
        "saved_at": updates["updated_at"],
    }

    if data.title is not None:
        updates["title"] = sanitize(data.title)
    if data.description is not None:
        updates["description"] = data.description
        updates["content"] = data.content or data.description
    if data.category is not None:
        updates["category"] = data.category
    if data.keywords is not None:
        updates["keywords"] = data.keywords
    if data.country is not None:
        updates["country"] = data.country
        updates["subcategory"] = data.country
    if data.language is not None:
        updates["language"] = data.language
    if data.complexity is not None:
        updates["complexity"] = data.complexity
    if data.active is not None:
        updates["active"] = data.active
    if data.status is not None:
        updates["status"] = data.status
    if data.image_url is not None:
        updates["image_url"] = sanitize_url(data.image_url) if data.image_url else ""
    if data.video_url is not None:
        updates["video_url"] = sanitize_url(data.video_url) if data.video_url else ""
    if data.content is not None:
        updates["content"] = data.content

    if data.steps is not None:
        steps = []
        for i, s in enumerate(data.steps):
            steps.append({
                "id": s.id or str(uuid.uuid4()),
                "order": s.order if s.order > 0 else i + 1,
                "title": sanitize(s.title),
                "description": s.description,
                "required_documents": s.required_documents,
                "links": s.links,
                "video_url": sanitize_url(s.video_url) if s.video_url else "",
                "mandatory": s.mandatory,
            })
        updates["steps"] = steps

    if data.quick_actions is not None:
        quick_actions = []
        for q in data.quick_actions:
            quick_actions.append({
                "id": q.id or str(uuid.uuid4()),
                "label": sanitize(q.label),
                "action_type": q.action_type,
            })
        updates["quick_actions"] = quick_actions

    updates["version"] = proc.get("version", 1) + 1

    await db.procedures.update_one({"id": procedure_id}, {
        "$set": updates,
        "$push": {"versions_history": {"$each": [version_snapshot], "$slice": -20}},
    })

    proc.update(updates)
    enriched = await enrich_procedure(proc)
    return enriched


@router.delete("/procedures/{procedure_id}")
async def delete_procedure(procedure_id: str, current_user: dict = Depends(require_admin)):
    proc = await db.procedures.find_one({"id": procedure_id}, {"_id": 0})
    if not proc:
        raise HTTPException(status_code=404, detail="Procedure introuvable")
    await db.procedures.delete_one({"id": procedure_id})
    # Soft-delete files
    await db.procedure_files.update_many({"procedure_id": procedure_id}, {"$set": {"is_deleted": True}})
    return {"ok": True, "message": "Procedure supprimee"}


# ─── Procedure Files ────────────────────────────────────────────────────────────

@router.post("/procedures/{procedure_id}/files")
async def upload_procedure_file(
    procedure_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin),
):
    proc = await db.procedures.find_one({"id": procedure_id}, {"_id": 0, "id": 1})
    if not proc:
        raise HTTPException(status_code=404, detail="Procedure introuvable")

    allowed = {"application/pdf", "image/jpeg", "image/png", "image/webp",
               "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
               "text/plain", "text/csv"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Type de fichier non autorise. PDF, images, DOC, TXT acceptes.")

    data = await file.read()
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux. Limite: 20 Mo.")

    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "bin"
    storage_path = f"{APP_NAME}/procedures/{procedure_id}/{uuid.uuid4()}.{ext}"

    result = put_object(storage_path, data, file.content_type or "application/octet-stream")

    file_id = str(uuid.uuid4())
    file_type = "pdf" if "pdf" in (file.content_type or "") else "document"
    file_doc = {
        "id": file_id,
        "procedure_id": procedure_id,
        "file_name": file.filename or f"fichier.{ext}",
        "original_filename": file.filename or "",
        "storage_path": result["path"],
        "content_type": file.content_type or "",
        "file_type": file_type,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.procedure_files.insert_one(file_doc)
    if "_id" in file_doc:
        del file_doc["_id"]

    return file_doc


@router.get("/procedures/{procedure_id}/files")
async def list_procedure_files(procedure_id: str):
    files = await db.procedure_files.find(
        {"procedure_id": procedure_id, "is_deleted": False}, {"_id": 0}
    ).to_list(100)
    return files


@router.delete("/procedures/files/{file_id}")
async def delete_procedure_file(file_id: str, current_user: dict = Depends(require_admin)):
    result = await db.procedure_files.update_one({"id": file_id}, {"$set": {"is_deleted": True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    return {"ok": True}


@router.get("/procedures/files/{file_id}/download")
async def download_procedure_file(file_id: str):
    file_doc = await db.procedure_files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    data, content_type = get_object(file_doc["storage_path"])
    return Response(
        content=data,
        media_type=file_doc.get("content_type", content_type),
        headers={"Content-Disposition": f'attachment; filename="{file_doc.get("original_filename", "file")}"'}
    )


# ─── Chat Actions ───────────────────────────────────────────────────────────────

@router.get("/chat-actions")
async def list_chat_actions():
    actions = await db.chat_actions.find({"active": True}, {"_id": 0}).sort("created_at", -1).to_list(50)
    for a in actions:
        country = get_country_info(a.get("country", ""))
        a["country_name"] = country["name"]
        a["country_flag"] = country["flag"]
    return actions


@router.post("/chat-actions")
async def create_chat_action(data: ChatActionCreate, current_user: dict = Depends(require_admin)):
    action_id = str(uuid.uuid4())
    action = {
        "id": action_id,
        "title": sanitize(data.title),
        "country": data.country,
        "procedure_id": data.procedure_id,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.chat_actions.insert_one(action)
    if "_id" in action:
        del action["_id"]
    country = get_country_info(data.country)
    action["country_name"] = country["name"]
    action["country_flag"] = country["flag"]
    return action


@router.put("/chat-actions/{action_id}")
async def update_chat_action(action_id: str, data: ChatActionCreate, current_user: dict = Depends(require_admin)):
    updates = {"title": sanitize(data.title), "country": data.country, "procedure_id": data.procedure_id}
    result = await db.chat_actions.update_one({"id": action_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Action introuvable")
    action = await db.chat_actions.find_one({"id": action_id}, {"_id": 0})
    country = get_country_info(action.get("country", ""))
    action["country_name"] = country["name"]
    action["country_flag"] = country["flag"]
    return action


@router.delete("/chat-actions/{action_id}")
async def delete_chat_action(action_id: str, current_user: dict = Depends(require_admin)):
    result = await db.chat_actions.delete_one({"id": action_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Action introuvable")
    return {"ok": True}


# ─── Saved Procedures ──────────────────────────────────────────────────────────

@router.post("/saved-procedures/{procedure_id}")
async def toggle_save_procedure(procedure_id: str, current_user: dict = Depends(get_current_user)):
    proc = await db.procedures.find_one({"id": procedure_id}, {"_id": 0, "title": 1, "image_url": 1, "country": 1, "subcategory": 1})
    if not proc:
        raise HTTPException(status_code=404, detail="Procedure introuvable")
    existing = await db.saved_procedures.find_one({"user_id": current_user["id"], "procedure_id": procedure_id})
    if existing:
        await db.saved_procedures.delete_one({"user_id": current_user["id"], "procedure_id": procedure_id})
        return {"action": "unsaved"}
    country_id = proc.get("country", proc.get("subcategory", ""))
    subcat = get_country_info(country_id)
    await db.saved_procedures.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "procedure_id": procedure_id,
        "title": proc.get("title", ""),
        "image_url": proc.get("image_url", ""),
        "subcategory_name": subcat.get("name", ""),
        "saved_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"action": "saved"}


@router.get("/saved-procedures/{procedure_id}/status")
async def get_saved_procedure_status(procedure_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.saved_procedures.find_one({"user_id": current_user["id"], "procedure_id": procedure_id})
    return {"is_saved": existing is not None}


@router.get("/saved-procedures")
async def get_saved_procedures(current_user: dict = Depends(get_current_user)):
    saved = await db.saved_procedures.find({"user_id": current_user["id"]}, {"_id": 0}).sort("saved_at", -1).to_list(100)
    return saved


@router.delete("/saved-procedures/{procedure_id}")
async def delete_saved_procedure(procedure_id: str, current_user: dict = Depends(get_current_user)):
    await db.saved_procedures.delete_one({"user_id": current_user["id"], "procedure_id": procedure_id})
    return {"ok": True}

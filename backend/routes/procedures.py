from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List
from database import db
from models.procedure import (
    ProcedureCreate, ProcedureUpdate, ProcedureOut,
    PaginatedProcedures, PROCEDURE_SUBCATEGORIES
)
from middleware.auth import require_admin
from utils import sanitize, sanitize_html, sanitize_url
import uuid
from datetime import datetime, timezone

router = APIRouter(tags=["procedures"])


def get_subcategory_info(subcat_id: str):
    for s in PROCEDURE_SUBCATEGORIES:
        if s["id"] == subcat_id:
            return s
    return {"id": subcat_id, "name": subcat_id, "flag": ""}


@router.get("/procedures/subcategories")
async def get_procedure_subcategories():
    return PROCEDURE_SUBCATEGORIES


@router.get("/procedures", response_model=PaginatedProcedures)
async def get_procedures(
    subcategory: str = Query("", max_length=50),
    search: str = Query("", max_length=100),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    query = {}
    if subcategory:
        query["subcategory"] = subcategory
    if search:
        query["title"] = {"$regex": search, "$options": "i"}

    total = await db.procedures.count_documents(query)
    pages = max(1, (total + limit - 1) // limit)
    skip = (page - 1) * limit

    procedures = await db.procedures.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    author_ids = list(set(p.get("author_id", "") for p in procedures if p.get("author_id")))
    authors = await db.users.find({"id": {"$in": author_ids}}, {"_id": 0, "id": 1, "username": 1}).to_list(100)
    authors_map = {u["id"]: u["username"] for u in authors}

    result = []
    for p in procedures:
        subcat = get_subcategory_info(p.get("subcategory", ""))
        result.append(ProcedureOut(
            id=p["id"], title=p["title"], subcategory=p["subcategory"],
            subcategory_name=subcat["name"], subcategory_flag=subcat["flag"],
            content=p.get("content", ""), image_url=p.get("image_url", ""),
            author_id=p.get("author_id", ""),
            author_username=authors_map.get(p.get("author_id", ""), ""),
            created_at=p.get("created_at", ""), updated_at=p.get("updated_at", ""),
            views=p.get("views", 0)
        ))

    return PaginatedProcedures(procedures=result, total=total, page=page, pages=pages)


@router.get("/procedures/{procedure_id}", response_model=ProcedureOut)
async def get_procedure(procedure_id: str):
    proc = await db.procedures.find_one({"id": procedure_id}, {"_id": 0})
    if not proc:
        raise HTTPException(status_code=404, detail="Procédure introuvable")

    await db.procedures.update_one({"id": procedure_id}, {"$inc": {"views": 1}})
    proc["views"] = proc.get("views", 0) + 1

    author = await db.users.find_one({"id": proc.get("author_id", "")}, {"_id": 0, "username": 1})
    proc["author_username"] = author["username"] if author else ""

    subcat = get_subcategory_info(proc.get("subcategory", ""))
    proc["subcategory_name"] = subcat["name"]
    proc["subcategory_flag"] = subcat["flag"]

    return proc


@router.post("/procedures", response_model=ProcedureOut)
async def create_procedure(data: ProcedureCreate, current_user: dict = Depends(require_admin)):
    procedure_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    proc = {
        "id": procedure_id,
        "title": sanitize(data.title),
        "subcategory": data.subcategory,
        "content": sanitize_html(data.content),
        "image_url": sanitize_url(data.image_url) or "",
        "author_id": current_user["id"],
        "created_at": now,
        "updated_at": now,
        "views": 0
    }
    await db.procedures.insert_one(proc)

    subcat = get_subcategory_info(data.subcategory)
    proc["subcategory_name"] = subcat["name"]
    proc["subcategory_flag"] = subcat["flag"]
    proc["author_username"] = current_user.get("username", "")
    if "_id" in proc:
        del proc["_id"]

    return proc


@router.put("/procedures/{procedure_id}", response_model=ProcedureOut)
async def update_procedure(procedure_id: str, data: ProcedureUpdate, current_user: dict = Depends(require_admin)):
    proc = await db.procedures.find_one({"id": procedure_id}, {"_id": 0})
    if not proc:
        raise HTTPException(status_code=404, detail="Procédure introuvable")

    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.title is not None:
        updates["title"] = sanitize(data.title)
    if data.subcategory is not None:
        updates["subcategory"] = data.subcategory
    if data.content is not None:
        updates["content"] = sanitize_html(data.content)
    if data.image_url is not None:
        updates["image_url"] = sanitize_url(data.image_url) or ""

    await db.procedures.update_one({"id": procedure_id}, {"$set": updates})
    proc.update(updates)
    subcat = get_subcategory_info(proc.get("subcategory", ""))
    proc["subcategory_name"] = subcat["name"]
    proc["subcategory_flag"] = subcat["flag"]
    author = await db.users.find_one({"id": proc.get("author_id", "")}, {"_id": 0, "username": 1})
    proc["author_username"] = author["username"] if author else ""

    return proc


@router.delete("/procedures/{procedure_id}")
async def delete_procedure(procedure_id: str, current_user: dict = Depends(require_admin)):
    proc = await db.procedures.find_one({"id": procedure_id}, {"_id": 0})
    if not proc:
        raise HTTPException(status_code=404, detail="Procédure introuvable")

    await db.procedures.delete_one({"id": procedure_id})
    return {"ok": True, "message": "Procédure supprimée"}

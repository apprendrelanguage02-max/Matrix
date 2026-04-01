from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from database import db
from models.fiche import FicheCreate, FicheUpdate, CompanySettings
from routes.auth import get_current_user
from services.pdf_generator import generate_fiche_pdf
import uuid
from datetime import datetime, timezone

router = APIRouter(tags=["fiches"])

COLLECTION = "procedure_fiches"
SETTINGS_COLLECTION = "company_settings"
SETTINGS_ID = "global"


def fiche_serial(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


# ─── CRUD Fiches ────────────────────────────────────────────────────────────────

@router.get("/fiches")
async def list_fiches(status: str = "", user=Depends(get_current_user)):
    query = {}
    if status:
        query["status"] = status
    fiches = await db[COLLECTION].find(query, {"_id": 0}).sort("updated_at", -1).to_list(200)
    return {"fiches": fiches, "total": len(fiches)}


@router.get("/fiches/{fiche_id}")
async def get_fiche(fiche_id: str, user=Depends(get_current_user)):
    doc = await db[COLLECTION].find_one({"id": fiche_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Fiche introuvable")
    return doc


@router.post("/fiches", status_code=201)
async def create_fiche(data: FicheCreate, user=Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "created_by": user["id"],
        "created_by_name": user.get("name", user.get("email", "")),
        "created_at": now,
        "updated_at": now,
    }
    for i, step in enumerate(doc.get("steps", [])):
        step["order"] = i
    await db[COLLECTION].insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/fiches/{fiche_id}")
async def update_fiche(fiche_id: str, data: FicheUpdate, user=Depends(get_current_user)):
    existing = await db[COLLECTION].find_one({"id": fiche_id})
    if not existing:
        raise HTTPException(404, "Fiche introuvable")
    updates = {}
    for field, value in data.model_dump(exclude_unset=True).items():
        updates[field] = value
    if "steps" in updates:
        for i, step in enumerate(updates["steps"]):
            step["order"] = i
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db[COLLECTION].update_one({"id": fiche_id}, {"$set": updates})
    updated = await db[COLLECTION].find_one({"id": fiche_id}, {"_id": 0})
    return updated


@router.delete("/fiches/{fiche_id}")
async def delete_fiche(fiche_id: str, user=Depends(get_current_user)):
    result = await db[COLLECTION].delete_one({"id": fiche_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Fiche introuvable")
    return {"ok": True}


# ─── Company Settings ───────────────────────────────────────────────────────────

@router.get("/company-settings")
async def get_company_settings(user=Depends(get_current_user)):
    doc = await db[SETTINGS_COLLECTION].find_one({"id": SETTINGS_ID}, {"_id": 0})
    if not doc:
        defaults = CompanySettings().model_dump()
        defaults["id"] = SETTINGS_ID
        await db[SETTINGS_COLLECTION].insert_one(defaults)
        defaults.pop("_id", None)
        return defaults
    return doc


@router.put("/company-settings")
async def update_company_settings(data: CompanySettings, user=Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = SETTINGS_ID
    await db[SETTINGS_COLLECTION].update_one(
        {"id": SETTINGS_ID}, {"$set": doc}, upsert=True
    )
    updated = await db[SETTINGS_COLLECTION].find_one({"id": SETTINGS_ID}, {"_id": 0})
    return updated


# ─── PDF Generation ──────────────────────────────────────────────────────────

@router.post("/fiches/{fiche_id}/pdf")
async def download_fiche_pdf(fiche_id: str, user=Depends(get_current_user)):
    fiche = await db[COLLECTION].find_one({"id": fiche_id}, {"_id": 0})
    if not fiche:
        raise HTTPException(404, "Fiche introuvable")
    settings_doc = await db[SETTINGS_COLLECTION].find_one({"id": SETTINGS_ID}, {"_id": 0})
    if not settings_doc:
        settings_doc = CompanySettings().model_dump()
    pdf_bytes = generate_fiche_pdf(fiche, settings_doc)
    safe_title = fiche.get("title", "fiche").replace(" ", "_")[:50]
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="fiche_{safe_title}.pdf"'}
    )


@router.post("/fiches/preview-pdf")
async def preview_fiche_pdf(data: FicheCreate, user=Depends(get_current_user)):
    """Generate PDF from form data without saving (for preview/download before save)."""
    settings_doc = await db[SETTINGS_COLLECTION].find_one({"id": SETTINGS_ID}, {"_id": 0})
    if not settings_doc:
        settings_doc = CompanySettings().model_dump()
    fiche = data.model_dump()
    pdf_bytes = generate_fiche_pdf(fiche, settings_doc)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="apercu_fiche.pdf"'}
    )

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List
from database import db
from models.payment import PaymentCreate, PaymentOut, generate_reference, PAYMENT_STATUSES
from middleware.auth import get_current_user, require_author
from utils import sanitize
import uuid
from datetime import datetime, timezone

router = APIRouter(tags=["payments"])


@router.post("/payments", response_model=PaymentOut)
async def create_payment(data: PaymentCreate, current_user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": data.property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Propriété introuvable")
    if prop.get("status") != "disponible":
        raise HTTPException(status_code=400, detail="Cette propriété n'est plus disponible")

    payment_id = str(uuid.uuid4())
    reference = generate_reference()
    now = datetime.now(timezone.utc).isoformat()
    payment = {
        "id": payment_id,
        "reference": reference,
        "property_id": data.property_id,
        "property_title": prop.get("title", ""),
        "user_id": current_user["id"],
        "user_email": current_user.get("email", ""),
        "amount": data.amount,
        "currency": data.currency,
        "method": data.method,
        "phone": sanitize(data.phone),
        "status": "en_attente",
        "created_at": now,
    }
    await db.payments.insert_one(payment)
    await db.properties.update_one({"id": data.property_id}, {"$set": {"status": "reserve"}})
    del payment["_id"]
    return payment


@router.get("/payments/my", response_model=List[PaymentOut])
async def get_my_payments(current_user: dict = Depends(get_current_user)):
    payments = await db.payments.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return payments


@router.get("/payments", response_model=List[PaymentOut])
async def get_all_payments(current_user: dict = Depends(require_author)):
    payments = await db.payments.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return payments


@router.put("/payments/{payment_id}/status")
async def update_payment_status(payment_id: str, status: str = Query(...), current_user: dict = Depends(require_author)):
    if status not in PAYMENT_STATUSES:
        raise HTTPException(status_code=400, detail="Statut invalide")
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement introuvable")

    await db.payments.update_one({"id": payment_id}, {"$set": {"status": status}})

    if status == "annule":
        await db.properties.update_one({"id": payment["property_id"]}, {"$set": {"status": "disponible"}})
    elif status == "confirme":
        prop = await db.properties.find_one({"id": payment["property_id"]}, {"_id": 0})
        if prop:
            new_status = "loue" if prop.get("type") == "location" else "vendu"
            await db.properties.update_one({"id": payment["property_id"]}, {"$set": {"status": new_status}})

    return {"ok": True}

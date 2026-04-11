from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import Response
from typing import List
from pydantic import BaseModel
from database import db
from models.user import PaginatedUsers, user_to_admin_out
from models.notification import AdminNotification, PaginatedNotifications, RoleRequestAction
from models.property import PROPERTY_STATUSES
from middleware.auth import get_current_user, require_admin
from routes.messages import manager
import uuid
from datetime import datetime, timezone

router = APIRouter(tags=["admin"])


# ─── Admin-only models ─────────────────────────────────────────────────────────

class ArticleAdminOut(BaseModel):
    id: str
    title: str
    category: str
    author_id: str
    author_username: str
    published_at: str = ""
    views: int
    status: str = "publie"

class PaginatedArticlesAdmin(BaseModel):
    articles: List[ArticleAdminOut]
    total: int
    page: int
    pages: int

class PropertyAdminOut(BaseModel):
    id: str
    title: str
    type: str
    price: float
    currency: str
    city: str
    author_id: str
    author_username: str
    status: str
    created_at: str

class PaginatedPropertiesAdmin(BaseModel):
    properties: List[PropertyAdminOut]
    total: int
    page: int
    pages: int

class PaymentAdminOut(BaseModel):
    id: str
    reference: str
    property_id: str
    property_title: str
    user_id: str
    user_email: str
    amount: float
    currency: str
    method: str
    phone: str
    status: str
    created_at: str

class PaginatedPaymentsAdmin(BaseModel):
    payments: List[PaymentAdminOut]
    total: int
    page: int
    pages: int


# ─── Public: Admin Contact Info ────────────────────────────────────────────────

@router.get("/contact")
async def get_admin_contact():
    """Return the current admin's ID and username (public endpoint for procedures chat)."""
    admin = await db.users.find_one({"role": "admin"}, {"_id": 0, "id": 1, "username": 1})
    if not admin:
        raise HTTPException(status_code=404, detail="Admin introuvable")
    return {"id": admin["id"], "username": admin["username"]}


# ─── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_admin_stats(current_user: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({})
    total_articles = await db.articles.count_documents({})
    total_properties = await db.properties.count_documents({})
    total_payments = await db.payments.count_documents({})
    verified_users = await db.users.count_documents({"email_verified": True})
    unverified_users = await db.users.count_documents({"$or": [{"email_verified": False}, {"email_verified": {"$exists": False}}]})
    pending_verification = await db.users.count_documents({"status": "pending_verification"})
    active_users = await db.users.count_documents({"status": {"$in": ["active", "actif"]}})
    suspended_users = await db.users.count_documents({"status": {"$in": ["suspended", "suspendu", "bloque"]}})
    return {
        "total_users": total_users, "total_articles": total_articles,
        "total_properties": total_properties, "total_payments": total_payments,
        "verified_users": verified_users, "unverified_users": unverified_users,
        "pending_verification": pending_verification, "active_users": active_users,
        "suspended_users": suspended_users,
    }


# ─── Users Management ──────────────────────────────────────────────────────────

@router.get("/users", response_model=PaginatedUsers)
async def get_admin_users(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100), role: str = Query("", max_length=20),
    verification: str = Query("", max_length=20),
    current_user: dict = Depends(require_admin)
):
    query = {}
    if search:
        query["$or"] = [
            {"username": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"full_name": {"$regex": search, "$options": "i"}},
        ]
    if role:
        query["role"] = role
    if verification == "verified":
        query["email_verified"] = True
    elif verification == "unverified":
        query["$or"] = query.get("$or") or []
        # Handle the case where $or is already used for search
        if search:
            query["$and"] = [
                {"$or": query.pop("$or")},
                {"$or": [{"email_verified": False}, {"email_verified": {"$exists": False}}]}
            ]
        else:
            query["$or"] = [{"email_verified": False}, {"email_verified": {"$exists": False}}]
    elif verification == "pending":
        query["status"] = "pending_verification"

    total = await db.users.count_documents(query)
    pages = max(1, (total + limit - 1) // limit)
    skip = (page - 1) * limit
    users = await db.users.find(query, {"_id": 0, "hashed_password": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return PaginatedUsers(users=[user_to_admin_out(u) for u in users], total=total, page=page, pages=pages)


@router.get("/users/{user_id}")
async def get_admin_user_detail(user_id: str, current_user: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return user


@router.put("/users/{user_id}/status")
async def update_user_status(user_id: str, status: str = Query(...), current_user: dict = Depends(require_admin)):
    if status not in ("actif", "active", "suspendu", "suspended", "pending_verification"):
        raise HTTPException(status_code=400, detail="Statut invalide")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier votre propre statut")
    await db.users.update_one({"id": user_id}, {"$set": {"status": status}})
    return {"ok": True, "message": f"Utilisateur {'suspendu' if status == 'suspendu' else 'activé'} avec succès"}


@router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str = Query(...), current_user: dict = Depends(require_admin)):
    if role not in ("visiteur", "auteur", "agent", "admin"):
        raise HTTPException(status_code=400, detail="Rôle invalide")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier votre propre rôle")
    await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    return {"ok": True, "message": f"Rôle mis à jour vers '{role}'"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
    await db.users.delete_one({"id": user_id})
    await db.articles.delete_many({"author_id": user_id})
    await db.properties.delete_many({"author_id": user_id})
    await db.saved_articles.delete_many({"user_id": user_id})
    await db.payments.delete_many({"user_id": user_id})
    return {"ok": True, "message": "Utilisateur et données associées supprimés"}


# ─── Articles Management ───────────────────────────────────────────────────────

@router.get("/articles", response_model=PaginatedArticlesAdmin)
async def get_admin_articles(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100), category: str = Query("", max_length=50),
    current_user: dict = Depends(require_admin)
):
    query = {}
    if search:
        query["title"] = {"$regex": search, "$options": "i"}
    if category:
        query["category"] = category

    total = await db.articles.count_documents(query)
    pages = max(1, (total + limit - 1) // limit)
    skip = (page - 1) * limit
    articles = await db.articles.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    author_ids = list(set(a.get("author_id", "") for a in articles if a.get("author_id")))
    authors = await db.users.find({"id": {"$in": author_ids}}, {"_id": 0, "id": 1, "username": 1}).to_list(100)
    authors_map = {u["id"]: u["username"] for u in authors}

    result = []
    for a in articles:
        result.append(ArticleAdminOut(
            id=a["id"], title=a["title"], category=a.get("category", "Actualité"),
            author_id=a.get("author_id", ""),
            author_username=authors_map.get(a.get("author_id", ""), ""),
            published_at=a.get("published_at") or a.get("created_at") or "",
            views=a.get("views", 0), status=a.get("status", "publie")
        ))
    return PaginatedArticlesAdmin(articles=result, total=total, page=page, pages=pages)


@router.delete("/articles/{article_id}")
async def admin_delete_article(article_id: str, current_user: dict = Depends(require_admin)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article introuvable")
    await db.articles.delete_one({"id": article_id})
    await db.saved_articles.delete_many({"article_id": article_id})
    return {"ok": True, "message": "Article supprimé"}


# ─── Properties Management ─────────────────────────────────────────────────────

@router.get("/properties", response_model=PaginatedPropertiesAdmin)
async def get_admin_properties(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100), type: str = Query("", max_length=20),
    city: str = Query("", max_length=50), status: str = Query("", max_length=20),
    current_user: dict = Depends(require_admin)
):
    query = {}
    if search:
        query["title"] = {"$regex": search, "$options": "i"}
    if type:
        query["type"] = type
    if city:
        query["city"] = city
    if status:
        query["status"] = status

    total = await db.properties.count_documents(query)
    pages = max(1, (total + limit - 1) // limit)
    skip = (page - 1) * limit
    props = await db.properties.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    author_ids = list(set(p.get("author_id", "") for p in props if p.get("author_id")))
    authors = await db.users.find({"id": {"$in": author_ids}}, {"_id": 0, "id": 1, "username": 1}).to_list(100)
    authors_map = {u["id"]: u["username"] for u in authors}

    result = []
    for p in props:
        result.append(PropertyAdminOut(
            id=p["id"], title=p["title"], type=p["type"], price=p["price"],
            currency=p.get("currency", "GNF"), city=p.get("city", ""),
            author_id=p.get("author_id", ""),
            author_username=authors_map.get(p.get("author_id", ""), ""),
            status=p.get("status", "disponible"), created_at=p.get("created_at", "")
        ))
    return PaginatedPropertiesAdmin(properties=result, total=total, page=page, pages=pages)


@router.put("/properties/{property_id}/status")
async def admin_update_property_status(property_id: str, status: str = Query(...), current_user: dict = Depends(require_admin)):
    if status not in PROPERTY_STATUSES + ["loue"]:
        raise HTTPException(status_code=400, detail="Statut invalide")
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Annonce introuvable")
    await db.properties.update_one({"id": property_id}, {"$set": {"status": status}})
    return {"ok": True, "message": f"Statut mis à jour vers '{status}'"}


@router.delete("/properties/{property_id}")
async def admin_delete_property(property_id: str, current_user: dict = Depends(require_admin)):
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Annonce introuvable")
    await db.properties.delete_one({"id": property_id})
    await db.payments.delete_many({"property_id": property_id})
    return {"ok": True, "message": "Annonce supprimée"}


# ─── Payments Management ───────────────────────────────────────────────────────

@router.get("/payments", response_model=PaginatedPaymentsAdmin)
async def get_admin_payments(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    status: str = Query("", max_length=20), method: str = Query("", max_length=30),
    current_user: dict = Depends(require_admin)
):
    query = {}
    if status:
        query["status"] = status
    if method:
        query["method"] = method

    total = await db.payments.count_documents(query)
    pages = max(1, (total + limit - 1) // limit)
    skip = (page - 1) * limit
    payments = await db.payments.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return PaginatedPaymentsAdmin(payments=[PaymentAdminOut(**p) for p in payments], total=total, page=page, pages=pages)


@router.delete("/payments/{payment_id}")
async def admin_delete_payment(payment_id: str, current_user: dict = Depends(require_admin)):
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement introuvable")
    if payment.get("status") == "en_attente":
        await db.properties.update_one({"id": payment["property_id"]}, {"$set": {"status": "disponible"}})
    await db.payments.delete_one({"id": payment_id})
    return {"ok": True, "message": "Paiement supprimé"}


# ─── Export CSV ────────────────────────────────────────────────────────────────

@router.get("/export/users")
async def export_users_csv(current_user: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "hashed_password": 0}).to_list(10000)
    csv_lines = ["id,username,email,role,phone,country,status,created_at"]
    for u in users:
        csv_lines.append(f'"{u.get("id", "")}","{u.get("username", "")}","{u.get("email", "")}","{u.get("role", "")}","{u.get("phone", "")}","{u.get("country", "")}","{u.get("status", "actif")}","{u.get("created_at", "")}"')
    return Response(content="\n".join(csv_lines), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=utilisateurs.csv"})


@router.get("/export/articles")
async def export_articles_csv(current_user: dict = Depends(require_admin)):
    articles = await db.articles.find({}, {"_id": 0, "content": 0}).to_list(10000)
    csv_lines = ["id,title,category,author_id,published_at,views"]
    for a in articles:
        title = a.get("title", "").replace('"', '""')
        csv_lines.append(f'"{a.get("id", "")}","{title}","{a.get("category", "")}","{a.get("author_id", "")}","{a.get("published_at", "")}",{a.get("views", 0)}')
    return Response(content="\n".join(csv_lines), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=articles.csv"})


@router.get("/export/properties")
async def export_properties_csv(current_user: dict = Depends(require_admin)):
    props = await db.properties.find({}, {"_id": 0, "description": 0, "images": 0}).to_list(10000)
    csv_lines = ["id,title,type,price,currency,city,status,author_id,created_at"]
    for p in props:
        title = p.get("title", "").replace('"', '""')
        csv_lines.append(f'"{p.get("id", "")}","{title}","{p.get("type", "")}",{p.get("price", 0)},"{p.get("currency", "GNF")}","{p.get("city", "")}","{p.get("status", "")}","{p.get("author_id", "")}","{p.get("created_at", "")}"')
    return Response(content="\n".join(csv_lines), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=annonces.csv"})


@router.get("/export/payments")
async def export_payments_csv(current_user: dict = Depends(require_admin)):
    payments = await db.payments.find({}, {"_id": 0}).to_list(10000)
    csv_lines = ["id,reference,property_title,user_email,amount,currency,method,status,created_at"]
    for p in payments:
        title = p.get("property_title", "").replace('"', '""')
        csv_lines.append(f'"{p.get("id", "")}","{p.get("reference", "")}","{title}","{p.get("user_email", "")}",{p.get("amount", 0)},"{p.get("currency", "GNF")}","{p.get("method", "")}","{p.get("status", "")}","{p.get("created_at", "")}"')
    return Response(content="\n".join(csv_lines), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=paiements.csv"})


@router.get("/export/role-requests")
async def export_role_requests_csv(current_user: dict = Depends(require_admin)):
    notifs = await db.admin_notifications.find({}, {"_id": 0}).to_list(10000)
    csv_lines = ["id,user_username,user_email,requested_role,status,created_at,processed_at"]
    for n in notifs:
        csv_lines.append(f'"{n.get("id", "")}","{n.get("user_username", "")}","{n.get("user_email", "")}","{n.get("requested_role", "")}","{n.get("status", "")}","{n.get("created_at", "")}","{n.get("processed_at", "")}"')
    return Response(content="\n".join(csv_lines), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=demandes_roles.csv"})


# ─── Notifications & Role Approval ─────────────────────────────────────────────

@router.get("/notifications/count")
async def get_notification_count(current_user: dict = Depends(require_admin)):
    unseen_pending = await db.admin_notifications.count_documents({"status": "pending", "seen": {"$ne": True}})
    return {"pending_count": unseen_pending}


@router.get("/notifications", response_model=PaginatedNotifications)
async def get_admin_notifications(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    status: str = Query("", max_length=20),
    current_user: dict = Depends(require_admin)
):
    query = {}
    if status:
        query["status"] = status
    total = await db.admin_notifications.count_documents(query)
    pending_count = await db.admin_notifications.count_documents({"status": "pending"})
    pages = max(1, (total + limit - 1) // limit)
    skip = (page - 1) * limit
    notifications = await db.admin_notifications.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return PaginatedNotifications(
        notifications=[AdminNotification(**n) for n in notifications],
        total=total, pending_count=pending_count, page=page, pages=pages
    )


@router.put("/notifications/{notification_id}/action")
async def process_role_request(notification_id: str, data: RoleRequestAction, current_user: dict = Depends(require_admin)):
    if data.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Action invalide")

    notification = await db.admin_notifications.find_one({"id": notification_id}, {"_id": 0})
    if not notification:
        raise HTTPException(status_code=404, detail="Notification introuvable")
    if notification["status"] != "pending":
        raise HTTPException(status_code=400, detail="Cette demande a déjà été traitée")

    now = datetime.now(timezone.utc).isoformat()
    user = await db.users.find_one({"id": notification["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    if data.action == "approve":
        await db.users.update_one(
            {"id": notification["user_id"]},
            {"$set": {"role": notification["requested_role"], "status": "actif", "requested_role": None}}
        )
        await db.admin_notifications.update_one({"id": notification_id}, {"$set": {"status": "approved", "processed_at": now}})
        role_label = "Auteur" if notification["requested_role"] == "auteur" else "Agent immobilier"
        await db.user_notifications.insert_one({
            "id": str(uuid.uuid4()), "user_id": notification["user_id"],
            "type": "role_approved",
            "message": f"Votre demande de rôle {role_label} a été approuvée par le groupe MatrixNews. Vous avez maintenant accès à toutes les fonctionnalités.",
            "is_read": False, "created_at": now
        })
        # Real-time: push role_update to the user via WebSocket
        await manager.send_to_user(notification["user_id"], {
            "type": "role_update",
            "action": "approved",
            "role": notification["requested_role"],
            "status": "actif",
            "message": f"Votre demande de rôle {role_label} a été approuvée !",
        })
        return {"ok": True, "message": f"Rôle {role_label} approuvé pour {notification['user_username']}"}
    else:
        await db.users.update_one(
            {"id": notification["user_id"]},
            {"$set": {"status": "rejected", "requested_role": None}}
        )
        await db.admin_notifications.update_one({"id": notification_id}, {"$set": {"status": "rejected", "processed_at": now}})
        await db.user_notifications.insert_one({
            "id": str(uuid.uuid4()), "user_id": notification["user_id"],
            "type": "role_rejected",
            "message": "Votre demande de rôle professionnel a été refusée par le groupe MatrixNews. Votre accès a été suspendu.",
            "is_read": False, "created_at": now
        })
        # Real-time: push role_update to the user via WebSocket → triggers immediate logout
        await manager.send_to_user(notification["user_id"], {
            "type": "role_update",
            "action": "rejected",
            "status": "rejected",
            "message": "Votre demande a été refusée. Votre accès a été suspendu.",
        })
        return {"ok": True, "message": f"Demande rejetée pour {notification['user_username']}"}


@router.put("/notifications/mark-seen")
async def admin_mark_notifications_seen(current_user: dict = Depends(require_admin)):
    await db.admin_notifications.update_many({"seen": {"$ne": True}}, {"$set": {"seen": True}})
    return {"ok": True}


@router.delete("/notifications/{notification_id}")
async def delete_role_request(notification_id: str, current_user: dict = Depends(require_admin)):
    """Delete a role request from the list."""
    notif = await db.admin_notifications.find_one({"id": notification_id}, {"_id": 0, "id": 1})
    if not notif:
        raise HTTPException(status_code=404, detail="Demande introuvable")
    await db.admin_notifications.delete_one({"id": notification_id})
    return {"ok": True, "message": "Demande supprimée"}


# ─── Price Per m² Management ────────────────────────────────────────────────────

@router.get("/price-references")
async def get_all_price_references(current_user: dict = Depends(require_admin)):
    refs = await db.price_references.find({}, {"_id": 0}).sort("city", 1).to_list(500)
    return refs


@router.post("/price-references")
async def set_price_reference(data: dict, current_user: dict = Depends(require_admin)):
    city = data.get("city", "")
    commune = data.get("commune", "")
    quartier = data.get("quartier", "")
    price_per_sqm = data.get("price_per_sqm", 0)
    if not city or price_per_sqm <= 0:
        raise HTTPException(status_code=400, detail="Ville et prix au m2 requis")
    # Upsert
    key = {"city": city, "commune": commune, "quartier": quartier}
    from datetime import datetime, timezone
    await db.price_references.update_one(key, {"$set": {
        **key,
        "price_per_sqm": float(price_per_sqm),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user["id"],
    }}, upsert=True)
    return {"ok": True}


@router.delete("/price-references")
async def delete_price_reference(city: str = Query(""), commune: str = Query(""), quartier: str = Query(""), current_user: dict = Depends(require_admin)):
    key = {"city": city}
    if commune:
        key["commune"] = commune
    if quartier:
        key["quartier"] = quartier
    await db.price_references.delete_one(key)
    return {"ok": True}

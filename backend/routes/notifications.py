from fastapi import APIRouter, Depends
from database import db
from middleware.auth import get_current_user

router = APIRouter(tags=["notifications"])


@router.get("/my-notifications")
async def get_my_notifications(current_user: dict = Depends(get_current_user)):
    notifs = await db.user_notifications.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    unread = sum(1 for n in notifs if not n.get("is_read"))
    return {"notifications": notifs, "unread_count": unread}


@router.put("/my-notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    await db.user_notifications.update_many(
        {"user_id": current_user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"ok": True}

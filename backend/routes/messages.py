from fastapi import APIRouter, HTTPException, Depends, Query, WebSocket, WebSocketDisconnect
from typing import Dict, List
from database import db
from models.message import MessageCreate, MessageOut, ConversationOut
from middleware.auth import get_current_user
from config import JWT_SECRET, JWT_ALGORITHM
import jwt
import uuid
from datetime import datetime, timezone

router = APIRouter(tags=["messages"])


# ─── WebSocket Connection Manager ──────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(user_id, []).append(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        if user_id in self.active:
            self.active[user_id] = [w for w in self.active[user_id] if w != ws]
            if not self.active[user_id]:
                del self.active[user_id]

    async def send_to_user(self, user_id: str, data: dict):
        if user_id in self.active:
            dead = []
            for ws in self.active[user_id]:
                try:
                    await ws.send_json(data)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                if ws in self.active.get(user_id, []):
                    self.active[user_id].remove(ws)

    def is_online(self, user_id: str) -> bool:
        return user_id in self.active and len(self.active[user_id]) > 0


manager = ConnectionManager()


async def _broadcast_status(user_id: str, online: bool):
    """Broadcast online/offline status to all conversation partners."""
    convs = await db.conversations.find({"participant_ids": user_id}, {"_id": 0, "participant_ids": 1}).to_list(200)
    notified = set()
    for c in convs:
        for pid in c["participant_ids"]:
            if pid != user_id and pid not in notified:
                notified.add(pid)
                await manager.send_to_user(pid, {
                    "type": "status",
                    "user_id": user_id,
                    "online": online,
                })


async def _send_unread_update(user_id: str):
    """Send updated unread counts to a user."""
    convs = await db.conversations.find({"participant_ids": user_id}, {"_id": 0, "id": 1, "type": 1}).to_list(500)
    immo_ids = [c["id"] for c in convs if c.get("type") == "immobilier"]
    proc_ids = [c["id"] for c in convs if c.get("type") == "procedures"]

    immo_unread = 0
    proc_unread = 0
    if immo_ids:
        immo_unread = await db.messages.count_documents({
            "conversation_id": {"$in": immo_ids},
            "sender_id": {"$ne": user_id},
            "read_by": {"$nin": [user_id]}
        })
    if proc_ids:
        proc_unread = await db.messages.count_documents({
            "conversation_id": {"$in": proc_ids},
            "sender_id": {"$ne": user_id},
            "read_by": {"$nin": [user_id]}
        })

    await manager.send_to_user(user_id, {
        "type": "unread_update",
        "immobilier": immo_unread,
        "procedures": proc_unread,
        "total": immo_unread + proc_unread,
    })


# ─── WebSocket Endpoint ────────────────────────────────────────────────────────

@router.websocket("/ws/chat")
async def websocket_chat(ws: WebSocket):
    token = ws.query_params.get("token")
    if not token:
        await ws.close(code=4001, reason="Token manquant")
        return

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            await ws.close(code=4001, reason="Utilisateur invalide")
            return
    except jwt.InvalidTokenError:
        await ws.close(code=4001, reason="Token invalide")
        return

    await manager.connect(user_id, ws)
    # Broadcast online status
    await _broadcast_status(user_id, True)
    # Send initial unread counts
    await _send_unread_update(user_id)

    try:
        while True:
            data = await ws.receive_json()

            if data.get("type") == "message":
                conv_id = data.get("conversation_id")
                content = data.get("content", "").strip()
                if not conv_id or not content:
                    continue

                conv = await db.conversations.find_one({"id": conv_id}, {"_id": 0})
                if not conv or user_id not in conv.get("participant_ids", []):
                    continue

                msg_id = str(uuid.uuid4())
                now = datetime.now(timezone.utc).isoformat()
                msg = {
                    "id": msg_id,
                    "conversation_id": conv_id,
                    "sender_id": user_id,
                    "sender_name": user["username"],
                    "content": content,
                    "read_by": [user_id],
                    "created_at": now,
                }
                await db.messages.insert_one(msg)
                await db.conversations.update_one(
                    {"id": conv_id},
                    {"$set": {"last_message": content, "last_message_at": now}}
                )

                msg_out = {
                    "type": "new_message",
                    "message": {
                        "id": msg_id, "conversation_id": conv_id,
                        "sender_id": user_id, "sender_name": user["username"],
                        "content": content, "created_at": now,
                    }
                }
                for pid in conv["participant_ids"]:
                    await manager.send_to_user(pid, msg_out)
                    # Send unread update to recipients
                    if pid != user_id:
                        await _send_unread_update(pid)

            elif data.get("type") == "typing_start":
                conv_id = data.get("conversation_id")
                conv = await db.conversations.find_one({"id": conv_id}, {"_id": 0})
                if conv:
                    for pid in conv["participant_ids"]:
                        if pid != user_id:
                            await manager.send_to_user(pid, {
                                "type": "typing_start",
                                "conversation_id": conv_id,
                                "user_id": user_id,
                                "username": user["username"],
                            })

            elif data.get("type") == "typing_stop":
                conv_id = data.get("conversation_id")
                conv = await db.conversations.find_one({"id": conv_id}, {"_id": 0})
                if conv:
                    for pid in conv["participant_ids"]:
                        if pid != user_id:
                            await manager.send_to_user(pid, {
                                "type": "typing_stop",
                                "conversation_id": conv_id,
                                "user_id": user_id,
                            })

            elif data.get("type") == "mark_read":
                conv_id = data.get("conversation_id")
                if conv_id:
                    await db.messages.update_many(
                        {"conversation_id": conv_id, "sender_id": {"$ne": user_id}, "read_by": {"$nin": [user_id]}},
                        {"$addToSet": {"read_by": user_id}}
                    )
                    await _send_unread_update(user_id)

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user_id, ws)
        # Broadcast offline if no more connections
        if not manager.is_online(user_id):
            await _broadcast_status(user_id, False)


# ─── REST Endpoints ────────────────────────────────────────────────────────────

@router.get("/conversations")
async def get_conversations(
    type: str = Query("", max_length=20),
    current_user: dict = Depends(get_current_user)
):
    query = {"participant_ids": current_user["id"]}
    if type:
        query["type"] = type
    convs = await db.conversations.find(query, {"_id": 0}).sort("last_message_at", -1).to_list(100)

    result = []
    for c in convs:
        unread = await db.messages.count_documents({
            "conversation_id": c["id"],
            "sender_id": {"$ne": current_user["id"]},
            "read_by": {"$nin": [current_user["id"]]}
        })
        result.append(ConversationOut(
            id=c["id"], type=c.get("type", ""),
            property_id=c.get("property_id"), property_title=c.get("property_title"),
            property_image=c.get("property_image"),
            participant_ids=c.get("participant_ids", []),
            participant_names=c.get("participant_names", []),
            last_message=c.get("last_message"),
            last_message_at=c.get("last_message_at", c["created_at"]),
            unread_count=unread, created_at=c["created_at"]
        ))
    return result


@router.get("/conversations/unread-count")
async def get_unread_count(
    type: str = Query("", max_length=20),
    current_user: dict = Depends(get_current_user)
):
    query = {"participant_ids": current_user["id"]}
    if type:
        query["type"] = type
    convs = await db.conversations.find(query, {"_id": 0, "id": 1}).to_list(500)
    conv_ids = [c["id"] for c in convs]
    if not conv_ids:
        return {"unread_count": 0}

    unread = await db.messages.count_documents({
        "conversation_id": {"$in": conv_ids},
        "sender_id": {"$ne": current_user["id"]},
        "read_by": {"$nin": [current_user["id"]]}
    })
    return {"unread_count": unread}


@router.post("/conversations")
async def create_or_get_conversation(
    recipient_id: str = Query(...),
    type: str = Query(...),
    property_id: str = Query(""),
    current_user: dict = Depends(get_current_user)
):
    if current_user["id"] == recipient_id:
        raise HTTPException(status_code=400, detail="Impossible")

    recipient = await db.users.find_one({"id": recipient_id}, {"_id": 0})
    if not recipient:
        raise HTTPException(status_code=404, detail="Destinataire introuvable")

    search_query = {
        "participant_ids": {"$all": [current_user["id"], recipient_id]},
        "type": type,
    }
    if property_id:
        search_query["property_id"] = property_id

    existing = await db.conversations.find_one(search_query, {"_id": 0})
    if existing:
        return existing

    now = datetime.now(timezone.utc).isoformat()
    prop_title = ""
    prop_image = ""
    if property_id:
        prop = await db.properties.find_one({"id": property_id}, {"_id": 0, "title": 1, "images": 1})
        if prop:
            prop_title = prop.get("title", "")
            images = prop.get("images", [])
            prop_image = images[0] if images else ""

    conv = {
        "id": str(uuid.uuid4()),
        "type": type,
        "property_id": property_id or None,
        "property_title": prop_title,
        "property_image": prop_image,
        "participant_ids": [current_user["id"], recipient_id],
        "participant_names": [current_user["username"], recipient["username"]],
        "last_message": None,
        "last_message_at": now,
        "created_at": now,
    }
    await db.conversations.insert_one(conv)
    del conv["_id"]
    return conv


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    conv = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conv or current_user["id"] not in conv.get("participant_ids", []):
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    skip = (page - 1) * limit
    messages = await db.messages.find(
        {"conversation_id": conversation_id}, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    # Mark messages as read
    await db.messages.update_many(
        {
            "conversation_id": conversation_id,
            "sender_id": {"$ne": current_user["id"]},
            "read_by": {"$nin": [current_user["id"]]}
        },
        {"$addToSet": {"read_by": current_user["id"]}}
    )

    messages.reverse()
    return {"messages": messages, "conversation": conv}


@router.get("/users/{user_id}/online")
async def check_user_online(user_id: str):
    is_online = manager.is_online(user_id)
    if not is_online:
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "last_seen": 1})
        last_seen = user.get("last_seen") if user else None
        return {"online": False, "last_seen": last_seen}
    return {"online": True, "last_seen": None}

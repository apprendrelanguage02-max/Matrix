from pydantic import BaseModel
from typing import Optional, List


class AdminNotification(BaseModel):
    id: str
    type: str = "role_request"
    user_id: str
    user_username: str
    user_email: str
    requested_role: str
    message: str = ""
    status: str = "pending"
    seen: bool = False
    created_at: Optional[str] = None
    processed_at: Optional[str] = None

class PaginatedNotifications(BaseModel):
    notifications: List[AdminNotification]
    total: int
    pending_count: int
    page: int
    pages: int

class RoleRequestAction(BaseModel):
    action: str

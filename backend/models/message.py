from pydantic import BaseModel, Field
from typing import Optional, List


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)

class MessageOut(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender_name: str
    content: str
    created_at: str

class ConversationOut(BaseModel):
    id: str
    type: str  # "immobilier" or "procedures"
    property_id: Optional[str] = None
    property_title: Optional[str] = None
    property_image: Optional[str] = None
    participant_ids: List[str]
    participant_names: List[str]
    last_message: Optional[str] = None
    last_message_at: Optional[str] = None
    unread_count: int = 0
    created_at: str

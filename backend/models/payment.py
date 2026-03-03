from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime, timezone
import random
import string

PAYMENT_METHODS = ["orange_money", "mobile_money", "paycard", "carte_bancaire"]
PAYMENT_STATUSES = ["en_attente", "confirme", "annule"]


def generate_reference() -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M")
    chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"GIMO-{ts}-{chars}"


class PaymentCreate(BaseModel):
    property_id: str
    amount: float = Field(gt=0)
    currency: str = "GNF"
    method: str
    phone: str = ""

    @field_validator('method')
    @classmethod
    def validate_method(cls, v):
        if v not in PAYMENT_METHODS:
            raise ValueError(f'Méthode invalide: {PAYMENT_METHODS}')
        return v


class PaymentOut(BaseModel):
    id: str
    reference: str
    property_id: str
    property_title: str
    user_id: str
    user_email: str
    amount: float
    currency: str
    method: str
    status: str
    phone: str
    created_at: str

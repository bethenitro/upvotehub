from pydantic import BaseModel, Field, constr
from typing import Optional, Dict, Any, Literal
from datetime import datetime
from bson import ObjectId
from .user import PyObjectId

class PaymentBase(BaseModel):
    amount: float
    method: Literal["credit_card", "paypal", "crypto", "credits"]
    status: Literal["pending", "completed", "failed", "refunded"] = "pending"
    order_id: Optional[str] = None

class PaymentCreate(PaymentBase):
    payment_details: Dict[str, Any]

class CreditCardDetails(BaseModel):
    last4: str
    brand: str
    expiry_month: int
    expiry_year: int

class PayPalDetails(BaseModel):
    email: str
    payer_id: str

class CryptoDetails(BaseModel):
    currency: str
    address: str
    amount: float

class PaymentInDB(PaymentBase):
    id: str
    user_id: str
    created_at: datetime = datetime.utcnow()
    completed_at: Optional[datetime] = None
    refund_amount: Optional[float] = None
    refund_reason: Optional[str] = None
    error_message: Optional[str] = None
    payment_details: Dict[str, Any]

class Payment(PaymentBase):
    id: str
    user_id: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    refund_amount: Optional[float] = None
    refund_reason: Optional[str] = None
    error_message: Optional[str] = None
    payment_details: Dict[str, Any]

    class Config:
        from_attributes = True

class PaymentMethod(BaseModel):
    id: str
    user_id: str
    type: Literal["credit_card", "paypal", "crypto"]
    is_default: bool = False
    last_used: Optional[datetime] = None
    details: Dict[str, Any]

    class Config:
        from_attributes = True 
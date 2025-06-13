from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, Literal
from datetime import datetime
from bson import ObjectId
from .user import PyObjectId

class OrderBase(BaseModel):
    reddit_url: HttpUrl
    upvotes: int
    upvotes_per_minute: Optional[int] = Field(default=1, ge=1, le=10)
    type: Literal["one-time"] = "one-time"

class OrderCreate(OrderBase):
    pass

class OrderInDB(OrderBase):
    id: str
    user_id: str
    status: Literal["pending", "in-progress", "completed", "failed", "cancelled"] = "pending"
    created_at: datetime = datetime.utcnow()
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    paused_at: Optional[datetime] = None
    error_message: Optional[str] = None
    payment_id: Optional[str] = None
    card_last4: Optional[str] = None

class Order(OrderBase):
    id: str
    user_id: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime]
    cancelled_at: Optional[datetime]
    paused_at: Optional[datetime]
    error_message: Optional[str]
    payment_id: Optional[str]
    card_last4: Optional[str]

    class Config:
        from_attributes = True 
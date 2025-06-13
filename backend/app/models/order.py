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
    cost: float
    created_at: datetime = datetime.utcnow()
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    paused_at: Optional[datetime] = None
    last_update: Optional[datetime] = None
    upvotes_processed: int = 0
    progress_percentage: float = 0.0
    error_message: Optional[str] = None
    payment_id: Optional[str] = None
    card_last4: Optional[str] = None

class Order(OrderBase):
    id: str
    user_id: str
    status: str
    cost: float
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    cancelled_at: Optional[datetime]
    paused_at: Optional[datetime]
    last_update: Optional[datetime]
    upvotes_processed: int
    progress_percentage: float
    error_message: Optional[str]
    payment_id: Optional[str]
    card_last4: Optional[str]

    class Config:
        from_attributes = True 
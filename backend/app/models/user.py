from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import Optional, Dict
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class UserStats(BaseModel):
    total_orders: int = 0
    active_orders: int = 0
    completed_orders: int = 0

class UserBase(BaseModel):
    username: str
    email: EmailStr
    profile_image: Optional[HttpUrl] = None
    stats: UserStats = UserStats()

class UserCreate(UserBase):
    password: str
    credits: float = 0.0

class UserInDB(UserBase):
    id: str
    hashed_password: str
    credits: float = 0.0
    joined_date: datetime = datetime.utcnow()
    last_login: Optional[datetime] = None
    payment_methods: Dict[str, bool] = {}  # payment_method_id: is_default

class User(UserBase):
    id: str
    credits: float
    joined_date: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True

class AccountActivity(BaseModel):
    id: str
    user_id: str
    date: datetime
    orders: int = 0
    credits: float = 0.0
    created_at: datetime = datetime.utcnow()

    class Config:
        from_attributes = True 
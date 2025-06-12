from motor.motor_asyncio import AsyncIOMotorClient
from .settings import get_settings

settings = get_settings()

class Database:
    client: AsyncIOMotorClient = None
    db = None

    @classmethod
    async def connect_db(cls):
        cls.client = AsyncIOMotorClient(settings.MONGODB_URL)
        cls.db = cls.client[settings.MONGODB_DB_NAME]
        
    @classmethod
    async def close_db(cls):
        if cls.client:
            cls.client.close()
            
    @classmethod
    def get_db(cls):
        return cls.db

# Database collections
class Collections:
    USERS = "users"
    ORDERS = "orders"
    AUTO_ORDERS = "auto_orders"
    PAYMENTS = "payments"
    ACCOUNT_ACTIVITY = "account_activity" 
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from bson import ObjectId
from ..config.database import Database, Collections
from ..utils.logger import logger
from ..models.user import UserInDB, UserCreate, AccountActivity
from ..models.payment import PaymentInDB
from ..models.order import OrderInDB
from .referral_service import ReferralService

class UserService:
    @staticmethod
    async def create_user(user_data: UserCreate) -> UserInDB:
        db = Database.get_db()
        
        # Check if user already exists by email
        existing_user = await db[Collections.USERS].find_one({"email": user_data.email})
        if existing_user:
            raise ValueError("User with this email already exists")
        
        # Check if username already exists
        existing_username = await db[Collections.USERS].find_one({"username": user_data.username})
        if existing_username:
            raise ValueError("Username is already taken")
        
        # Generate unique referral code for new user
        my_referral_code = await ReferralService.create_unique_referral_code()
        
        # Check if they used a referral code
        referrer_id = None
        if user_data.referral_code:
            referrer_id = await ReferralService.validate_referral_code(user_data.referral_code)
        
        # Set initial credits - bonus if referred
        initial_credits = user_data.credits
        if referrer_id:
            initial_credits += 0.8  # $0.8 bonus for being referred
        
        # Create user document
        user = UserInDB(
            id=str(ObjectId()),
            username=user_data.username,
            email=user_data.email,
            credits=initial_credits,
            hashed_password=user_data.password,  # Already hashed in auth route
            my_referral_code=my_referral_code,
            referred_by=referrer_id,
            referral_earnings=0.0,
            total_referrals=0
        )
        
        # Insert into database
        user_dict = user.dict()
        user_dict["_id"] = ObjectId(user.id)
        user_dict.pop("id")  # Remove id field as we use _id in MongoDB
        
        result = await db[Collections.USERS].insert_one(user_dict)
        user.id = str(result.inserted_id)
        
        # Apply referral bonus if applicable
        if referrer_id:
            await ReferralService.apply_referral_bonus(user.id, referrer_id)
        
        logger.info("user_created", user_id=str(user.id), email=user.email, referred_by=referrer_id)
        return user

    @staticmethod
    async def get_user(user_id: str) -> Optional[UserInDB]:
        db = Database.get_db()
        user_data = await db[Collections.USERS].find_one({"_id": ObjectId(user_id)})
        if user_data:
            user_data["id"] = str(user_data["_id"])
            return UserInDB(**user_data)
        return None

    @staticmethod
    async def get_user_by_email(email: str) -> Optional[UserInDB]:
        db = Database.get_db()
        user_data = await db[Collections.USERS].find_one({"email": email})
        if user_data:
            user_data["id"] = str(user_data["_id"])
            return UserInDB(**user_data)
        return None

    @staticmethod
    async def get_user_by_username(username: str) -> Optional[UserInDB]:
        """Get user by username"""
        db = Database.get_db()
        user_data = await db[Collections.USERS].find_one({"username": username})
        if user_data:
            user_data["id"] = str(user_data["_id"])
            return UserInDB(**user_data)
        return None

    @staticmethod
    async def update_credits(user_id: str, amount: float) -> bool:
        db = Database.get_db()
        result = await db[Collections.USERS].update_one(
            {"_id": ObjectId(user_id)},
            {"$inc": {"credits": amount}}
        )
        return result.modified_count > 0

    @staticmethod
    async def get_account_activity(
        user_id: str,
        start_date: datetime,
        end_date: Optional[datetime] = None
    ) -> List[AccountActivity]:
        """Get user's account activity for a date range"""
        try:
            db = Database.get_db()
            if end_date is None:
                end_date = datetime.utcnow()

            print(f"DEBUG: Querying orders from {start_date} to {end_date}")
            print(f"DEBUG: User ID: {user_id}")

            # Get all orders in the date range
            orders = await db[Collections.ORDERS].find({
                "user_id": ObjectId(user_id),
                "created_at": {"$gte": start_date, "$lte": end_date}
            }).to_list(None)

            # Get all payments in the date range
            payments = await db[Collections.PAYMENTS].find({
                "user_id": ObjectId(user_id),
                "created_at": {"$gte": start_date, "$lte": end_date}
            }).to_list(None)

            # Group by date
            activity_by_date = {}
            current_date = start_date
            while current_date <= end_date:
                date_key = current_date.strftime("%Y-%m-%d")
                activity_by_date[date_key] = {
                    "orders": 0,
                    "credits": 0.0
                }
                current_date += timedelta(days=1)

            # Count orders per day and sum order costs
            for order in orders:
                date_key = order["created_at"].strftime("%Y-%m-%d")
                
                if date_key in activity_by_date:
                    activity_by_date[date_key]["orders"] += 1
                    # Add the cost of the order as credits spent
                    # Check for both 'cost' and 'total_cost' fields
                    order_cost = order.get("cost") or order.get("total_cost", 0)
                    if order_cost:
                        activity_by_date[date_key]["credits"] += order_cost
                        print(f"DEBUG: Added {order_cost} credits for {date_key}")
                    else:
                        print(f"DEBUG: No cost found for order {order.get('_id')}")
                else:
                    # If the order date is outside our range, create a new entry
                    order_cost = order.get("cost") or order.get("total_cost", 0)
                    activity_by_date[date_key] = {
                        "orders": 1,
                        "credits": order_cost
                    }
                    print(f"DEBUG: Created new activity entry for {date_key} with cost {order_cost}")
                    logger.info(f"Created new activity entry for {date_key}")

            # Also add credits from completed payments (top-ups)
            for payment in payments:
                if payment.get("status") == "completed":
                    date_key = payment["created_at"].strftime("%Y-%m-%d")
                    # Note: This adds credits gained, not spent
                    # We might want to track this separately in the future

            # Convert to AccountActivity objects
            activities = []
            for date_key, data in activity_by_date.items():
                activity = AccountActivity(
                    id=str(ObjectId()),
                    user_id=user_id,
                    date=datetime.strptime(date_key, "%Y-%m-%d"),
                    orders=data["orders"],
                    credits=data["credits"]
                )
                activities.append(activity)

            return activities

        except Exception as e:
            logger.error("get_account_activity_failed", error=str(e))
            raise

    @staticmethod
    async def update_user_stats(user_id: str):
        """Update user's order statistics"""
        try:
            db = Database.get_db()
            
            # Get order counts
            total_orders = await db[Collections.ORDERS].count_documents({
                "user_id": user_id
            })
            
            active_orders = await db[Collections.ORDERS].count_documents({
                "user_id": user_id,
                "status": {"$in": ["pending", "in-progress"]}
            })
            
            completed_orders = await db[Collections.ORDERS].count_documents({
                "user_id": user_id,
                "status": "completed"
            })

            # Update user stats
            await db[Collections.USERS].update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {
                        "stats": {
                            "total_orders": total_orders,
                            "active_orders": active_orders,
                            "completed_orders": completed_orders
                        }
                    }
                }
            )

            logger.info("user_stats_updated",
                user_id=user_id,
                total_orders=total_orders,
                active_orders=active_orders,
                completed_orders=completed_orders
            )

        except Exception as e:
            logger.error("update_user_stats_failed", error=str(e))
            raise

    @staticmethod
    async def create_payment(user_id: str, payment_data: Dict[str, Any]) -> PaymentInDB:
        db = Database.get_db()
        
        # Create payment document
        payment = PaymentInDB(
            user_id=ObjectId(user_id),
            amount=payment_data["amount"],
            method=payment_data["method"],
            description=payment_data["description"],
            payment_details=payment_data["payment_details"]
        )
        
        # Insert into database
        result = await db[Collections.PAYMENTS].insert_one(payment.dict(by_alias=True))
        payment.id = result.inserted_id
        
        # Update user credits
        await UserService.update_credits(user_id, payment_data["amount"])
        
        logger.info("payment_created",
            payment_id=str(payment.id),
            user_id=user_id,
            amount=payment_data["amount"]
        )
        
        return payment

    @staticmethod
    async def update_last_login(user_id: str) -> bool:
        """Update user's last login timestamp"""
        try:
            db = Database.get_db()
            result = await db[Collections.USERS].update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"last_login": datetime.utcnow()}}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error("update_last_login_failed", error=str(e))
            return False

    @staticmethod
    async def update_last_login(user_id: str) -> bool:
        """Update user's last login timestamp"""
        try:
            db = Database.get_db()
            result = await db[Collections.USERS].update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"last_login": datetime.utcnow()}}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error("update_last_login_failed", error=str(e))
            return False
import secrets
import string
from typing import Optional
from bson import ObjectId
from ..config.database import Database, Collections
from ..utils.logger import logger


class ReferralService:
    """Service for managing referral codes and rewards"""

    @staticmethod
    def generate_referral_code(length: int = 8) -> str:
        """Generate a unique referral code"""
        # Use uppercase letters and numbers for readability
        alphabet = string.ascii_uppercase + string.digits
        # Exclude easily confused characters
        alphabet = alphabet.replace('0', '').replace('O', '').replace('1', '').replace('I', '').replace('L', '')
        return ''.join(secrets.choice(alphabet) for _ in range(length))

    @staticmethod
    async def create_unique_referral_code() -> str:
        """Create a unique referral code that doesn't exist in the database"""
        db = Database.get_db()
        max_attempts = 10
        
        for _ in range(max_attempts):
            code = ReferralService.generate_referral_code()
            existing = await db[Collections.USERS].find_one({"my_referral_code": code})
            if not existing:
                return code
        
        # If we can't generate a unique code in 10 attempts, make it longer
        return ReferralService.generate_referral_code(12)

    @staticmethod
    async def validate_referral_code(referral_code: str) -> Optional[str]:
        """Validate a referral code and return the referrer's user ID if valid"""
        if not referral_code:
            return None
            
        db = Database.get_db()
        referrer = await db[Collections.USERS].find_one({"my_referral_code": referral_code})
        
        if referrer:
            return str(referrer["_id"])
        return None

    @staticmethod
    async def apply_referral_bonus(new_user_id: str, referrer_id: str) -> bool:
        """Apply referral bonuses to both new user and referrer"""
        db = Database.get_db()
        
        try:
            # Give new user $0.8 worth of credits (100 upvotes)
            new_user_bonus = 0.8
            await db[Collections.USERS].update_one(
                {"_id": ObjectId(new_user_id)},
                {
                    "$inc": {"credits": new_user_bonus},
                    "$set": {"referred_by": referrer_id}
                }
            )
            
            # Update referrer's stats
            await db[Collections.USERS].update_one(
                {"_id": ObjectId(referrer_id)},
                {"$inc": {"total_referrals": 1}}
            )
            
            logger.info("referral_bonus_applied", 
                       new_user_id=new_user_id, 
                       referrer_id=referrer_id, 
                       bonus_amount=new_user_bonus)
            
            return True
            
        except Exception as e:
            logger.error("referral_bonus_failed", 
                        new_user_id=new_user_id, 
                        referrer_id=referrer_id, 
                        error=str(e))
            return False

    @staticmethod
    async def process_referral_commission(user_id: str, amount: float) -> bool:
        """Process 10% commission for referrer when referred user spends money"""
        db = Database.get_db()
        
        try:
            # Find the user and their referrer
            user = await db[Collections.USERS].find_one({"_id": ObjectId(user_id)})
            if not user or not user.get("referred_by"):
                return False
            
            referrer_id = user["referred_by"]
            commission = amount * 0.1  # 10% commission
            
            # Add commission to referrer's credits and referral earnings
            result = await db[Collections.USERS].update_one(
                {"_id": ObjectId(referrer_id)},
                {
                    "$inc": {
                        "credits": commission,
                        "referral_earnings": commission
                    }
                }
            )
            
            if result.modified_count > 0:
                logger.info("referral_commission_processed", 
                           user_id=user_id, 
                           referrer_id=referrer_id, 
                           amount=amount, 
                           commission=commission)
                return True
            
            return False
            
        except Exception as e:
            logger.error("referral_commission_failed", 
                        user_id=user_id, 
                        amount=amount, 
                        error=str(e))
            return False

    @staticmethod
    async def get_referral_stats(user_id: str) -> dict:
        """Get referral statistics for a user"""
        db = Database.get_db()
        
        try:
            user = await db[Collections.USERS].find_one({"_id": ObjectId(user_id)})
            if not user:
                return {}
            
            # Get list of referred users (just count and recent ones)
            referred_users = await db[Collections.USERS].find(
                {"referred_by": user_id},
                {"username": 1, "joined_date": 1, "_id": 0}
            ).sort("joined_date", -1).limit(10).to_list(10)
            
            # Format recent referrals to match frontend interface
            recent_referrals = []
            for referred_user in referred_users:
                recent_referrals.append({
                    "referred_user": referred_user.get("username", "Unknown"),
                    "date": referred_user.get("joined_date", "").isoformat() if referred_user.get("joined_date") else "",
                    "earnings": 0.0  # TODO: Calculate actual earnings from this referral
                })
            
            return {
                "my_referral_code": user.get("my_referral_code", ""),
                "total_referrals": user.get("total_referrals", 0),
                "referral_earnings": user.get("referral_earnings", 0.0),
                "recent_referrals": recent_referrals
            }
            
        except Exception as e:
            logger.error("get_referral_stats_failed", user_id=user_id, error=str(e))
            return {}
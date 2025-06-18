#!/usr/bin/env python3
"""
Migration script to add referral fields to existing users
"""
import asyncio
import sys
import os

# Add the parent directory to the Python path so we can import from the app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config.database import Database, Collections
from app.services.referral_service import ReferralService
from app.utils.logger import logger

async def migrate_users():
    """Add referral fields to existing users who don't have them"""
    try:
        # Initialize database connection
        await Database.connect_db()
        db = Database.get_db()
        
        # Find users without referral fields
        users_without_referral = await db[Collections.USERS].find({
            "$or": [
                {"my_referral_code": {"$exists": False}},
                {"referral_earnings": {"$exists": False}},
                {"total_referrals": {"$exists": False}}
            ]
        }).to_list(None)
        
        logger.info(f"Found {len(users_without_referral)} users to migrate")
        
        for user in users_without_referral:
            user_id = str(user["_id"])
            
            # Generate unique referral code if missing
            my_referral_code = user.get("my_referral_code")
            if not my_referral_code:
                my_referral_code = await ReferralService.create_unique_referral_code()
            
            # Set default values for missing fields
            update_fields = {}
            
            if "my_referral_code" not in user or not user["my_referral_code"]:
                update_fields["my_referral_code"] = my_referral_code
                
            if "referral_earnings" not in user:
                update_fields["referral_earnings"] = 0.0
                
            if "total_referrals" not in user:
                update_fields["total_referrals"] = 0
                
            if "referred_by" not in user:
                update_fields["referred_by"] = None
            
            # Update the user
            if update_fields:
                result = await db[Collections.USERS].update_one(
                    {"_id": user["_id"]},
                    {"$set": update_fields}
                )
                
                if result.modified_count > 0:
                    logger.info(f"Updated user {user.get('email', user_id)} with referral fields")
                else:
                    logger.warning(f"Failed to update user {user.get('email', user_id)}")
        
        logger.info("Migration completed successfully")
        
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        raise
    finally:
        # Close database connection
        await Database.close_db()

async def main():
    """Main migration function"""
    try:
        logger.info("Starting referral fields migration...")
        await migrate_users()
        logger.info("Migration completed successfully")
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())

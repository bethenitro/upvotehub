from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from ..services.user_service import UserService
from ..models.user import User, UserCreate, UserLogin
from ..models.payment import Payment
from ..utils.logger import logger
from ..config.database import Database, Collections # For last_login update
from datetime import datetime # For last_login update

router = APIRouter(prefix="/api/user", tags=["user"])

# New Signup Endpoint
@router.post("/signup", response_model=User)
async def signup_user(user_data: UserCreate):
    try:
        user = await UserService.create_user(user_data)
        # Note: UserService.create_user is expected to return a User model instance
        # If it returns UserInDB, we might need to convert it or adjust UserService
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# New Login Endpoint
@router.post("/login", response_model=User)
async def login_user(user_data: UserLogin):
    # UserService.get_user_by_email returns UserInDB which contains the hashed_password (plain text for now)
    db_user = await UserService.get_user_by_email(user_data.email)

    if not db_user:
        logger.warn("login_attempt_failed", email=user_data.email, reason="User not found")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Verify password using UserService.verify_password
    if not UserService.verify_password(user_data.password, db_user.hashed_password):
        logger.warn("login_attempt_failed", email=user_data.email, reason="Password mismatch")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Update last_login field
    # Ideally, this would be a method in UserService, e.g., UserService.update_last_login(db_user.id)
    # For now, directly updating it here.
    mongo_db = Database.get_db()
    await mongo_db[Collections.USERS].update_one(
        {"_id": db_user.id}, # Assuming db_user.id is already an ObjectId or compatible
        {"$set": {"last_login": datetime.utcnow()}}
    )

    # Fetch the updated user data to return as User model
    # get_user returns UserInDB, FastAPI will convert to User response_model
    updated_user = await UserService.get_user(str(db_user.id))
    if not updated_user:
        # This should not happen if the user was just updated
        logger.error("login_failed_post_update", email=user_data.email, reason="User disappeared after last_login update")
        raise HTTPException(status_code=500, detail="Login failed due to an unexpected error")

    logger.info("user_logged_in", user_id=str(updated_user.id), email=updated_user.email)
    return updated_user

@router.get("/current", response_model=User)
async def get_current_user():
    # In a real application, this would get the user from the JWT token
    # For now, we'll return a mock user
    user = await UserService.get_user("usr_123")
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/activity")
async def get_account_activity():
    # In a real application, this would get the user_id from the JWT token
    activities = await UserService.get_account_activity("usr_123")
    return activities

@router.post("/topup")
async def top_up_account(amount: float, payment_method: str, payment_details: Dict[str, Any]):
    try:
        # In a real application, this would get the user_id from the JWT token
        payment = await UserService.create_payment(
            "usr_123",
            {
                "amount": amount,
                "method": payment_method,
                "description": "Account top-up",
                "payment_details": payment_details
            }
        )
        return {"success": True, "transaction": payment}
    except Exception as e:
        logger.error("topup_failed", error=str(e))
        raise HTTPException(status_code=400, detail=str(e)) 
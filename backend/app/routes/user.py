from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from ..services.user_service import UserService
from ..models.user import User, UserCreate
from ..models.payment import Payment
from ..utils.logger import logger

router = APIRouter(prefix="/api/user", tags=["user"])

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
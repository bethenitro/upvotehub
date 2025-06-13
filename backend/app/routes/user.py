from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from ..services.user_service import UserService
from ..models.user import User, UserCreate
from ..models.payment import Payment
from ..utils.auth import get_current_user
from ..utils.logger import logger

router = APIRouter(prefix="/api/user", tags=["user"])

@router.get("/current", response_model=User)
async def get_current_user(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@router.get("/activity")
async def get_account_activity(current_user: User = Depends(get_current_user)):
    """Get user account activity"""
    activities = await UserService.get_account_activity(current_user.id)
    return activities

@router.post("/topup")
async def top_up_account(amount: float, payment_method: str, payment_details: Dict[str, Any], current_user: User = Depends(get_current_user)):
    try:
        payment = await UserService.create_payment(
            current_user.id,
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
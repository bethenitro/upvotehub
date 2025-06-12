from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta
from typing import List
from ..models.user import User, AccountActivity
from ..models.order import Order
from ..services.user_service import UserService
from ..services.order_service import OrderService
from ..utils.exceptions import InsufficientCreditsError
from .user import get_current_user
from ..utils.validators import validate_reddit_url

router = APIRouter()

@router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@router.get("/stats")
async def get_user_stats(current_user: User = Depends(get_current_user)):
    """Get user statistics"""
    try: 
        # Get order counts
        total_orders = await OrderService.get_user_order_count(current_user.id)
        active_orders = await OrderService.get_user_active_order_count(current_user.id)
        completed_orders = await OrderService.get_user_completed_order_count(current_user.id)

        # Get account activity
        activity = await UserService.get_account_activity(
            current_user.id,
            datetime.utcnow() - timedelta(days=30)
        )

        return {
            "stats": {
                "total_orders": total_orders,
                "active_orders": active_orders,
                "completed_orders": completed_orders
            },
            "activity": activity
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/activity", response_model=List[AccountActivity])
async def get_account_activity(
    start_date: datetime,
    end_date: datetime,
    current_user: User = Depends(get_current_user)
):
    """Get user account activity for a date range"""
    try:
        return await UserService.get_account_activity(
            current_user.id,
            start_date,
            end_date
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/validate-reddit-url")
async def validate_reddit_url_endpoint(url: str):
    """Validate a Reddit URL"""
    try:
        is_valid, post_id = validate_reddit_url(url)
        return {
            "is_valid": is_valid,
            "post_id": post_id if is_valid else None
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) 
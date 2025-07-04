from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from ..models.user import User
from ..models.order import Order, OrderCreate
from ..models.payment import PaymentMethod
from ..services.order_service import OrderService
from ..services.payment_service import PaymentService
from ..utils.logger import logger
from ..utils.exceptions import (
    InvalidRedditUrlError,
    InsufficientCreditsError,
    PaymentProcessingError,
    OrderProcessingError
)
from ..utils.auth import get_current_user
from ..utils.validators import validate_reddit_url, validate_payment_amount

router = APIRouter()

@router.post("/", response_model=Order)
async def create_order(
    order: OrderCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new order"""
    try:
        logger.info("creating_order", 
            user_id=current_user.id,
            reddit_url=str(order.reddit_url),
            upvotes=order.upvotes,
            upvotes_per_minute=order.upvotes_per_minute
        )
        
        # Validate Reddit URL
        is_valid, _ = validate_reddit_url(str(order.reddit_url))
        if not is_valid:
            raise InvalidRedditUrlError()

        # Calculate cost
        cost = order.upvotes * 0.008

        # Check credit balance
        if current_user.credits < cost:
            raise InsufficientCreditsError()

        result = await OrderService.create_order(current_user.id, order)
        
        logger.info("order_created_successfully", 
            order_id=result.id,
            user_id=current_user.id
        )
        
        return result
        
    except (InvalidRedditUrlError, InsufficientCreditsError) as e:
        logger.error("order_validation_failed", 
            user_id=current_user.id,
            error=str(e)
        )
        raise e
    except Exception as e:
        logger.error("order_creation_failed", 
            user_id=current_user.id,
            error=str(e)
        )
        raise OrderProcessingError(str(e))

@router.get("/", response_model=List[Order])
async def get_orders(current_user: User = Depends(get_current_user)):
    """Get user's orders"""
    return await OrderService.get_user_orders(current_user.id)

@router.get("/payment-methods", response_model=List[PaymentMethod])
async def get_payment_methods(current_user: User = Depends(get_current_user)):
    """Get user's payment methods"""
    return await PaymentService.get_user_payment_methods(current_user.id)

@router.get("/{order_id}/status")
async def get_order_status(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get order status and progress"""
    try:
        status = await OrderService.get_order_status(order_id)
        if not status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        return status
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
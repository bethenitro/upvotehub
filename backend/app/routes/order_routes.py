from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from ..models.user import User
from ..models.order import Order, OrderCreate, AutoOrder, AutoOrderCreate
from ..models.payment import PaymentMethod
from ..services.order_service import OrderService
from ..services.payment_service import PaymentService
from ..utils.exceptions import (
    InvalidRedditUrlError,
    InsufficientCreditsError,
    PaymentProcessingError,
    OrderProcessingError,
    AutoOrderError
)
from .user import get_current_user
from ..utils.validators import validate_reddit_url, validate_payment_amount

router = APIRouter()

@router.post("/", response_model=Order)
async def create_order(
    order: OrderCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new order"""
    try:
        # Validate Reddit URL
        is_valid, _ = validate_reddit_url(str(order.reddit_url))
        if not is_valid:
            raise InvalidRedditUrlError()

        # Check credit balance
        if current_user.credits < order.upvotes:
            raise InsufficientCreditsError()

        return await OrderService.create_order(current_user.id, order)
    except (InvalidRedditUrlError, InsufficientCreditsError) as e:
        raise e
    except Exception as e:
        raise OrderProcessingError(str(e))

@router.get("/", response_model=List[Order])
async def get_orders(current_user: User = Depends(get_current_user)):
    """Get user's orders"""
    return await OrderService.get_user_orders(current_user.id)

@router.post("/auto", response_model=AutoOrder)
async def create_auto_order(
    order: AutoOrderCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new auto order"""
    try:
        # Validate Reddit URL
        is_valid, _ = validate_reddit_url(str(order.reddit_url))
        if not is_valid:
            raise InvalidRedditUrlError()

        # Check credit balance
        if current_user.credits < order.upvotes:
            raise InsufficientCreditsError()

        return await OrderService.create_auto_order(current_user.id, order)
    except (InvalidRedditUrlError, InsufficientCreditsError) as e:
        raise e
    except Exception as e:
        raise AutoOrderError(str(e))

@router.get("/auto", response_model=List[AutoOrder])
async def get_auto_orders(current_user: User = Depends(get_current_user)):
    """Get user's auto orders"""
    return await OrderService.get_user_auto_orders(current_user.id)

@router.post("/auto/{order_id}/pause")
async def pause_auto_order(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """Pause an auto order"""
    try:
        return await OrderService.pause_auto_order(current_user.id, order_id)
    except Exception as e:
        raise AutoOrderError(str(e))

@router.post("/auto/{order_id}/resume")
async def resume_auto_order(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """Resume a paused auto order"""
    try:
        return await OrderService.resume_auto_order(current_user.id, order_id)
    except Exception as e:
        raise AutoOrderError(str(e))

@router.get("/payment-methods", response_model=List[PaymentMethod])
async def get_payment_methods(current_user: User = Depends(get_current_user)):
    """Get user's payment methods"""
    return await PaymentService.get_user_payment_methods(current_user.id) 
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from ..services.order_service import OrderService
from ..models.order import Order
from ..models.user import User
from ..utils.auth import get_current_user
from ..utils.logger import logger

router = APIRouter(prefix="/api/orders", tags=["orders"])

@router.get("", response_model=List[Order])
async def get_orders(current_user: User = Depends(get_current_user)):
    """Get user's orders"""
    orders = await OrderService.get_user_orders(current_user.id)
    return orders

@router.get("/history", response_model=List[Order])
async def get_orders_history():
    return await get_orders()

@router.post("")
async def create_order(order_data: Dict[str, Any], current_user: User = Depends(get_current_user)):
    try:
        order = await OrderService.create_order(current_user.id, order_data)
        return {"success": True, "order": order}
    except Exception as e:
        logger.error("order_creation_failed", error=str(e))
        raise HTTPException(status_code=400, detail=str(e)) 
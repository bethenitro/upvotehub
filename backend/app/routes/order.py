from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from ..services.order_service import OrderService
from ..models.order import Order, AutoOrder
from ..utils.logger import logger

router = APIRouter(prefix="/api/orders", tags=["orders"])

@router.get("", response_model=List[Order])
async def get_orders():
    # In a real application, this would get the user_id from the JWT token
    orders = await OrderService.get_user_orders("usr_123")
    return orders

@router.get("/history", response_model=List[Order])
async def get_orders_history():
    return await get_orders()

@router.get("/auto", response_model=List[AutoOrder])
async def get_auto_orders():
    # In a real application, this would get the user_id from the JWT token
    orders = await OrderService.get_user_auto_orders("usr_123")
    return orders

@router.post("")
async def create_order(order_data: Dict[str, Any]):
    try:
        # In a real application, this would get the user_id from the JWT token
        order = await OrderService.create_order("usr_123", order_data)
        return {"success": True, "order": order}
    except Exception as e:
        logger.error("order_creation_failed", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/auto")
async def create_auto_order(order_data: Dict[str, Any]):
    try:
        # In a real application, this would get the user_id from the JWT token
        order = await OrderService.create_auto_order("usr_123", order_data)
        return {"success": True, "order": order}
    except Exception as e:
        logger.error("auto_order_creation_failed", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/auto/{order_id}")
async def cancel_auto_order(order_id: str):
    try:
        # In a real application, this would get the user_id from the JWT token
        success = await OrderService.cancel_auto_order("usr_123", order_id)
        if not success:
            raise HTTPException(status_code=404, detail="Order not found")
        return {"success": True, "message": f"Auto order {order_id} has been cancelled."}
    except Exception as e:
        logger.error("auto_order_cancellation_failed", 
            order_id=order_id,
            error=str(e)
        )
        raise HTTPException(status_code=400, detail=str(e)) 
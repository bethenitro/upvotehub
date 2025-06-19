from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any
from ..services.order_service import OrderService
from ..services.bot_client import bot_client
from ..models.order import Order
from ..models.user import User
from ..utils.auth import get_current_user
from ..utils.logger import logger

router = APIRouter(prefix="/api/orders", tags=["orders"])

@router.get("/list", response_model=List[Order])
async def get_orders(current_user: User = Depends(get_current_user)):
    """Get user's orders"""
    orders = await OrderService.get_user_orders(current_user.id)
    return orders

@router.get("/history", response_model=List[Order])
async def get_orders_history():
    return await get_orders()

@router.post("/create")
async def create_order(order_data: Dict[str, Any], current_user: User = Depends(get_current_user)):
    try:
        order = await OrderService.create_order(current_user.id, order_data)
        return {"success": True, "order": order}
    except Exception as e:
        logger.error("order_creation_failed", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{order_id}/status")
async def get_order_status(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get order status with restart detection
    This endpoint checks both database and bot backend to detect interrupted orders
    """
    try:
        # Verify the order exists and belongs to the user
        order = await OrderService.get_order_by_id(order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        if order.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Get status from database
        db_status = await OrderService.get_order_status(order_id)
        if not db_status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order status not found"
            )
        
        # For active orders, check bot backend for restart detection
        if db_status["status"] in ["pending", "processing", "in-progress"]:
            try:
                # Check if order exists in bot backend
                bot_result = await bot_client.get_bot_order_status(order_id)
                
                if bot_result["success"]:
                    # Order found in bot backend, return bot status
                    return {
                        "success": True,
                        "status": bot_result["data"]["status"],
                        "order_id": order_id,
                        "total_upvotes": db_status.get("total_upvotes", 0),
                        "upvotes_done": bot_result["data"].get("upvotes_done", 0),
                        "progress_percentage": bot_result["data"].get("progress_percentage", 0.0),
                        "error_message": bot_result["data"].get("error"),
                        "last_update": bot_result["data"].get("last_update") or db_status.get("last_update")
                    }
                else:
                    # Order not found in bot backend but active in database = restart detected
                    if "not found" in bot_result["error"].lower():
                        logger.warning(f"Restart detected for order {order_id} - marking as failed")
                        
                        # Update database to mark as failed due to restart
                        await OrderService.update_order_status(
                            order_id=order_id,
                            status="failed",
                            error_message="Order was interrupted by bot backend restart"
                        )
                        
                        return {
                            "success": True,
                            "status": "failed",
                            "order_id": order_id,
                            "total_upvotes": db_status.get("total_upvotes", 0),
                            "upvotes_done": 0,
                            "progress_percentage": 0.0,
                            "error_message": "Order was interrupted by bot backend restart",
                            "last_update": db_status.get("last_update")
                        }
                    else:
                        # Other bot backend error, return database status
                        logger.warning(f"Bot backend error for order {order_id}: {bot_result['error']}")
                        
            except Exception as e:
                # Bot backend communication failed, return database status
                logger.warning(f"Failed to check bot backend for order {order_id}: {str(e)}")
        
        # For completed/failed orders or when bot backend check failed, return database status
        return {
            "success": True,
            "status": db_status["status"],
            "order_id": order_id,
            "total_upvotes": db_status.get("total_upvotes", 0),
            "upvotes_done": 0,  # Database doesn't track progress
            "progress_percentage": 100.0 if db_status["status"] == "completed" else 0.0,
            "error_message": db_status.get("error_message"),
            "last_update": db_status.get("last_update")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting order status {order_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        ) 
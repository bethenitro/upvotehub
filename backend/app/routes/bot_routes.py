"""
Bot Integration Routes
Handles communication with the bot backend
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..services.bot_client import bot_client
from ..services.order_service import OrderService
from ..utils.logger import logger
from ..utils.auth import get_current_user
from ..models.user import User

router = APIRouter()

class BotStatusUpdate(BaseModel):
    order_id: str
    status: str
    error: Optional[str] = None
    last_update: str

class BotOrderRequest(BaseModel):
    order_id: str
    reddit_url: str
    upvotes: int
    upvotes_per_minute: int

@router.post("/orders/{order_id}/bot-status")
async def update_bot_status(order_id: str, status_update: BotStatusUpdate):
    """
    Receive status updates from the bot backend
    This endpoint is called by the bot backend to notify status changes
    """
    try:
        logger.info(f"Received bot status update for order {order_id}: {status_update.status}")
        
        # Update the order in the database
        success = await OrderService.update_order_status(
            order_id=order_id,
            status=status_update.status,
            error_message=status_update.error
        )
        
        if success:
            logger.info(f"Successfully updated order {order_id} status in database")
            return {"success": True, "message": "Status updated"}
        else:
            logger.warning(f"Failed to update order {order_id} status in database")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
            
    except Exception as e:
        logger.error(f"Error updating bot status for order {order_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/orders/{order_id}/send-to-bot")
async def send_order_to_bot(
    order_id: str, 
    bot_request: BotOrderRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Send an order to the bot backend for processing
    """
    try:
        logger.info(f"Sending order {order_id} to bot backend")
        
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
        
        # Send to bot backend
        result = await bot_client.create_bot_order({
            "order_id": bot_request.order_id,
            "reddit_url": bot_request.reddit_url,
            "upvotes": bot_request.upvotes,
            "upvotes_per_minute": bot_request.upvotes_per_minute
        })
        
        if result["success"]:
            # Update order status to indicate it's been sent to bot
            await OrderService.update_order_status(
                order_id=order_id,
                status="processing",
                upvotes_done=0,
                progress_percentage=0.0
            )
            
            logger.info(f"Successfully sent order {order_id} to bot backend")
            return {"success": True, "data": result["data"]}
        else:
            logger.error(f"Failed to send order {order_id} to bot backend: {result['error']}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bot backend error: {result['error']}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending order {order_id} to bot: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/orders/{order_id}/bot-status")
async def get_bot_order_status(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get the current status of an order from the bot backend
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
        
        # Get status from bot backend
        result = await bot_client.get_bot_order_status(order_id)
        
        if result["success"]:
            # Send order to bot backend
            await OrderService.update_order_status(
                order_id=order_id,
                status="processing"
            )
            return {"success": True, "data": result["data"]}
        else:
            # If order not found in bot backend, check if it's due to restart
            if "not found" in result["error"].lower():
                # Fallback to database status for orders that may have been interrupted
                db_status = await OrderService.get_order_status(order_id)
                if db_status:
                    # If order was active in database but not in bot backend, 
                    # it was likely interrupted by restart
                    if db_status["status"] in ["pending", "in-progress", "processing"]:
                        # Update the database to reflect the failure
                        await OrderService.update_order_status(
                            order_id=order_id,
                            status="failed",
                            error_message="Order was interrupted by bot backend restart"
                        )
                        
                        return {
                            "success": True, 
                            "data": {
                                "order_id": order_id,
                                "status": "failed",
                                "error": "Order was interrupted by bot backend restart",
                                "total_upvotes": db_status.get("total_upvotes", 0),
                                "last_update": db_status.get("last_update")
                            }
                        }
                    else:
                        # Return the database status as-is for completed/failed orders
                        return {
                            "success": True,
                            "data": {
                                "order_id": order_id,
                                "status": db_status["status"],
                                "total_upvotes": db_status.get("total_upvotes", 0),
                                "error": db_status.get("error_message"),
                                "last_update": db_status.get("last_update")
                            }
                        }
            
            # If we can't get status from anywhere, return the error
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bot status not found: {result['error']}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting bot status for order {order_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.delete("/orders/{order_id}/bot")
async def cancel_bot_order(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Cancel an order in the bot backend
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
        
        # Cancel in bot backend
        result = await bot_client.cancel_bot_order(order_id)
        
        if result["success"]:
            # Update order status in database
            await OrderService.update_order_status(
                order_id=order_id,
                status="cancelled",
                error_message="Cancelled by user"
            )
            
            logger.info(f"Successfully cancelled order {order_id} in bot backend")
            return {"success": True, "data": result["data"]}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bot backend error: {result['error']}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling bot order {order_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/orders/{order_id}/bot/retry")
async def retry_bot_order(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Retry a failed order in the bot backend
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
        
        # Retry in bot backend
        result = await bot_client.retry_bot_order(order_id)
        
        if result["success"]:
            # Update order status in database
            await OrderService.update_order_status(
                order_id=order_id,
                status="processing",
                upvotes_done=0,
                progress_percentage=0.0,
                error_message=None
            )
            
            logger.info(f"Successfully retried order {order_id} in bot backend")
            return {"success": True, "data": result["data"]}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bot backend error: {result['error']}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrying bot order {order_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/bot/health")
async def get_bot_health():
    """
    Check the health status of the bot backend
    """
    try:
        result = await bot_client.get_bot_health()
        
        if result["success"]:
            return {"success": True, "data": result["data"]}
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Bot backend unhealthy: {result['error']}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking bot health: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

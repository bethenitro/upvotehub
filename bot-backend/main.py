#!/usr/bin/env python3
"""
Bot Backend Server for UpVote Processing
A dedicated FastAPI backend for handling bot operations independently from the main backend.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum
import asyncio
import threading
import uuid
import logging
import os
import sys
import httpx
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
    handlers=[
        logging.FileHandler('bot_backend.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configuration
MAIN_BACKEND_URL = os.getenv("MAIN_BACKEND_URL", "http://localhost:8000")

# Global variables for caching system limits
_cached_limits = None
_limits_cache_time = None
_limits_cache_duration = 300  # 5 minutes

async def get_system_limits() -> Dict[str, int]:
    """Fetch current system limits from the main backend with caching"""
    global _cached_limits, _limits_cache_time
    
    # Check if we have cached limits that are still valid
    if (_cached_limits is not None and 
        _limits_cache_time is not None and 
        (datetime.now().timestamp() - _limits_cache_time) < _limits_cache_duration):
        return _cached_limits
    
    try:
        async with httpx.AsyncClient() as client:
            # Try to get limits from the order service (public endpoint)
            response = await client.get(f"{MAIN_BACKEND_URL}/api/orders/internal/limits")
            if response.status_code == 200:
                settings = response.json()
                limits = {
                    "min_upvotes": settings.get("min_upvotes", 1),
                    "max_upvotes": settings.get("max_upvotes", 1000),
                    "min_upvotes_per_minute": settings.get("min_upvotes_per_minute", 1),
                    "max_upvotes_per_minute": settings.get("max_upvotes_per_minute", 60),
                }
                # Cache the limits
                _cached_limits = limits
                _limits_cache_time = datetime.now().timestamp()
                logger.info(f"Fetched system limits: {limits}")
                return limits
            else:
                logger.warning(f"Failed to fetch system limits: HTTP {response.status_code}")
    except Exception as e:
        logger.warning(f"Failed to fetch system limits from main backend: {e}")
    
    # Return default limits if fetching fails
    default_limits = {
        "min_upvotes": 1,
        "max_upvotes": 1000,
        "min_upvotes_per_minute": 1,
        "max_upvotes_per_minute": 60,
    }
    logger.info(f"Using default system limits: {default_limits}")
    return default_limits

# Import the bot processor
from script import UpvoteProcessor, UpvoteStatus

app = FastAPI(
    title="UpVote Bot Backend",
    description="Dedicated backend for managing upvote bot operations",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Global bot processor instance
bot_processor = UpvoteProcessor()

# Pydantic models
class OrderCreate(BaseModel):
    order_id: str
    reddit_url: str
    upvotes: int
    upvotes_per_minute: int
    
    @validator('upvotes')
    def validate_upvotes(cls, v):
        # Basic validation - detailed validation will be done in the endpoint
        if v <= 0:
            raise ValueError('Upvotes must be greater than 0')
        if v > 10000:  # Set a very high max to prevent abuse, real limit checked later
            raise ValueError('Upvotes value is too high')
        return v
    
    @validator('upvotes_per_minute')
    def validate_upvotes_per_minute(cls, v):
        # Basic validation - detailed validation will be done in the endpoint
        if v <= 0:
            raise ValueError('Upvotes per minute must be greater than 0')
        if v > 1000:  # Set a very high max to prevent abuse, real limit checked later
            raise ValueError('Upvotes per minute value is too high')
        return v
    
    @validator('reddit_url')
    def validate_reddit_url(cls, v):
        if not v.startswith(('https://reddit.com/', 'https://www.reddit.com/')):
            raise ValueError('Invalid Reddit URL')
        return v

async def validate_order_against_limits(order: OrderCreate) -> None:
    """Validate order against current system limits"""
    limits = await get_system_limits()
    
    if order.upvotes < limits["min_upvotes"]:
        raise ValueError(f'Upvotes must be at least {limits["min_upvotes"]}')
    if order.upvotes > limits["max_upvotes"]:
        raise ValueError(f'Upvotes cannot exceed {limits["max_upvotes"]}')
    
    if order.upvotes_per_minute < limits["min_upvotes_per_minute"]:
        raise ValueError(f'Upvotes per minute must be at least {limits["min_upvotes_per_minute"]}')
    if order.upvotes_per_minute > limits["max_upvotes_per_minute"]:
        raise ValueError(f'Upvotes per minute cannot exceed {limits["max_upvotes_per_minute"]}')

class OrderResponse(BaseModel):
    success: bool
    order_id: str
    status: str
    total_upvotes: int
    error: Optional[str] = None
    start_time: Optional[str] = None
    last_update: Optional[str] = None

class StatusResponse(BaseModel):
    success: bool
    order_id: str
    url: str
    status: str
    total_upvotes: int
    upvotes_per_minute: int
    start_time: Optional[str]
    last_update: str
    error: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    active_orders: int
    total_processed: int

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    active_orders = len([s for s in bot_processor.sessions.values() if s.status == UpvoteStatus.RUNNING])
    total_processed = len(bot_processor.sessions)
    
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        active_orders=active_orders,
        total_processed=total_processed
    )

@app.post("/orders", response_model=OrderResponse)
async def create_order(order: OrderCreate, background_tasks: BackgroundTasks):
    """Create and start processing a new upvote order"""
    try:
        logger.info(f"Received new order: {order.order_id} for URL: {order.reddit_url}")
        
        # Validate against dynamic system limits
        try:
            await validate_order_against_limits(order)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
        # Check if order already exists
        if order.order_id in bot_processor.sessions:
            existing_session = bot_processor.sessions[order.order_id]
            if existing_session.status in [UpvoteStatus.RUNNING, UpvoteStatus.PENDING]:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Order {order.order_id} is already being processed"
                )
        
        # Create order data for the processor
        order_data = {
            "order_id": order.order_id,
            "reddit_url": order.reddit_url,
            "upvotes": order.upvotes,
            "upvotes_per_minute": order.upvotes_per_minute
        }
        
        # Process the order
        result = bot_processor.process_order(order_data)
        
        # Only fail immediately on validation errors or setup issues
        # Let runtime errors be tracked through the status endpoint
        if not result.get("success"):
            error_msg = result.get("error", "Failed to process order")
            # Check if this is a validation error (should fail immediately)
            if any(keyword in error_msg.lower() for keyword in ["missing", "invalid", "field"]):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=error_msg
                )
            else:
                # For runtime errors, still return success but let status endpoint track the failure
                logger.warning(f"Order {order.order_id} started with potential issues: {error_msg}")
                return OrderResponse(
                    success=True,  # Return success to indicate order was accepted
                    order_id=order.order_id,
                    status="processing",  # Show as processing initially
                    total_upvotes=order.upvotes,
                    start_time=datetime.now().isoformat()
                )
        
        logger.info(f"Order {order.order_id} started successfully")
        
        return OrderResponse(
            success=result["success"],
            order_id=order.order_id,
            status=result["status"],
            total_upvotes=order.upvotes,
            start_time=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating order {order.order_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@app.get("/orders/{order_id}", response_model=StatusResponse)
async def get_order_status(order_id: str):
    """Get the status of a specific order"""
    try:
        status_data = bot_processor.get_session_status(order_id)
        
        if not status_data.get("success"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order {order_id} not found"
            )
        
        return StatusResponse(**status_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting status for order {order_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@app.get("/orders", response_model=List[StatusResponse])
async def get_all_orders():
    """Get the status of all orders"""
    try:
        all_orders = []
        for order_id in bot_processor.sessions:
            status_data = bot_processor.get_session_status(order_id)
            if status_data.get("success"):
                all_orders.append(StatusResponse(**status_data))
        
        return all_orders
        
    except Exception as e:
        logger.error(f"Error getting all orders: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@app.delete("/orders/{order_id}")
async def cancel_order(order_id: str):
    """Cancel a running order (if possible)"""
    try:
        if order_id not in bot_processor.sessions:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order {order_id} not found"
            )
        
        session = bot_processor.sessions[order_id]
        
        if session.status == UpvoteStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order {order_id} is already completed"
            )
        
        if session.status == UpvoteStatus.FAILED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order {order_id} has already failed"
            )
        
        # Mark as cancelled (we'll treat it as failed with a specific message)
        session.status = UpvoteStatus.FAILED
        session.error_message = "Order cancelled by user"
        session.last_update = datetime.now().isoformat()
        
        # Clean up thread if exists
        if order_id in bot_processor.active_threads:
            del bot_processor.active_threads[order_id]
        
        logger.info(f"Order {order_id} cancelled")
        
        return {"success": True, "message": f"Order {order_id} cancelled"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling order {order_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@app.post("/orders/{order_id}/retry")
async def retry_order(order_id: str):
    """Retry a failed order"""
    try:
        if order_id not in bot_processor.sessions:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order {order_id} not found"
            )
        
        session = bot_processor.sessions[order_id]
        
        if session.status not in [UpvoteStatus.FAILED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order {order_id} cannot be retried (current status: {session.status.value})"
            )
        
        # Reset session for retry
        session.status = UpvoteStatus.PENDING
        session.upvotes_done = 0
        session.progress_percentage = 0.0
        session.error_message = None
        session.last_update = datetime.now().isoformat()
        
        # Start processing again
        result = bot_processor._start_upvote_processing(order_id)
        
        logger.info(f"Order {order_id} retried")
        
        return OrderResponse(
            success=result["success"],
            order_id=order_id,
            status=result["status"],
            upvotes_done=result.get("upvotes_done", 0),
            total_upvotes=session.total_upvotes,
            progress_percentage=result.get("progress_percentage", 0.0)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrying order {order_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@app.post("/orders/{order_id}/migrate")
async def migrate_order_to_history(order_id: str, order_data: dict):
    """Migrate an existing order to the history system (for testing/recovery)"""
    try:
        bot_processor.order_history.add_order(order_id, {
            "reddit_url": order_data.get("reddit_url", ""),
            "upvotes": order_data.get("upvotes", 0),
            "upvotes_per_minute": order_data.get("upvotes_per_minute", 1)
        })
        
        # Mark as failed since it wasn't processed by this system
        bot_processor.order_history.mark_as_failed_after_restart(order_id)
        
        logger.info(f"Migrated order {order_id} to history")
        
        return {"success": True, "message": f"Order {order_id} migrated to history"}
        
    except Exception as e:
        logger.error(f"Error migrating order {order_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

# Background task for periodic cleanup
async def periodic_cleanup():
    """Periodic cleanup task to remove old order history"""
    while True:
        try:
            await asyncio.sleep(24 * 60 * 60)  # Run once per day
            bot_processor.order_history.cleanup_old_orders(days=30)
            logger.info("Completed periodic cleanup of old orders")
        except Exception as e:
            logger.error(f"Error during periodic cleanup: {e}")

@app.on_event("startup")
async def startup_event():
    """Run startup tasks"""
    logger.info("Bot backend starting up...")
    
    # Start periodic cleanup task
    asyncio.create_task(periodic_cleanup())
    
    logger.info("Bot backend startup completed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")

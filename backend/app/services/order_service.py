import subprocess
import json
import asyncio
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from bson import ObjectId
from ..config.database import Database, Collections
from ..config.settings import get_settings
from ..utils.logger import logger
from ..models.order import OrderInDB, Order, OrderCreate
from ..utils.exceptions import OrderProcessingError

settings = get_settings()

class OrderService:
    @staticmethod
    async def create_order(user_id: str, order_data: OrderCreate) -> OrderInDB:
        db = Database.get_db()
        
        # Calculate cost (0.008 credits per upvote)
        cost = order_data.upvotes * 0.008
        
        # Deduct credits from user
        user_result = await db[Collections.USERS].update_one(
            {"_id": ObjectId(user_id), "credits": {"$gte": cost}},
            {"$inc": {"credits": -cost}}
        )
        
        if user_result.modified_count == 0:
            raise OrderProcessingError("Insufficient credits or user not found")
        
        # Create order document
        order_dict = {
            "user_id": ObjectId(user_id),
            "reddit_url": str(order_data.reddit_url),
            "upvotes": order_data.upvotes,
            "upvotes_per_minute": order_data.upvotes_per_minute or 1,
            "cost": cost,
            "status": "pending",
            "created_at": datetime.utcnow(),
            "type": "one-time",
            "started_at": None,
            "completed_at": None,
            "cancelled_at": None,
            "last_update": datetime.utcnow(),
            "error_message": None,
            "payment_id": None,
            "card_last4": None
        }
        
        # Insert into database
        result = await db[Collections.ORDERS].insert_one(order_dict)
        order_dict["id"] = str(result.inserted_id)
        order_dict["user_id"] = str(order_dict["user_id"])
        
        # Schedule order processing with bot backend
        from ..utils.task_manager import task_manager
        await task_manager.schedule_bot_order_processing(order_dict)
        
        logger.info("order_created", 
            order_id=str(result.inserted_id),
            user_id=user_id,
            upvotes=order_data.upvotes,
            cost=cost
        )
        
        # Remove the _id field and add the converted id field
        order_dict.pop("_id", None)
        
        return OrderInDB(**order_dict)

    @staticmethod
    async def process_order_with_script(order_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process order using the external script with proper error handling"""
        try:
            # Prepare script input
            script_input = {
                "order_id": order_data["id"],
                "reddit_url": order_data["reddit_url"],
                "upvotes": order_data["upvotes"],
                "upvotes_per_minute": order_data["upvotes_per_minute"]
            }
            
            logger.info("starting_order_processing", 
                order_id=order_data["id"],
                reddit_url=order_data["reddit_url"],
                upvotes=order_data["upvotes"]
            )
            
            # Update order status to in-progress
            db = Database.get_db()
            await db[Collections.ORDERS].update_one(
                {"_id": ObjectId(order_data["id"])},
                {"$set": {"status": "in-progress", "started_at": datetime.utcnow()}}
            )
            
            # Run the script in a subprocess using the configured Python executable
            python_executable = settings.PYTHON_EXECUTABLE
            
            # Fallback to sys.executable if the configured python doesn't exist
            if not os.path.exists(python_executable):
                import sys
                python_executable = sys.executable
                logger.warning("configured_python_not_found", 
                    configured_path=settings.PYTHON_EXECUTABLE,
                    fallback_path=python_executable
                )
            
            process = await asyncio.create_subprocess_exec(
                python_executable, settings.ORDER_SCRIPT_PATH,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=settings.BACKEND_WORKING_DIRECTORY
            )
            
            # Send input to script
            stdout, stderr = await process.communicate(
                input=json.dumps(script_input).encode()
            )
            
            if process.returncode == 0:
                # Parse script output
                try:
                    result = json.loads(stdout.decode())
                    
                    # Update order status based on script result
                    # The bot integration provides limited progress tracking, so we estimate based on status
                    status_mapping = {
                        "completed": "completed",
                        "running": "in-progress", 
                        "failed": "failed",
                        "pending": "in-progress"
                    }
                    
                    bot_status = result.get("status", "failed")
                    db_status = status_mapping.get(bot_status, "failed")
                    
                    update_data = {
                        "status": db_status,
                        "last_update": datetime.utcnow()
                    }
                    
                    # Handle completion
                    if bot_status == "completed":
                        update_data["completed_at"] = datetime.utcnow()
                    
                    if result.get("error"):
                        update_data["error_message"] = result["error"]
                        update_data["status"] = "failed"
                    
                    await db[Collections.ORDERS].update_one(
                        {"_id": ObjectId(order_data["id"])},
                        {"$set": update_data}
                    )
                    
                    logger.info("order_processing_result", 
                        order_id=order_data["id"],
                        status=result.get("status"),
                        error=result.get("error")
                    )
                    
                    return result
                    
                except json.JSONDecodeError as e:
                    logger.error("script_output_parse_error",
                        order_id=order_data["id"],
                        stdout=stdout.decode(),
                        error=str(e)
                    )
                    raise OrderProcessingError(f"Failed to parse script output: {e}")
            else:
                # Handle script error
                error_msg = stderr.decode().strip() or "Unknown script error"
                await db[Collections.ORDERS].update_one(
                    {"_id": ObjectId(order_data["id"])},
                    {
                        "$set": {
                            "status": "failed",
                            "error_message": error_msg,
                            "last_update": datetime.utcnow()
                        }
                    }
                )
                
                logger.error("script_execution_failed",
                    order_id=order_data["id"],
                    return_code=process.returncode,
                    stderr=error_msg
                )
                
                raise OrderProcessingError(f"Script execution failed: {error_msg}")
                
        except Exception as e:
            logger.error("order_processing_exception",
                order_id=order_data["id"],
                error=str(e)
            )
            
            # Update order status to failed
            db = Database.get_db()
            await db[Collections.ORDERS].update_one(
                {"_id": ObjectId(order_data["id"])},
                {
                    "$set": {
                        "status": "failed",
                        "error_message": str(e),
                        "last_update": datetime.utcnow()
                    }
                }
            )
            
            raise OrderProcessingError(f"Order processing failed: {e}")

    @staticmethod
    async def process_order_with_bot_backend(order_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process order using the bot backend instead of direct script execution"""
        try:
            from .bot_client import bot_client
            
            logger.info("sending_order_to_bot_backend", 
                order_id=order_data["id"],
                reddit_url=order_data["reddit_url"],
                upvotes=order_data["upvotes"]
            )
            
            # Update order status to in-progress
            db = Database.get_db()
            await db[Collections.ORDERS].update_one(
                {"_id": ObjectId(order_data["id"])},
                {"$set": {"status": "in-progress", "started_at": datetime.utcnow()}}
            )
            
            # Send order to bot backend
            bot_result = await bot_client.create_bot_order({
                "order_id": order_data["id"],
                "reddit_url": order_data["reddit_url"],
                "upvotes": order_data["upvotes"],
                "upvotes_per_minute": order_data["upvotes_per_minute"]
            })
            
            if bot_result["success"]:
                logger.info("order_sent_to_bot_backend", 
                    order_id=order_data["id"],
                    bot_status=bot_result["data"].get("status")
                )
                
                # Update order with initial bot response
                bot_data = bot_result["data"]
                update_data = {
                    "status": "processing",  # Bot backend is now handling it
                    "last_update": datetime.utcnow()
                }
                
                await db[Collections.ORDERS].update_one(
                    {"_id": ObjectId(order_data["id"])},
                    {"$set": update_data}
                )
                
                return {
                    "success": True,
                    "status": "processing"
                }
            else:
                # Handle bot backend error
                error_msg = bot_result.get("error", "Bot backend communication failed")
                
                await db[Collections.ORDERS].update_one(
                    {"_id": ObjectId(order_data["id"])},
                    {
                        "$set": {
                            "status": "failed",
                            "error_message": error_msg,
                            "last_update": datetime.utcnow()
                        }
                    }
                )
                
                logger.error("bot_backend_error", 
                    order_id=order_data["id"],
                    error=error_msg
                )
                
                return {
                    "success": False,
                    "status": "failed",
                    "error": error_msg
                }
                
        except Exception as e:
            error_msg = f"Bot backend processing error: {str(e)}"
            
            # Update order status to failed
            db = Database.get_db()
            await db[Collections.ORDERS].update_one(
                {"_id": ObjectId(order_data["id"])},
                {
                    "$set": {
                        "status": "failed",
                        "error_message": error_msg,
                        "last_update": datetime.utcnow()
                    }
                }
            )
            
            logger.error("order_processing_exception", 
                order_id=order_data["id"],
                error=str(e)
            )
            
            return {
                "success": False,
                "status": "failed", 
                "error": error_msg
            }

    @staticmethod
    async def update_order_status(
        order_id: str, 
        status: str, 
        error_message: str = None
    ) -> bool:
        """Update order status (called by bot backend status updates)"""
        try:
            db = Database.get_db()
            
            update_data = {
                "status": status,
                "last_update": datetime.utcnow()
            }
            
            if error_message is not None:
                update_data["error_message"] = error_message
            
            if status == "completed":
                update_data["completed_at"] = datetime.utcnow()
            elif status == "cancelled":
                update_data["cancelled_at"] = datetime.utcnow()
            
            result = await db[Collections.ORDERS].update_one(
                {"_id": ObjectId(order_id)},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                logger.info("order_status_updated", 
                    order_id=order_id,
                    status=status
                )
                return True
            else:
                logger.warning("order_not_found_for_update", order_id=order_id)
                return False
                
        except Exception as e:
            logger.error("update_order_status_failed", 
                order_id=order_id,
                error=str(e)
            )
            return False

    @staticmethod
    async def get_order_status(order_id: str) -> Optional[Dict[str, Any]]:
        """Get current order status"""
        try:
            db = Database.get_db()
            order = await db[Collections.ORDERS].find_one({"_id": ObjectId(order_id)})
            
            if not order:
                return None
                
            return {
                "id": str(order["_id"]),
                "status": order.get("status", "pending"),
                "total_upvotes": order.get("upvotes", 0),
                "error_message": order.get("error_message"),
                "created_at": order.get("created_at"),
                "started_at": order.get("started_at"),
                "completed_at": order.get("completed_at"),
                "last_update": order.get("last_update")
            }
            
        except Exception as e:
            logger.error("get_order_status_failed", 
                order_id=order_id,
                error=str(e)
            )
            return None

    @staticmethod
    async def get_user_orders(user_id: str) -> List[Order]:
        """Get all orders for a user with proper data conversion"""
        try:
            db = Database.get_db()
            cursor = db[Collections.ORDERS].find({"user_id": ObjectId(user_id)})
            orders_raw = await cursor.to_list(length=None)
            
            orders = []
            for order_doc in orders_raw:
                # Convert MongoDB document to Order model
                order_dict = {
                    "id": str(order_doc["_id"]),
                    "user_id": str(order_doc["user_id"]),
                    "reddit_url": order_doc["reddit_url"],
                    "upvotes": order_doc["upvotes"],
                    "upvotes_per_minute": order_doc.get("upvotes_per_minute", 1),
                    "type": order_doc.get("type", "one-time"),
                    "status": order_doc.get("status", "pending"),
                    "cost": order_doc["cost"],
                    "created_at": order_doc["created_at"],
                    "started_at": order_doc.get("started_at"),
                    "completed_at": order_doc.get("completed_at"),
                    "cancelled_at": order_doc.get("cancelled_at"),
                    "last_update": order_doc.get("last_update"),
                    "error_message": order_doc.get("error_message"),
                    "payment_id": order_doc.get("payment_id"),
                    "card_last4": order_doc.get("card_last4")
                }
                orders.append(Order(**order_dict))
            
            return orders
            
        except Exception as e:
            logger.error("get_user_orders_failed", 
                user_id=user_id,
                error=str(e)
            )
            raise OrderProcessingError(f"Failed to get user orders: {e}")

    @staticmethod
    async def get_user_order_count(user_id: str) -> int:
        """Get total number of orders for a user"""
        try:
            db = Database.get_db()
            return await db[Collections.ORDERS].count_documents({"user_id": ObjectId(user_id)})
        except Exception as e:
            logger.error("get_user_order_count_failed", error=str(e))
            raise

    @staticmethod
    async def get_user_active_order_count(user_id: str) -> int:
        """Get number of active orders for a user"""
        try:
            db = Database.get_db()
            return await db[Collections.ORDERS].count_documents({
                "user_id": ObjectId(user_id),
                "status": {"$in": ["pending", "in-progress"]}
            })
        except Exception as e:
            logger.error("get_user_active_order_count_failed", error=str(e))
            raise

    @staticmethod
    async def get_user_completed_order_count(user_id: str) -> int:
        """Get number of completed orders for a user"""
        try:
            db = Database.get_db()
            return await db[Collections.ORDERS].count_documents({
                "user_id": ObjectId(user_id),
                "status": "completed"
            })
        except Exception as e:
            logger.error("get_user_completed_order_count_failed", error=str(e))
            raise

    @staticmethod
    async def get_order_by_id(order_id: str) -> Optional[Order]:
        """
        Get a specific order by its ID
        
        Args:
            order_id: The order ID to retrieve
            
        Returns:
            Order object if found, None otherwise
        """
        try:
            db = Database.get_db()
            order_doc = await db[Collections.ORDERS].find_one({"_id": ObjectId(order_id)})
            
            if not order_doc:
                return None
            
            # Convert MongoDB document to Order model
            order_dict = {
                "id": str(order_doc["_id"]),
                "user_id": str(order_doc["user_id"]),
                "reddit_url": order_doc["reddit_url"],
                "upvotes": order_doc["upvotes"],
                "upvotes_per_minute": order_doc.get("upvotes_per_minute", 1),
                "type": order_doc.get("type", "one-time"),
                "status": order_doc.get("status", "pending"),
                "cost": order_doc["cost"],
                "created_at": order_doc["created_at"],
                "started_at": order_doc.get("started_at"),
                "completed_at": order_doc.get("completed_at"),
                "cancelled_at": order_doc.get("cancelled_at"),
                "last_update": order_doc.get("last_update"),
                "error_message": order_doc.get("error_message"),
                "payment_id": order_doc.get("payment_id"),
                "card_last4": order_doc.get("card_last4")
            }
            
            return Order(**order_dict)
            
        except Exception as e:
            logger.error("get_order_by_id_failed", 
                order_id=order_id,
                error=str(e)
            )
            return None
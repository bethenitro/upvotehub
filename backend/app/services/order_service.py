import subprocess
import json
import asyncio
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
            "paused_at": None,
            "last_update": datetime.utcnow(),
            "upvotes_processed": 0,
            "progress_percentage": 0.0,
            "error_message": None,
            "payment_id": None,
            "card_last4": None
        }
        
        # Insert into database
        result = await db[Collections.ORDERS].insert_one(order_dict)
        order_dict["id"] = str(result.inserted_id)
        order_dict["user_id"] = str(order_dict["user_id"])
        
        # Schedule order processing
        from ..utils.task_manager import task_manager
        await task_manager.schedule_order_processing(order_dict)
        
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
            
            # Run the script in a subprocess
            process = await asyncio.create_subprocess_exec(
                "python", "script.py",
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd="/Users/nikanyad/Documents/UpVote/upvote-integration/upvotehub/backend"
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
                    update_data = {
                        "status": "completed" if result.get("status") == "completed" else "in-progress",
                        "upvotes_processed": result.get("upvotes_done", 0),
                        "progress_percentage": result.get("progress_percentage", 0),
                        "last_update": datetime.utcnow()
                    }
                    
                    if result.get("status") == "completed":
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
                        upvotes_done=result.get("upvotes_done", 0),
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
                "upvotes_processed": order.get("upvotes_processed", 0),
                "total_upvotes": order.get("upvotes", 0),
                "progress_percentage": order.get("progress_percentage", 0),
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
                    "paused_at": order_doc.get("paused_at"),
                    "last_update": order_doc.get("last_update"),
                    "upvotes_processed": order_doc.get("upvotes_processed", 0),
                    "progress_percentage": order_doc.get("progress_percentage", 0.0),
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
import subprocess
import json
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
    async def create_order(user_id: str, order_data: Dict[str, Any]) -> OrderInDB:
        db = Database.get_db()
        
        # Calculate cost
        cost = order_data["upvotes"] * 0.8
        
        # Create order document
        order = OrderInDB(
            user_id=ObjectId(user_id),
            reddit_url=order_data["redditUrl"],
            upvotes=order_data["upvotes"],
            upvotes_per_minute=order_data.get("upvotes_per_minute", 1),
            cost=cost
        )
        
        # Insert into database
        result = await db[Collections.ORDERS].insert_one(order.dict(by_alias=True))
        order.id = result.inserted_id
        
        # Start order processing in background
        await OrderService._process_order(order)
        
        return order

    @staticmethod
    async def _process_order(order: OrderInDB) -> None:
        """Process order using the external script"""
        try:
            # Prepare script input
            script_input = {
                "order_id": str(order.id),
                "reddit_url": order.reddit_url,
                "upvotes": order.upvotes,
                "upvotes_per_minute": order.upvotes_per_minute
            }
            
            # Run the script
            process = subprocess.Popen(
                ["python", settings.ORDER_SCRIPT_PATH],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Send input to script
            stdout, stderr = process.communicate(input=json.dumps(script_input))
            
            if process.returncode == 0:
                # Parse script output
                result = json.loads(stdout)
                
                # Update order status
                db = Database.get_db()
                update_data = {
                    "status": result["status"],
                    "completed_at": datetime.utcnow() if result["status"] == "completed" else None,
                    "error_message": result.get("error")
                }
                
                await db[Collections.ORDERS].update_one(
                    {"_id": order.id},
                    {"$set": update_data}
                )
                
                logger.info("order_processed", 
                    order_id=str(order.id),
                    status=result["status"],
                    error=result.get("error")
                )
            else:
                # Handle script error
                error_msg = stderr.strip() or "Unknown error occurred"
                db = Database.get_db()
                await db[Collections.ORDERS].update_one(
                    {"_id": order.id},
                    {
                        "$set": {
                            "status": "failed",
                            "error_message": error_msg
                        }
                    }
                )
                
                logger.error("order_processing_failed",
                    order_id=str(order.id),
                    error=error_msg
                )
                
        except Exception as e:
            logger.error("order_processing_exception",
                order_id=str(order.id),
                error=str(e)
            )
            
            # Update order status to failed
            db = Database.get_db()
            await db[Collections.ORDERS].update_one(
                {"_id": order.id},
                {
                    "$set": {
                        "status": "failed",
                        "error_message": str(e)
                    }
                }
            )

    @staticmethod
    async def get_user_orders(user_id: str) -> list:
        db = Database.get_db()
        cursor = db[Collections.ORDERS].find({"user_id": ObjectId(user_id)})
        return await cursor.to_list(length=None)

    @staticmethod
    async def get_user_order_count(user_id: str) -> int:
        """Get total number of orders for a user"""
        try:
            db = Database.get_db()
            return await db[Collections.ORDERS].count_documents({"user_id": user_id})
        except Exception as e:
            logger.error("get_user_order_count_failed", error=str(e))
            raise

    @staticmethod
    async def get_user_active_order_count(user_id: str) -> int:
        """Get number of active orders for a user"""
        try:
            db = Database.get_db()
            return await db[Collections.ORDERS].count_documents({
                "user_id": user_id,
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
                "user_id": user_id,
                "status": "completed"
            })
        except Exception as e:
            logger.error("get_user_completed_order_count_failed", error=str(e))
            raise 
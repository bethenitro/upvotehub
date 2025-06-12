import subprocess
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from bson import ObjectId
from ..config.database import Database, Collections
from ..config.settings import get_settings
from ..utils.logger import logger
from ..models.order import OrderInDB, AutoOrderInDB, Order, AutoOrder, OrderCreate, AutoOrderCreate
from ..utils.exceptions import OrderProcessingError, AutoOrderError

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
            cost=cost
        )
        
        # Insert into database
        result = await db[Collections.ORDERS].insert_one(order.dict(by_alias=True))
        order.id = result.inserted_id
        
        # Start order processing in background
        await OrderService._process_order(order)
        
        return order

    @staticmethod
    async def create_auto_order(user_id: str, order: AutoOrderCreate) -> AutoOrder:
        """Create a new auto order"""
        try:
            db = Database.get_db()
            now = datetime.utcnow()

            # Calculate next run time
            next_run = now
            if order.frequency == "daily":
                next_run += timedelta(days=1)
            elif order.frequency == "weekly":
                next_run += timedelta(weeks=1)
            else:  # monthly
                next_run += timedelta(days=30)

            auto_order = AutoOrderInDB(
                id=str(ObjectId()),
                user_id=user_id,
                reddit_url=order.reddit_url,
                upvotes=order.upvotes,
                type="auto",
                frequency=order.frequency,
                status="active",
                created_at=now,
                next_run_at=next_run
            )

            result = await db[Collections.AUTO_ORDERS].insert_one(auto_order.dict())
            created_order = await db[Collections.AUTO_ORDERS].find_one({"_id": result.inserted_id})
            
            logger.info("auto_order_created",
                user_id=user_id,
                order_id=str(created_order["_id"])
            )

            return AutoOrder(**created_order)

        except Exception as e:
            logger.error("create_auto_order_failed", error=str(e))
            raise AutoOrderError(str(e))

    @staticmethod
    async def _process_order(order: OrderInDB) -> None:
        """Process order using the external script"""
        try:
            # Prepare script input
            script_input = {
                "order_id": str(order.id),
                "reddit_url": order.reddit_url,
                "upvotes": order.upvotes
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
    async def get_user_auto_orders(user_id: str) -> List[AutoOrder]:
        """Get all auto orders for a user"""
        try:
            db = Database.get_db()
            orders = await db[Collections.AUTO_ORDERS].find(
                {"user_id": user_id}
            ).to_list(None)
            
            return [AutoOrder(**order) for order in orders]

        except Exception as e:
            logger.error("get_user_auto_orders_failed", error=str(e))
            raise AutoOrderError(str(e))

    @staticmethod
    async def cancel_auto_order(user_id: str, order_id: str) -> bool:
        db = Database.get_db()
        result = await db[Collections.AUTO_ORDERS].update_one(
            {
                "_id": ObjectId(order_id),
                "user_id": ObjectId(user_id)
            },
            {"$set": {"status": "cancelled"}}
        )
        return result.modified_count > 0

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

    @staticmethod
    async def pause_auto_order(user_id: str, order_id: str) -> AutoOrder:
        """Pause an auto order"""
        try:
            db = Database.get_db()
            now = datetime.utcnow()

            result = await db[Collections.AUTO_ORDERS].update_one(
                {
                    "_id": ObjectId(order_id),
                    "user_id": user_id,
                    "status": "active"
                },
                {
                    "$set": {
                        "status": "paused",
                        "paused_at": now
                    }
                }
            )

            if result.modified_count == 0:
                raise AutoOrderError("Order not found or already paused")

            updated_order = await db[Collections.AUTO_ORDERS].find_one({"_id": ObjectId(order_id)})
            
            logger.info("auto_order_paused",
                user_id=user_id,
                order_id=order_id
            )

            return AutoOrder(**updated_order)

        except Exception as e:
            logger.error("pause_auto_order_failed", error=str(e))
            raise AutoOrderError(str(e))

    @staticmethod
    async def resume_auto_order(user_id: str, order_id: str) -> AutoOrder:
        """Resume a paused auto order"""
        try:
            db = Database.get_db()
            now = datetime.utcnow()

            # Get the order to calculate next run time
            order = await db[Collections.AUTO_ORDERS].find_one({
                "_id": ObjectId(order_id),
                "user_id": user_id
            })

            if not order:
                raise AutoOrderError("Order not found")

            # Calculate next run time
            next_run = now
            if order["frequency"] == "daily":
                next_run += timedelta(days=1)
            elif order["frequency"] == "weekly":
                next_run += timedelta(weeks=1)
            else:  # monthly
                next_run += timedelta(days=30)

            result = await db[Collections.AUTO_ORDERS].update_one(
                {
                    "_id": ObjectId(order_id),
                    "user_id": user_id,
                    "status": "paused"
                },
                {
                    "$set": {
                        "status": "active",
                        "paused_at": None,
                        "next_run_at": next_run
                    }
                }
            )

            if result.modified_count == 0:
                raise AutoOrderError("Order not found or not paused")

            updated_order = await db[Collections.AUTO_ORDERS].find_one({"_id": ObjectId(order_id)})
            
            logger.info("auto_order_resumed",
                user_id=user_id,
                order_id=order_id
            )

            return AutoOrder(**updated_order)

        except Exception as e:
            logger.error("resume_auto_order_failed", error=str(e))
            raise AutoOrderError(str(e)) 
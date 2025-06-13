import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from ..config.database import Database, Collections
from ..utils.logger import logger
from ..services.order_service import OrderService
from bson import ObjectId

class TaskManager:
    def __init__(self):
        self.tasks: Dict[str, asyncio.Task] = {}
        self.running = False

    async def start(self):
        """Start all background tasks"""
        if self.running:
            return

        self.running = True
        self.tasks['payment_status_checker'] = asyncio.create_task(
            self._payment_status_checker()
        )
        self.tasks['order_status_updater'] = asyncio.create_task(
            self._order_status_updater()
        )

        logger.info("background_tasks_started")

    async def stop(self):
        """Stop all background tasks"""
        if not self.running:
            return

        self.running = False
        for task in self.tasks.values():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        logger.info("background_tasks_stopped")

    async def _payment_status_checker(self):
        """Check and update payment statuses"""
        while self.running:
            try:
                db = Database.get_db()
                now = datetime.utcnow()

                # Find pending payments older than 1 hour
                cursor = db[Collections.PAYMENTS].find({
                    "status": "pending",
                    "created_at": {"$lte": now - timedelta(hours=1)}
                })

                async for payment in cursor:
                    try:
                        # Check payment status (implement your payment provider logic here)
                        # For now, we'll just mark it as failed
                        await db[Collections.PAYMENTS].update_one(
                            {"_id": payment["_id"]},
                            {
                                "$set": {
                                    "status": "failed",
                                    "error_message": "Payment timeout"
                                }
                            }
                        )

                        logger.info("payment_status_updated",
                            payment_id=str(payment["_id"]),
                            status="failed"
                        )

                    except Exception as e:
                        logger.error("payment_status_check_failed",
                            payment_id=str(payment["_id"]),
                            error=str(e)
                        )

            except Exception as e:
                logger.error("payment_status_checker_error", error=str(e))

            await asyncio.sleep(300)  # Check every 5 minutes

    async def _order_status_updater(self):
        """Update order statuses based on script output"""
        while self.running:
            try:
                db = Database.get_db()
                now = datetime.utcnow()

                # Find in-progress orders older than 30 minutes
                cursor = db[Collections.ORDERS].find({
                    "status": "in-progress",
                    "created_at": {"$lte": now - timedelta(minutes=30)}
                })

                async for order in cursor:
                    try:
                        # Check order status (implement your script output checking logic here)
                        # For now, we'll just mark it as failed
                        await db[Collections.ORDERS].update_one(
                            {"_id": order["_id"]},
                            {
                                "$set": {
                                    "status": "failed",
                                    "error_message": "Order processing timeout"
                                }
                            }
                        )

                        logger.info("order_status_updated",
                            order_id=str(order["_id"]),
                            status="failed"
                        )

                    except Exception as e:
                        logger.error("order_status_update_failed",
                            order_id=str(order["_id"]),
                            error=str(e)
                        )

            except Exception as e:
                logger.error("order_status_updater_error", error=str(e))

            await asyncio.sleep(300)  # Check every 5 minutes

# Global task manager instance
task_manager = TaskManager() 
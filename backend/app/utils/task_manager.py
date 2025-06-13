import asyncio
import queue
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from ..config.database import Database, Collections
from ..utils.logger import logger
from bson import ObjectId

class TaskManager:
    def __init__(self):
        self.tasks: Dict[str, asyncio.Task] = {}
        self.running = False
        self.order_queue: asyncio.Queue = asyncio.Queue()
        self.processing_orders: Dict[str, asyncio.Task] = {}

    async def start(self):
        """Start all background tasks"""
        if self.running:
            return

        self.running = True
        
        # Start background tasks
        self.tasks['payment_status_checker'] = asyncio.create_task(
            self._payment_status_checker()
        )
        self.tasks['order_status_updater'] = asyncio.create_task(
            self._order_status_updater()
        )
        self.tasks['order_processor'] = asyncio.create_task(
            self._order_processor()
        )
        self.tasks['queue_monitor'] = asyncio.create_task(
            self._queue_monitor()
        )

        # Recover any pending orders from database
        await self._recover_pending_orders()

        logger.info("background_tasks_started")

    async def stop(self):
        """Stop all background tasks"""
        if not self.running:
            return

        self.running = False
        
        # Cancel all processing orders
        for task in self.processing_orders.values():
            task.cancel()
            
        # Cancel all background tasks
        for task in self.tasks.values():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        logger.info("background_tasks_stopped")

    async def schedule_order_processing(self, order_data: Dict[str, Any]):
        """Add order to processing queue"""
        try:
            await self.order_queue.put(order_data)
            logger.info("order_scheduled", 
                order_id=order_data["id"],
                queue_size=self.order_queue.qsize()
            )
        except Exception as e:
            logger.error("order_scheduling_failed", 
                order_id=order_data["id"],
                error=str(e)
            )

    async def _recover_pending_orders(self):
        """Recover pending orders from database on startup"""
        try:
            db = Database.get_db()
            cursor = db[Collections.ORDERS].find({
                "status": {"$in": ["pending", "in-progress"]}
            })
            
            count = 0
            async for order in cursor:
                order_data = {
                    "id": str(order["_id"]),
                    "reddit_url": order["reddit_url"],
                    "upvotes": order["upvotes"],
                    "upvotes_per_minute": order["upvotes_per_minute"]
                }
                await self.order_queue.put(order_data)
                count += 1
                
            logger.info("pending_orders_recovered", count=count)
            
        except Exception as e:
            logger.error("order_recovery_failed", error=str(e))

    async def _order_processor(self):
        """Main order processor that handles the queue"""
        while self.running:
            try:
                # Get order from queue with timeout
                try:
                    order_data = await asyncio.wait_for(
                        self.order_queue.get(), 
                        timeout=1.0
                    )
                except asyncio.TimeoutError:
                    continue
                
                # Process order in background task
                order_id = order_data["id"]
                if order_id not in self.processing_orders:
                    self.processing_orders[order_id] = asyncio.create_task(
                        self._process_single_order(order_data)
                    )
                    
            except Exception as e:
                logger.error("order_processor_error", error=str(e))
                await asyncio.sleep(1)

    async def _process_single_order(self, order_data: Dict[str, Any]):
        """Process a single order"""
        order_id = order_data["id"]
        try:
            from ..services.order_service import OrderService
            result = await OrderService.process_order_with_script(order_data)
            
            logger.info("order_processing_completed", 
                order_id=order_id,
                result=result
            )
            
        except Exception as e:
            logger.error("single_order_processing_failed", 
                order_id=order_id,
                error=str(e)
            )
        finally:
            # Remove from processing orders
            if order_id in self.processing_orders:
                del self.processing_orders[order_id]

    async def _queue_monitor(self):
        """Monitor queue status and processing orders"""
        while self.running:
            try:
                queue_size = self.order_queue.qsize()
                processing_count = len(self.processing_orders)
                
                if queue_size > 0 or processing_count > 0:
                    logger.info("queue_status", 
                        queue_size=queue_size,
                        processing_count=processing_count
                    )
                
                # Clean up completed processing tasks
                completed_orders = []
                for order_id, task in self.processing_orders.items():
                    if task.done():
                        completed_orders.append(order_id)
                        
                for order_id in completed_orders:
                    del self.processing_orders[order_id]
                    
            except Exception as e:
                logger.error("queue_monitor_error", error=str(e))
                
            await asyncio.sleep(30)  # Monitor every 30 seconds

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
        """Update order statuses and handle stale orders"""
        while self.running:
            try:
                db = Database.get_db()
                now = datetime.utcnow()

                # Find in-progress orders older than 1 hour (timeout)
                cursor = db[Collections.ORDERS].find({
                    "status": "in-progress",
                    "started_at": {"$lte": now - timedelta(hours=1)}
                })

                async for order in cursor:
                    try:
                        # Mark timed out orders as failed
                        await db[Collections.ORDERS].update_one(
                            {"_id": order["_id"]},
                            {
                                "$set": {
                                    "status": "failed",
                                    "error_message": "Order processing timeout (1 hour)",
                                    "last_update": now
                                }
                            }
                        )

                        logger.warning("order_timed_out",
                            order_id=str(order["_id"]),
                            started_at=order.get("started_at")
                        )

                    except Exception as e:
                        logger.error("order_timeout_update_failed",
                            order_id=str(order["_id"]),
                            error=str(e)
                        )

                # Find orders stuck in pending for more than 10 minutes
                cursor = db[Collections.ORDERS].find({
                    "status": "pending",
                    "created_at": {"$lte": now - timedelta(minutes=10)}
                })

                async for order in cursor:
                    try:
                        # Re-queue stuck pending orders
                        order_data = {
                            "id": str(order["_id"]),
                            "reddit_url": order["reddit_url"],
                            "upvotes": order["upvotes"],
                            "upvotes_per_minute": order["upvotes_per_minute"]
                        }
                        
                        await self.schedule_order_processing(order_data)
                        
                        logger.info("stuck_order_requeued",
                            order_id=str(order["_id"])
                        )

                    except Exception as e:
                        logger.error("stuck_order_requeue_failed",
                            order_id=str(order["_id"]),
                            error=str(e)
                        )

            except Exception as e:
                logger.error("order_status_updater_error", error=str(e))

            await asyncio.sleep(300)  # Check every 5 minutes

# Global task manager instance
task_manager = TaskManager() 
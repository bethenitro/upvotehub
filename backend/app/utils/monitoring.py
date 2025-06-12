from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from ..config.database import Database, Collections
from ..utils.logger import logger

class MetricsCollector:
    def __init__(self):
        self.metrics: Dict[str, Any] = {
            "order_success_rate": 0.0,
            "payment_success_rate": 0.0,
            "api_response_times": [],
            "active_users": 0,
            "total_orders": 0,
            "total_payments": 0,
            "total_revenue": 0.0
        }

    async def collect_metrics(self):
        """Collect all metrics"""
        try:
            db = Database.get_db()
            now = datetime.utcnow()
            last_24h = now - timedelta(hours=24)

            # Order metrics
            total_orders = await db[Collections.ORDERS].count_documents({})
            successful_orders = await db[Collections.ORDERS].count_documents({
                "status": "completed"
            })
            self.metrics["total_orders"] = total_orders
            self.metrics["order_success_rate"] = (
                successful_orders / total_orders if total_orders > 0 else 0.0
            )

            # Payment metrics
            total_payments = await db[Collections.PAYMENTS].count_documents({})
            successful_payments = await db[Collections.PAYMENTS].count_documents({
                "status": "completed"
            })
            self.metrics["total_payments"] = total_payments
            self.metrics["payment_success_rate"] = (
                successful_payments / total_payments if total_payments > 0 else 0.0
            )

            # Revenue metrics
            revenue_pipeline = [
                {
                    "$match": {
                        "status": "completed",
                        "created_at": {"$gte": last_24h}
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "total": {"$sum": "$amount"}
                    }
                }
            ]
            revenue_result = await db[Collections.PAYMENTS].aggregate(revenue_pipeline).to_list(1)
            self.metrics["total_revenue"] = revenue_result[0]["total"] if revenue_result else 0.0

            # Active users
            active_users = await db[Collections.USERS].count_documents({
                "last_login": {"$gte": last_24h}
            })
            self.metrics["active_users"] = active_users

            logger.info("metrics_collected", metrics=self.metrics)

        except Exception as e:
            logger.error("metrics_collection_failed", error=str(e))

    def record_api_response_time(self, endpoint: str, response_time: float):
        """Record API response time"""
        self.metrics["api_response_times"].append({
            "endpoint": endpoint,
            "response_time": response_time,
            "timestamp": datetime.utcnow()
        })

        # Keep only last 1000 records
        if len(self.metrics["api_response_times"]) > 1000:
            self.metrics["api_response_times"] = self.metrics["api_response_times"][-1000:]

    def get_average_response_time(self, endpoint: Optional[str] = None) -> float:
        """Get average API response time for an endpoint or all endpoints"""
        times = self.metrics["api_response_times"]
        if endpoint:
            times = [t for t in times if t["endpoint"] == endpoint]
        
        if not times:
            return 0.0
        
        return sum(t["response_time"] for t in times) / len(times)

    def get_metrics(self) -> Dict[str, Any]:
        """Get all current metrics"""
        return self.metrics

# Global metrics collector instance
metrics_collector = MetricsCollector() 
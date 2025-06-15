from datetime import datetime, timedelta
from typing import Dict, Any, List
from bson import ObjectId
from ..config.database import Database, Collections
from ..utils.logger import logger
from ..services.user_service import UserService
from ..services.order_service import OrderService
from ..services.payment_service import PaymentService
from ..utils.monitoring import metrics_collector


class AdminService:
    """Service for admin-specific operations and statistics"""

    @staticmethod
    async def get_admin_stats() -> Dict[str, Any]:
        """Get comprehensive admin statistics"""
        try:
            db = Database.get_db()
            now = datetime.utcnow()
            
            # Time periods for different metrics
            last_24h = now - timedelta(hours=24)
            last_7d = now - timedelta(days=7)
            last_30d = now - timedelta(days=30)
            
            # Basic counts
            total_users = await db[Collections.USERS].count_documents({})
            total_orders = await db[Collections.ORDERS].count_documents({})
            total_payments = await db[Collections.PAYMENTS].count_documents({})
            
            # Active users (logged in within last 7 days)
            active_users = await db[Collections.USERS].count_documents({
                "last_login": {"$gte": last_7d}
            })
            
            # Order stats
            orders_last_24h = await db[Collections.ORDERS].count_documents({
                "created_at": {"$gte": last_24h}
            })
            orders_last_7d = await db[Collections.ORDERS].count_documents({
                "created_at": {"$gte": last_7d}
            })
            orders_last_30d = await db[Collections.ORDERS].count_documents({
                "created_at": {"$gte": last_30d}
            })
            
            # Order status breakdown
            order_status_counts = {}
            for status in ["pending", "in-progress", "completed", "failed", "cancelled"]:
                count = await db[Collections.ORDERS].count_documents({"status": status})
                order_status_counts[status] = count
            
            # Payment stats
            payments_last_24h = await db[Collections.PAYMENTS].count_documents({
                "created_at": {"$gte": last_24h}
            })
            payments_last_7d = await db[Collections.PAYMENTS].count_documents({
                "created_at": {"$gte": last_7d}
            })
            payments_last_30d = await db[Collections.PAYMENTS].count_documents({
                "created_at": {"$gte": last_30d}
            })
            
            # Payment status breakdown
            payment_status_counts = {}
            for status in ["pending", "completed", "failed", "cancelled"]:
                count = await db[Collections.PAYMENTS].count_documents({"status": status})
                payment_status_counts[status] = count
            
            # Revenue calculations - based on completed orders (actual revenue)
            # Total revenue from all completed orders
            total_revenue_pipeline = [
                {"$match": {"status": "completed"}},
                {"$group": {"_id": None, "total": {"$sum": "$cost"}}}
            ]
            total_revenue_result = await db[Collections.ORDERS].aggregate(total_revenue_pipeline).to_list(1)
            total_revenue = total_revenue_result[0]["total"] if total_revenue_result else 0.0
            
            # Revenue from completed orders in last 24h
            revenue_last_24h_pipeline = [
                {"$match": {"status": "completed", "created_at": {"$gte": last_24h}}},
                {"$group": {"_id": None, "total": {"$sum": "$cost"}}}
            ]
            revenue_24h_result = await db[Collections.ORDERS].aggregate(revenue_last_24h_pipeline).to_list(1)
            revenue_last_24h = revenue_24h_result[0]["total"] if revenue_24h_result else 0.0
            
            # Revenue from completed orders in last 7d
            revenue_last_7d_pipeline = [
                {"$match": {"status": "completed", "created_at": {"$gte": last_7d}}},
                {"$group": {"_id": None, "total": {"$sum": "$cost"}}}
            ]
            revenue_7d_result = await db[Collections.ORDERS].aggregate(revenue_last_7d_pipeline).to_list(1)
            revenue_last_7d = revenue_7d_result[0]["total"] if revenue_7d_result else 0.0
            
            # Revenue from completed orders in last 30d
            revenue_last_30d_pipeline = [
                {"$match": {"status": "completed", "created_at": {"$gte": last_30d}}},
                {"$group": {"_id": None, "total": {"$sum": "$cost"}}}
            ]
            revenue_30d_result = await db[Collections.ORDERS].aggregate(revenue_last_30d_pipeline).to_list(1)
            revenue_last_30d = revenue_30d_result[0]["total"] if revenue_30d_result else 0.0
            
            # Also calculate top-up revenue (money coming into the system)
            topup_revenue_pipeline = [
                {"$match": {"status": "completed"}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]
            topup_revenue_result = await db[Collections.PAYMENTS].aggregate(topup_revenue_pipeline).to_list(1)
            total_topups = topup_revenue_result[0]["total"] if topup_revenue_result else 0.0
            
            # Success rates
            total_completed_orders = order_status_counts.get("completed", 0)
            order_success_rate = (total_completed_orders / total_orders * 100) if total_orders > 0 else 0
            
            total_completed_payments = payment_status_counts.get("completed", 0)
            payment_success_rate = (total_completed_payments / total_payments * 100) if total_payments > 0 else 0
            
            # Payment method breakdown
            payment_methods = await db[Collections.PAYMENTS].aggregate([
                {"$group": {"_id": "$method", "count": {"$sum": 1}, "total_amount": {"$sum": "$amount"}}}
            ]).to_list(None)
            
            payment_methods_stats = {}
            for method in payment_methods:
                payment_methods_stats[method["_id"]] = {
                    "count": method["count"],
                    "total_amount": method["total_amount"]
                }
            
            # Recent activity (last 10 orders and payments)
            recent_orders = await db[Collections.ORDERS].find({}).sort("created_at", -1).limit(10).to_list(10)
            recent_payments = await db[Collections.PAYMENTS].find({}).sort("created_at", -1).limit(10).to_list(10)
            
            # Convert ObjectIds to strings for JSON serialization
            for order in recent_orders:
                order["id"] = str(order["_id"])
                order["user_id"] = str(order["user_id"])
                order.pop("_id", None)
            
            for payment in recent_payments:
                payment["id"] = str(payment["_id"])
                payment["user_id"] = str(payment["user_id"])
                payment.pop("_id", None)
            
            # System metrics from monitoring
            await metrics_collector.collect_metrics()
            system_metrics = metrics_collector.get_metrics()
            
            return {
                "overview": {
                    "total_users": total_users,
                    "active_users": active_users,
                    "total_orders": total_orders,
                    "total_payments": total_payments,
                    "total_revenue": round(total_revenue, 2),  # From completed orders
                    "total_topups": round(total_topups, 2),   # From completed payments
                    "order_success_rate": round(order_success_rate, 2),
                    "payment_success_rate": round(payment_success_rate, 2)
                },
                "time_based_stats": {
                    "last_24h": {
                        "orders": orders_last_24h,
                        "payments": payments_last_24h,
                        "revenue": round(revenue_last_24h, 2)
                    },
                    "last_7d": {
                        "orders": orders_last_7d,
                        "payments": payments_last_7d,
                        "revenue": round(revenue_last_7d, 2)
                    },
                    "last_30d": {
                        "orders": orders_last_30d,
                        "payments": payments_last_30d,
                        "revenue": round(revenue_last_30d, 2)
                    }
                },
                "status_breakdown": {
                    "orders": order_status_counts,
                    "payments": payment_status_counts
                },
                "payment_methods": payment_methods_stats,
                "recent_activity": {
                    "orders": recent_orders,
                    "payments": recent_payments
                },
                "system_metrics": system_metrics,
                "generated_at": now.isoformat()
            }
            
        except Exception as e:
            logger.error("get_admin_stats_failed", error=str(e))
            raise
    
    @staticmethod
    async def get_user_management_data() -> Dict[str, Any]:
        """Get data for user management"""
        try:
            db = Database.get_db()
            
            # Get users with their stats
            users_pipeline = [
                {
                    "$lookup": {
                        "from": "orders",
                        "localField": "_id",
                        "foreignField": "user_id",
                        "as": "orders"
                    }
                },
                {
                    "$lookup": {
                        "from": "payments",
                        "localField": "_id",
                        "foreignField": "user_id",
                        "as": "payments"
                    }
                },
                {
                    "$addFields": {
                        "total_orders": {"$size": "$orders"},
                        "total_payments": {"$size": "$payments"},
                        "total_spent": {
                            "$sum": {
                                "$map": {
                                    "input": {"$filter": {"input": "$payments", "cond": {"$eq": ["$$this.status", "completed"]}}},
                                    "as": "payment",
                                    "in": "$$payment.amount"
                                }
                            }
                        }
                    }
                },
                {
                    "$project": {
                        "username": 1,
                        "email": 1,
                        "credits": 1,
                        "created_at": 1,
                        "last_login": 1,
                        "total_orders": 1,
                        "total_payments": 1,
                        "total_spent": 1
                    }
                },
                {"$sort": {"created_at": -1}}
            ]
            
            users_raw = await db[Collections.USERS].aggregate(users_pipeline).to_list(None)
            
            # Convert ObjectIds to strings for JSON serialization
            users = []
            for user in users_raw:
                user_dict = {
                    "id": str(user["_id"]) if "_id" in user else user.get("id"),
                    "username": user.get("username"),
                    "email": user.get("email"),
                    "credits": user.get("credits", 0),
                    "created_at": user.get("created_at"),
                    "last_login": user.get("last_login"),
                    "total_orders": user.get("total_orders", 0),
                    "total_payments": user.get("total_payments", 0),
                    "total_spent": user.get("total_spent", 0)
                }
                users.append(user_dict)
            
            return {
                "users": users,
                "total_count": len(users)
            }
            
        except Exception as e:
            logger.error("get_user_management_data_failed", error=str(e))
            raise
    
    @staticmethod
    async def upload_bot_config(config_data: Dict[str, Any]) -> bool:
        """Upload and store bot configuration"""
        try:
            db = Database.get_db()
            
            config_document = {
                "config_data": config_data,
                "uploaded_at": datetime.utcnow(),
                "version": config_data.get("version", "1.0"),
                "active": True
            }
            
            # Deactivate previous configs
            await db[Collections.BOT_CONFIGS].update_many(
                {"active": True},
                {"$set": {"active": False}}
            )
            
            # Insert new config
            result = await db[Collections.BOT_CONFIGS].insert_one(config_document)
            
            logger.info("bot_config_uploaded", config_id=str(result.inserted_id))
            return True
            
        except Exception as e:
            logger.error("upload_bot_config_failed", error=str(e))
            raise
    
    @staticmethod
    async def get_bot_config() -> Dict[str, Any]:
        """Get the current active bot configuration"""
        try:
            db = Database.get_db()
            
            config = await db[Collections.BOT_CONFIGS].find_one(
                {"active": True},
                sort=[("uploaded_at", -1)]
            )
            
            if config:
                config["id"] = str(config["_id"])
                config.pop("_id", None)
                return config
            
            return {}
            
        except Exception as e:
            logger.error("get_bot_config_failed", error=str(e))
            raise

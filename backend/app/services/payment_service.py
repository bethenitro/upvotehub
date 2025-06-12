from datetime import datetime
from typing import List, Dict, Any
from ..models.payment import Payment, PaymentCreate, PaymentMethod
from ..config.database import Database, Collections
from ..utils.logger import logger
from ..utils.exceptions import PaymentProcessingError, InvalidPaymentMethodError
from bson import ObjectId

class PaymentService:
    @staticmethod
    async def add_payment_method(user_id: str, payment_method: PaymentMethod) -> PaymentMethod:
        """Add a new payment method for a user"""
        try:
            db = Database.get_db()
            now = datetime.utcnow()

            # If this is the first payment method, set it as default
            existing_methods = await db[Collections.PAYMENT_METHODS].count_documents({
                "user_id": user_id
            })
            is_default = existing_methods == 0

            payment_method_dict = payment_method.dict()
            payment_method_dict.update({
                "id": str(ObjectId()),
                "user_id": user_id,
                "is_default": is_default,
                "last_used": now
            })

            result = await db[Collections.PAYMENT_METHODS].insert_one(payment_method_dict)
            created_method = await db[Collections.PAYMENT_METHODS].find_one({"_id": result.inserted_id})
            
            logger.info("payment_method_added",
                user_id=user_id,
                method_id=str(created_method["_id"])
            )

            return PaymentMethod(**created_method)

        except Exception as e:
            logger.error("add_payment_method_failed", error=str(e))
            raise PaymentProcessingError(str(e))

    @staticmethod
    async def get_user_payment_methods(user_id: str) -> List[PaymentMethod]:
        """Get all payment methods for a user"""
        try:
            db = Database.get_db()
            methods = await db[Collections.PAYMENT_METHODS].find(
                {"user_id": user_id}
            ).to_list(None)
            
            return [PaymentMethod(**method) for method in methods]

        except Exception as e:
            logger.error("get_user_payment_methods_failed", error=str(e))
            raise PaymentProcessingError(str(e))

    @staticmethod
    async def delete_payment_method(user_id: str, method_id: str) -> bool:
        """Delete a payment method"""
        try:
            db = Database.get_db()

            # Check if this is the default payment method
            method = await db[Collections.PAYMENT_METHODS].find_one({
                "_id": ObjectId(method_id),
                "user_id": user_id
            })

            if not method:
                raise InvalidPaymentMethodError("Payment method not found")

            if method["is_default"]:
                # Find another method to set as default
                other_method = await db[Collections.PAYMENT_METHODS].find_one({
                    "user_id": user_id,
                    "_id": {"$ne": ObjectId(method_id)}
                })

                if other_method:
                    await db[Collections.PAYMENT_METHODS].update_one(
                        {"_id": other_method["_id"]},
                        {"$set": {"is_default": True}}
                    )

            result = await db[Collections.PAYMENT_METHODS].delete_one({
                "_id": ObjectId(method_id),
                "user_id": user_id
            })

            if result.deleted_count == 0:
                raise InvalidPaymentMethodError("Payment method not found")

            logger.info("payment_method_deleted",
                user_id=user_id,
                method_id=method_id
            )

            return True

        except Exception as e:
            logger.error("delete_payment_method_failed", error=str(e))
            raise PaymentProcessingError(str(e))

    @staticmethod
    async def set_default_payment_method(user_id: str, method_id: str) -> PaymentMethod:
        """Set a payment method as default"""
        try:
            db = Database.get_db()

            # First, unset default for all user's payment methods
            await db[Collections.PAYMENT_METHODS].update_many(
                {"user_id": user_id},
                {"$set": {"is_default": False}}
            )

            # Then set the specified method as default
            result = await db[Collections.PAYMENT_METHODS].update_one(
                {
                    "_id": ObjectId(method_id),
                    "user_id": user_id
                },
                {
                    "$set": {
                        "is_default": True,
                        "last_used": datetime.utcnow()
                    }
                }
            )

            if result.modified_count == 0:
                raise InvalidPaymentMethodError("Payment method not found")

            updated_method = await db[Collections.PAYMENT_METHODS].find_one({"_id": ObjectId(method_id)})
            
            logger.info("default_payment_method_updated",
                user_id=user_id,
                method_id=method_id
            )

            return PaymentMethod(**updated_method)

        except Exception as e:
            logger.error("set_default_payment_method_failed", error=str(e))
            raise PaymentProcessingError(str(e)) 
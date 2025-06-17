from datetime import datetime
from typing import List, Dict, Any
from ..models.payment import Payment, PaymentCreate, PaymentMethod
from ..config.database import Database, Collections
from ..utils.logger import logger
from ..utils.exceptions import PaymentProcessingError, InvalidPaymentMethodError
from .cryptomus_service import get_cryptomus_service
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

    @staticmethod
    async def create_crypto_payment(user_id: str, payment: PaymentCreate) -> Payment:
        """Create a cryptocurrency payment using Cryptomus Personal API"""
        try:
            db = Database.get_db()
            
            # Generate order ID for tracking
            order_id = str(ObjectId())
            
            # Create Cryptomus payment
            cryptomus_service = get_cryptomus_service()
            payment_result = await cryptomus_service.create_payment(
                amount=str(payment.amount),
                currency="USD",  # Base currency
                order_id=order_id,
                url_return=f"{cryptomus_service._settings.FRONTEND_URL}/payment/return",
                url_success=f"{cryptomus_service._settings.FRONTEND_URL}/payment/success",
                url_callback=f"{cryptomus_service._settings.FRONTEND_URL}/api/payments/cryptomus/webhook"
            )
            
            # Create payment record
            payment_dict = {
                "user_id": user_id,
                "amount": payment.amount,
                "method": "crypto",
                "status": "pending",
                "order_id": payment.order_id,
                "created_at": datetime.utcnow(),
                "payment_details": {
                    "cryptomus_payment_uuid": payment_result["uuid"],
                    "cryptomus_payment_url": payment_result["url"],
                    "cryptomus_order_id": order_id,
                    "payment_data": payment_result
                }
            }
            
            result = await db[Collections.PAYMENTS].insert_one(payment_dict)
            payment_dict["id"] = str(result.inserted_id)
            
            logger.info("crypto_payment_created",
                payment_id=payment_dict["id"],
                user_id=user_id,
                cryptomus_uuid=payment_result["uuid"],
                amount=payment.amount
            )
            
            return Payment(**payment_dict)
            
        except Exception as e:
            logger.error("crypto_payment_creation_failed", 
                user_id=user_id, 
                amount=payment.amount, 
                error=str(e)
            )
            raise PaymentProcessingError(f"Failed to create crypto payment: {str(e)}")
    
    @staticmethod
    async def get_user_payments(user_id: str) -> List[Payment]:
        """Get all payments for a user"""
        try:
            db = Database.get_db()
            payments = await db[Collections.PAYMENTS].find(
                {"user_id": user_id}
            ).sort("created_at", -1).to_list(None)
            
            # Convert MongoDB documents to Payment objects
            payment_list = []
            for payment in payments:
                # Convert MongoDB _id to id field for Pydantic model
                payment["id"] = str(payment["_id"])
                payment.pop("_id", None)  # Remove _id field
                payment_list.append(Payment(**payment))
            
            return payment_list

        except Exception as e:
            logger.error("get_user_payments_failed", error=str(e))
            raise PaymentProcessingError(str(e))
    
    @staticmethod
    async def create_payment(user_id: str, payment: PaymentCreate) -> Payment:
        """Create a payment - routes to appropriate payment processor"""
        if payment.method == "crypto":
            return await PaymentService.create_crypto_payment(user_id, payment)
        else:
            # For now, we only support crypto payments
            raise PaymentProcessingError("Only cryptocurrency payments are supported")
    
    @staticmethod
    async def handle_cryptomus_webhook(webhook_data: Dict[str, Any]) -> bool:
        """Handle Cryptomus webhook notifications"""
        try:
            db = Database.get_db()
            
            payment_uuid = webhook_data.get("uuid")
            status = webhook_data.get("status")
            
            if not payment_uuid:
                logger.warning("cryptomus_webhook_missing_uuid", data=webhook_data)
                return False
            
            # Find payment by Cryptomus payment UUID
            payment = await db[Collections.PAYMENTS].find_one({
                "payment_details.cryptomus_payment_uuid": payment_uuid
            })
            
            if not payment:
                logger.warning("cryptomus_webhook_payment_not_found", payment_uuid=payment_uuid)
                return False
            
            # Parse status using Cryptomus service
            cryptomus_service = get_cryptomus_service()
            new_status = cryptomus_service.parse_payment_status(status)
            
            # Update payment status
            if new_status and new_status != payment["status"]:
                update_data = {
                    "status": new_status,
                    "payment_details.webhook_data": webhook_data
                }
                
                if new_status == "completed":
                    update_data["completed_at"] = datetime.utcnow()
                    # Add credits to user account
                    await PaymentService._add_credits_to_user(payment["user_id"], payment["amount"])
                elif new_status in ["cancelled", "failed"]:
                    update_data["cancelled_at"] = datetime.utcnow()
                
                await db[Collections.PAYMENTS].update_one(
                    {"_id": payment["_id"]},
                    {"$set": update_data}
                )
                
                logger.info("cryptomus_payment_status_updated",
                    payment_id=str(payment["_id"]),
                    payment_uuid=payment_uuid,
                    old_status=payment["status"],
                    new_status=new_status
                )
            
            return True
            
        except Exception as e:
            logger.error("cryptomus_webhook_processing_failed", error=str(e), data=webhook_data)
            return False
    
    @staticmethod
    async def _add_credits_to_user(user_id: str, amount: float) -> bool:
        """Add credits to user account"""
        try:
            from ..services.user_service import UserService
            return await UserService.update_credits(user_id, amount)
        except Exception as e:
            logger.error("add_credits_failed", user_id=user_id, amount=amount, error=str(e))
            return False
    
    @staticmethod
    async def get_crypto_payment_status(payment_id: str) -> Dict[str, Any]:
        """Get current status of a crypto payment from Cryptomus"""
        try:
            db = Database.get_db()
            
            payment = await db[Collections.PAYMENTS].find_one({"_id": ObjectId(payment_id)})
            if not payment:
                raise PaymentProcessingError("Payment not found")
            
            if payment["method"] != "crypto":
                raise PaymentProcessingError("Not a crypto payment")
            
            payment_uuid = payment["payment_details"].get("cryptomus_payment_uuid")
            if not payment_uuid:
                raise PaymentProcessingError("Cryptomus payment UUID not found")
            
            # Get latest payment data from Cryptomus
            cryptomus_service = get_cryptomus_service()
            payment_data = await cryptomus_service.get_payment_info(payment_uuid)
            
            # Parse status
            cryptomus_status = payment_data.get("status")
            parsed_status = cryptomus_service.parse_payment_status(cryptomus_status)
            
            # Update local payment if status changed
            if parsed_status != payment["status"]:
                update_data = {"status": parsed_status}
                if parsed_status == "completed":
                    update_data["completed_at"] = datetime.utcnow()
                    # Add credits to user
                    await PaymentService._add_credits_to_user(payment["user_id"], payment["amount"])
                
                await db[Collections.PAYMENTS].update_one(
                    {"_id": payment["_id"]},
                    {"$set": update_data}
                )
            
            return {
                "payment_id": payment_id,
                "status": parsed_status,
                "amount": payment["amount"],
                "cryptomus_status": cryptomus_status,
                "payment_url": payment["payment_details"].get("cryptomus_payment_url"),
                "payment_data": payment_data
            }
            
        except Exception as e:
            logger.error("get_crypto_payment_status_failed", payment_id=payment_id, error=str(e))
            raise PaymentProcessingError(f"Failed to get payment status: {str(e)}")

    @staticmethod
    async def cancel_payment(user_id: str, payment_id: str) -> Dict[str, Any]:
        """Cancel a pending or failed payment"""
        try:
            db = Database.get_db()
            
            # Find the payment and verify ownership
            payment = await db[Collections.PAYMENTS].find_one({
                "_id": ObjectId(payment_id),
                "user_id": user_id
            })
            
            if not payment:
                raise PaymentProcessingError("Payment not found")
            
            # Check if payment can be cancelled (only pending or failed payments)
            if payment["status"] not in ["pending", "failed"]:
                raise PaymentProcessingError(f"Cannot cancel payment with status: {payment['status']}")
            
            # Update payment status to cancelled
            result = await db[Collections.PAYMENTS].update_one(
                {"_id": ObjectId(payment_id)},
                {
                    "$set": {
                        "status": "cancelled",
                        "cancelled_at": datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count == 0:
                raise PaymentProcessingError("Failed to cancel payment")
            
            logger.info("payment_cancelled",
                payment_id=payment_id,
                user_id=user_id,
                previous_status=payment["status"]
            )
            
            return {
                "success": True,
                "payment_id": payment_id,
                "status": "cancelled",
                "message": "Payment has been cancelled successfully"
            }
            
        except Exception as e:
            logger.error("cancel_payment_failed", payment_id=payment_id, user_id=user_id, error=str(e))
            raise PaymentProcessingError(f"Failed to cancel payment: {str(e)}")
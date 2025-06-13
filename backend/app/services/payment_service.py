from datetime import datetime
from typing import List, Dict, Any
from ..models.payment import Payment, PaymentCreate, PaymentMethod
from ..config.database import Database, Collections
from ..utils.logger import logger
from ..utils.exceptions import PaymentProcessingError, InvalidPaymentMethodError
from .btcpay_service import get_btcpay_service
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
        """Create a cryptocurrency payment using BTCPay Server"""
        try:
            db = Database.get_db()
            
            # Generate order ID for tracking
            order_id = str(ObjectId())
            
            # Create BTCPay invoice
            btcpay_service = get_btcpay_service()
            invoice = await btcpay_service.create_invoice(
                amount=payment.amount,
                currency="USD",  # Base currency
                order_id=order_id,
                buyer_email=payment.payment_details.get("buyer_email"),
                description=f"Credit Purchase - {payment.amount} credits"
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
                    "btcpay_invoice_id": invoice["id"],
                    "btcpay_checkout_link": invoice["checkoutLink"],
                    "invoice_data": invoice
                }
            }
            
            result = await db[Collections.PAYMENTS].insert_one(payment_dict)
            payment_dict["id"] = str(result.inserted_id)
            
            logger.info("crypto_payment_created",
                payment_id=payment_dict["id"],
                user_id=user_id,
                invoice_id=invoice["id"],
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
    async def handle_btcpay_webhook(invoice_data: Dict[str, Any]) -> bool:
        """Handle BTCPay Server webhook notifications"""
        try:
            db = Database.get_db()
            
            invoice_id = invoice_data.get("invoiceId")
            status = invoice_data.get("type")  # InvoiceReceivedPayment, InvoicePaymentSettled, etc.
            
            if not invoice_id:
                logger.warning("btcpay_webhook_missing_invoice_id", data=invoice_data)
                return False
            
            # Find payment by BTCPay invoice ID
            payment = await db[Collections.PAYMENTS].find_one({
                "payment_details.btcpay_invoice_id": invoice_id
            })
            
            if not payment:
                logger.warning("btcpay_webhook_payment_not_found", invoice_id=invoice_id)
                return False
            
            # Update payment status based on webhook type
            new_status = None
            if status == "InvoicePaymentSettled":
                new_status = "completed"
                # Add credits to user account
                await PaymentService._add_credits_to_user(payment["user_id"], payment["amount"])
            elif status == "InvoiceExpired":
                new_status = "failed"
            elif status == "InvoiceInvalid":
                new_status = "failed"
            
            if new_status:
                await db[Collections.PAYMENTS].update_one(
                    {"_id": payment["_id"]},
                    {
                        "$set": {
                            "status": new_status,
                            "completed_at": datetime.utcnow() if new_status == "completed" else None,
                            "payment_details.webhook_data": invoice_data
                        }
                    }
                )
                
                logger.info("btcpay_payment_status_updated",
                    payment_id=str(payment["_id"]),
                    invoice_id=invoice_id,
                    status=new_status
                )
            
            return True
            
        except Exception as e:
            logger.error("btcpay_webhook_processing_failed", error=str(e), data=invoice_data)
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
        """Get current status of a crypto payment from BTCPay"""
        try:
            db = Database.get_db()
            
            payment = await db[Collections.PAYMENTS].find_one({"_id": ObjectId(payment_id)})
            if not payment:
                raise PaymentProcessingError("Payment not found")
            
            if payment["method"] != "crypto":
                raise PaymentProcessingError("Not a crypto payment")
            
            invoice_id = payment["payment_details"].get("btcpay_invoice_id")
            if not invoice_id:
                raise PaymentProcessingError("BTCPay invoice ID not found")
            
            # Get latest invoice data from BTCPay
            btcpay_service = get_btcpay_service()
            invoice_data = await btcpay_service.get_invoice(invoice_id)
            
            # Parse status
            btcpay_status = invoice_data.get("status")
            parsed_status = btcpay_service.parse_invoice_status(
                btcpay_status, 
                invoice_data.get("exceptionStatus")
            )
            
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
                "btcpay_status": btcpay_status,
                "checkout_link": payment["payment_details"].get("btcpay_checkout_link"),
                "invoice_data": invoice_data
            }
            
        except Exception as e:
            logger.error("get_crypto_payment_status_failed", payment_id=payment_id, error=str(e))
            raise PaymentProcessingError(f"Failed to get payment status: {str(e)}")
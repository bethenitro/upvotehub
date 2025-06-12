from datetime import datetime
from typing import List, Dict, Any, Tuple
from fastapi import HTTPException, status
from ..models.payment import Payment, PaymentCreate, PaymentMethod, TopUpRequest, PaymentInDB
from ..config.database import Database, Collections
from ..utils.logger import logger
from .user_service import UserService # To update user credits
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

    @staticmethod
    async def process_top_up(user_id: str, top_up_request: TopUpRequest) -> Dict[str, Any]:
        """Process a top-up request for a user."""
        db = Database.get_db()
        logger.info(
            "top_up_attempt",
            user_id=user_id,
            amount=top_up_request.amount,
            method=top_up_request.payment_method
        )

        # Mock payment processing logic
        # In a real scenario, integrate with a payment gateway (Stripe, PayPal, etc.)
        # For now, we'll assume payment is successful if basic validation passed in the route.
        # Some basic checks can be here too:
        if top_up_request.amount <= 0:
            logger.warn("top_up_invalid_amount", user_id=user_id, amount=top_up_request.amount)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be positive.")

        # TODO: Add more specific validation for payment_details based on payment_method if needed.

        # Record the payment/transaction
        payment_record = PaymentInDB(
            id=str(ObjectId()), # Generate new ID for the payment record
            user_id=user_id,
            amount=top_up_request.amount,
            method=top_up_request.payment_method,
            status="completed", # Assume direct completion for mock
            payment_details=top_up_request.payment_details,
            created_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
            description=f"Account top-up of {top_up_request.amount} credits."
        )

        # Pydantic v2 uses model_dump, v1 uses dict
        payment_dict_for_db = payment_record.model_dump(by_alias=True)


        insert_result = await db[Collections.PAYMENTS].insert_one(payment_dict_for_db)
        transaction_id = str(insert_result.inserted_id) # Use the DB record ID as transaction ID

        # Update user's credit balance
        credits_updated = await UserService.update_credits(user_id, top_up_request.amount)
        if not credits_updated:
            # This is a critical issue: payment recorded but credits not updated.
            # Needs robust handling in a real system (e.g., compensation transaction, admin alert).
            logger.error(
                "top_up_credits_update_failed",
                user_id=user_id,
                amount=top_up_request.amount,
                transaction_id=transaction_id
            )
            # Potentially try to mark payment as failed or needs investigation
            await db[Collections.PAYMENTS].update_one(
                {"_id": insert_result.inserted_id},
                {"$set": {"status": "failed", "error_message": "Credits update failed after payment."}}
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user credits after payment. Please contact support."
            )

        logger.info(
            "top_up_successful",
            user_id=user_id,
            amount=top_up_request.amount,
            transaction_id=transaction_id
        )

        return {
            "message": "Top-up successful.",
            "transaction_id": transaction_id,
            "credited_amount": top_up_request.amount
        }
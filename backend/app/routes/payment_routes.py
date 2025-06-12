from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from ..models.user import User
from ..models.payment import Payment, PaymentCreate, PaymentMethod
from ..services.payment_service import PaymentService
from ..utils.exceptions import (
    PaymentProcessingError,
    InvalidPaymentMethodError,
    InsufficientCreditsError
)
from .user import get_current_user
from ..utils.validators import validate_payment_amount, validate_credit_card, validate_crypto_address

router = APIRouter()

@router.post("/", response_model=Payment)
async def create_payment(
    payment: PaymentCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new payment"""
    try:
        # Validate payment amount
        if not validate_payment_amount(payment.amount):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payment amount"
            )

        # Validate payment method
        if payment.method == "credit_card":
            if not validate_credit_card(payment.payment_details):
                raise InvalidPaymentMethodError("Invalid credit card details")
        elif payment.method == "crypto":
            if not validate_crypto_address(
                payment.payment_details["currency"],
                payment.payment_details["address"]
            ):
                raise InvalidPaymentMethodError("Invalid cryptocurrency address")

        return await PaymentService.create_payment(current_user.id, payment)
    except (InvalidPaymentMethodError, InsufficientCreditsError) as e:
        raise e
    except Exception as e:
        raise PaymentProcessingError(str(e))

@router.get("/", response_model=List[Payment])
async def get_payments(current_user: User = Depends(get_current_user)):
    """Get user's payments"""
    return await PaymentService.get_user_payments(current_user.id)

@router.post("/methods", response_model=PaymentMethod)
async def add_payment_method(
    payment_method: PaymentMethod,
    current_user: User = Depends(get_current_user)
):
    """Add a new payment method"""
    try:
        # Validate payment method details
        if payment_method.type == "credit_card":
            if not validate_credit_card(payment_method.details):
                raise InvalidPaymentMethodError("Invalid credit card details")
        elif payment_method.type == "crypto":
            if not validate_crypto_address(
                payment_method.details["currency"],
                payment_method.details["address"]
            ):
                raise InvalidPaymentMethodError("Invalid cryptocurrency address")

        return await PaymentService.add_payment_method(current_user.id, payment_method)
    except InvalidPaymentMethodError as e:
        raise e
    except Exception as e:
        raise PaymentProcessingError(str(e))

@router.get("/methods", response_model=List[PaymentMethod])
async def get_payment_methods(current_user: User = Depends(get_current_user)):
    """Get user's payment methods"""
    return await PaymentService.get_user_payment_methods(current_user.id)

@router.delete("/methods/{method_id}")
async def delete_payment_method(
    method_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a payment method"""
    try:
        return await PaymentService.delete_payment_method(current_user.id, method_id)
    except Exception as e:
        raise PaymentProcessingError(str(e))

@router.post("/methods/{method_id}/default")
async def set_default_payment_method(
    method_id: str,
    current_user: User = Depends(get_current_user)
):
    """Set a payment method as default"""
    try:
        return await PaymentService.set_default_payment_method(current_user.id, method_id)
    except Exception as e:
        raise PaymentProcessingError(str(e)) 
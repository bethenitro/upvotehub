from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from typing import List
from ..models.user import User
from ..models.payment import Payment, PaymentCreate, PaymentMethod
from ..services.payment_service import PaymentService
from ..services.cryptomus_service import get_cryptomus_service
from ..utils.exceptions import (
    PaymentProcessingError,
    InvalidPaymentMethodError,
    InsufficientCreditsError
)
from ..utils.auth import get_current_user
from ..utils.validators import validate_payment_amount
from ..utils.logger import logger

router = APIRouter()

@router.post("/create", response_model=Payment)
async def create_payment(
    payment: PaymentCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new payment - crypto only"""
    try:
        # Validate payment amount
        if not validate_payment_amount(payment.amount):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payment amount"
            )

        # Only support crypto payments
        if payment.method != "crypto":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only cryptocurrency payments are supported"
            )

        return await PaymentService.create_payment(current_user.id, payment)
    except (InvalidPaymentMethodError, InsufficientCreditsError) as e:
        raise e
    except Exception as e:
        raise PaymentProcessingError(str(e))

@router.get("/list", response_model=List[Payment])
async def get_payments(current_user: User = Depends(get_current_user)):
    """Get user's payments"""
    return await PaymentService.get_user_payments(current_user.id)

@router.get("/{payment_id}/status")
async def get_payment_status(
    payment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get current status of a crypto payment"""
    try:
        return await PaymentService.get_crypto_payment_status(payment_id)
    except Exception as e:
        raise PaymentProcessingError(str(e))

@router.post("/{payment_id}/cancel")
async def cancel_payment(
    payment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Cancel a pending or failed payment"""
    try:
        return await PaymentService.cancel_payment(current_user.id, payment_id)
    except Exception as e:
        raise PaymentProcessingError(str(e))

@router.post("/cryptomus/webhook")
async def cryptomus_webhook(request: Request):
    """Handle Cryptomus webhook notifications"""
    try:
        # Get raw body for signature verification
        body = await request.body()
        body_str = body.decode('utf-8')
        
        # Get signature from headers
        signature = request.headers.get("sign")
        if not signature:
            logger.warning("cryptomus_webhook_missing_signature")
            raise HTTPException(status_code=400, detail="Missing signature")
        
        # Verify webhook signature
        cryptomus_service = get_cryptomus_service()
        if not cryptomus_service.verify_webhook_signature(body_str, signature):
            logger.warning("cryptomus_webhook_invalid_signature")
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        # Parse webhook data
        import json
        webhook_data = json.loads(body_str)
        
        # Process the webhook
        success = await PaymentService.handle_cryptomus_webhook(webhook_data)
        
        if success:
            return JSONResponse(content={"status": "ok"})
        else:
            raise HTTPException(status_code=400, detail="Webhook processing failed")
            
    except json.JSONDecodeError:
        logger.error("cryptomus_webhook_invalid_json")
        raise HTTPException(status_code=400, detail="Invalid JSON")
    except Exception as e:
        logger.error("cryptomus_webhook_error", error=str(e))
        raise HTTPException(status_code=500, detail="Webhook processing error")

@router.get("/crypto/supported-methods")
async def get_supported_crypto_methods():
    """Get supported cryptocurrency payment methods"""
    try:
        cryptomus_service = get_cryptomus_service()
        methods = await cryptomus_service.get_payment_services()
        return {"supported_methods": methods}
    except Exception as e:
        logger.error("get_supported_crypto_methods_error", error=str(e))
        return {"supported_methods": []}

# Keep existing payment method routes for compatibility
@router.post("/methods", response_model=PaymentMethod)
async def add_payment_method(
    payment_method: PaymentMethod,
    current_user: User = Depends(get_current_user)
):
    """Add a new payment method"""
    try:
        # Only support crypto payment methods
        if payment_method.type != "crypto":
            raise InvalidPaymentMethodError("Only crypto payment methods are supported")

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
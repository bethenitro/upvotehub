import httpx
import json
import hashlib
import base64
from datetime import datetime
from typing import Dict, Any, Optional
from ..config.settings import get_settings
from ..utils.logger import logger
from ..utils.exceptions import PaymentProcessingError

class CryptomusService:
    """Cryptomus Personal API v1 integration"""
    
    def __init__(self):
        # Load settings fresh each time the service is initialized
        self._settings = get_settings()
        self.api_key = self._settings.CRYPTOMUS_API_KEY
        self.user_id = self._settings.CRYPTOMUS_USER_ID
        self.base_url = "https://api.cryptomus.com/v1"
        
        logger.info("cryptomus_service_initialized", 
            has_api_key=bool(self.api_key),
            has_user_id=bool(self.user_id)
        )
        
        if not all([self.api_key, self.user_id]):
            logger.warning("Cryptomus configuration incomplete")
    
    def _generate_signature(self, payload: str) -> str:
        """Generate MD5 signature for Cryptomus API"""
        try:
            # Encode payload in base64 and combine with API key
            encoded_payload = base64.b64encode(payload.encode('utf-8')).decode('utf-8')
            signature_string = encoded_payload + self.api_key
            
            # Generate MD5 hash
            signature = hashlib.md5(signature_string.encode('utf-8')).hexdigest()
            
            logger.debug("cryptomus_signature_generated", 
                payload_length=len(payload),
                signature=signature[:8] + "..."  # Log first 8 chars for debugging
            )
            
            return signature
        except Exception as e:
            logger.error("cryptomus_signature_generation_error", error=str(e))
            raise PaymentProcessingError(f"Failed to generate signature: {str(e)}")
    
    def _get_headers(self, payload: str) -> Dict[str, str]:
        """Get headers for Cryptomus API requests"""
        return {
            "userId": self.user_id,
            "sign": self._generate_signature(payload),
            "Content-Type": "application/json"
        }
    
    async def create_payment(
        self, 
        amount: str,
        currency: str = "USD",
        network: str = None,
        order_id: str = None,
        url_return: str = None,
        url_success: str = None,
        url_callback: str = None,
        is_subtract: bool = True,
        lifetime: int = 7200,  # 2 hours in seconds
        to_currency: str = None
    ) -> Dict[str, Any]:
        """
        Create a new payment using Cryptomus Personal API
        
        Args:
            amount: Payment amount
            currency: Source currency (USD, EUR, etc.)
            network: Blockchain network (optional, will use best rate if not specified)
            order_id: Optional order ID for tracking
            url_return: Return URL after payment
            url_success: Success URL after payment
            url_callback: Webhook callback URL
            is_subtract: Whether fees are subtracted from amount
            lifetime: Payment lifetime in seconds
            to_currency: Target cryptocurrency (optional)
            
        Returns:
            Payment data from Cryptomus API
        """
        try:
            # Prepare payment data
            payment_data = {
                "amount": amount,
                "currency": currency,
                "order_id": order_id or f"upvote_{datetime.utcnow().timestamp()}",
                "url_return": url_return or f"{self._settings.FRONTEND_URL}/payment/return",
                "url_success": url_success or f"{self._settings.FRONTEND_URL}/payment/success", 
                "url_callback": url_callback or f"{self._settings.FRONTEND_URL}/api/payments/cryptomus/webhook",
                "is_subtract": 1 if is_subtract else 0,
                "lifetime": lifetime
            }
            
            # Add optional parameters
            if network:
                payment_data["network"] = network
            if to_currency:
                payment_data["to_currency"] = to_currency
            
            # Convert to JSON string for signature
            payload = json.dumps(payment_data, separators=(',', ':'))
            
            logger.info("cryptomus_creating_payment", 
                amount=amount,
                currency=currency,
                order_id=payment_data["order_id"],
                network=network
            )
            
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/payment"
                
                response = await client.post(
                    url,
                    headers=self._get_headers(payload),
                    content=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    
                    if result.get("state") == 0:  # Success state
                        payment_result = result.get("result", {})
                        
                        logger.info("cryptomus_payment_created",
                            payment_uuid=payment_result.get("uuid"),
                            amount=amount,
                            currency=currency,
                            order_id=payment_data["order_id"]
                        )
                        
                        return payment_result
                    else:
                        error_msg = f"Cryptomus payment creation failed: {result.get('message', 'Unknown error')}"
                        logger.error("cryptomus_payment_creation_failed",
                            state=result.get("state"),
                            message=result.get("message"),
                            errors=result.get("errors")
                        )
                        raise PaymentProcessingError(error_msg)
                else:
                    error_msg = f"Cryptomus API error: {response.status_code} - {response.text}"
                    logger.error("cryptomus_api_error",
                        status_code=response.status_code,
                        response=response.text
                    )
                    raise PaymentProcessingError(error_msg)
                    
        except httpx.TimeoutException:
            logger.error("cryptomus_payment_creation_timeout", amount=amount)
            raise PaymentProcessingError("Cryptomus API timeout")
        except Exception as e:
            logger.error("cryptomus_payment_creation_error", error=str(e), amount=amount)
            raise PaymentProcessingError(f"Cryptomus payment creation failed: {str(e)}")
    
    async def get_payment_info(self, payment_uuid: str) -> Dict[str, Any]:
        """
        Get payment information from Cryptomus
        
        Args:
            payment_uuid: Cryptomus payment UUID
            
        Returns:
            Payment information
        """
        try:
            payment_data = {
                "uuid": payment_uuid
            }
            
            payload = json.dumps(payment_data, separators=(',', ':'))
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/payment/info",
                    headers=self._get_headers(payload),
                    content=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    
                    if result.get("state") == 0:
                        return result.get("result", {})
                    else:
                        error_msg = f"Cryptomus get payment info failed: {result.get('message', 'Unknown error')}"
                        logger.error("cryptomus_get_payment_info_failed",
                            payment_uuid=payment_uuid,
                            state=result.get("state"),
                            message=result.get("message")
                        )
                        raise PaymentProcessingError(error_msg)
                else:
                    error_msg = f"Cryptomus get payment info failed: {response.status_code} - {response.text}"
                    logger.error("cryptomus_get_payment_info_api_error",
                        payment_uuid=payment_uuid,
                        status_code=response.status_code,
                        response=response.text
                    )
                    raise PaymentProcessingError(error_msg)
                    
        except httpx.TimeoutException:
            logger.error("cryptomus_get_payment_info_timeout", payment_uuid=payment_uuid)
            raise PaymentProcessingError("Cryptomus API timeout")
        except Exception as e:
            logger.error("cryptomus_get_payment_info_error", error=str(e), payment_uuid=payment_uuid)
            raise PaymentProcessingError(f"Cryptomus get payment info failed: {str(e)}")
    
    async def get_payment_services(self) -> Dict[str, Any]:
        """
        Get available payment services/methods from Cryptomus
        
        Returns:
            Available payment services
        """
        try:
            # Empty payload for services endpoint
            payload = "{}"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/payment/services",
                    headers=self._get_headers(payload),
                    content=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    
                    if result.get("state") == 0:
                        return result.get("result", [])
                    else:
                        logger.error("cryptomus_get_services_failed",
                            state=result.get("state"),
                            message=result.get("message")
                        )
                        return []
                else:
                    logger.error("cryptomus_get_services_api_error",
                        status_code=response.status_code
                    )
                    return []
                    
        except Exception as e:
            logger.error("cryptomus_get_services_error", error=str(e))
            return []
    
    def parse_payment_status(self, status: str) -> str:
        """
        Parse Cryptomus payment status to our payment status
        
        Args:
            status: Cryptomus payment status
            
        Returns:
            Our standardized payment status
        """
        # Cryptomus payment statuses:
        # paid, paid_over, wrong_amount, process, confirm_check, 
        # wrong_amount_waiting, check, fail, cancel, system_fail, refund_process, refund_fail, refund_paid
        
        status_mapping = {
            "paid": "completed",
            "paid_over": "completed",
            "process": "pending", 
            "confirm_check": "pending",
            "check": "pending",
            "wrong_amount_waiting": "pending",
            "wrong_amount": "failed",
            "fail": "failed",
            "cancel": "cancelled",
            "system_fail": "failed",
            "refund_process": "refunded",
            "refund_fail": "failed",
            "refund_paid": "refunded"
        }
        
        return status_mapping.get(status, "pending")
    
    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """
        Verify Cryptomus webhook signature
        
        Args:
            payload: Raw webhook payload
            signature: Webhook signature
            
        Returns:
            True if signature is valid
        """
        try:
            expected_signature = self._generate_signature(payload)
            return expected_signature == signature
            
        except Exception as e:
            logger.error("cryptomus_webhook_verification_error", error=str(e))
            return False

# Global Cryptomus service instance - lazy loaded
_cryptomus_service = None

def get_cryptomus_service() -> CryptomusService:
    """Get or create Cryptomus service instance"""
    global _cryptomus_service
    if _cryptomus_service is None:
        _cryptomus_service = CryptomusService()
    return _cryptomus_service

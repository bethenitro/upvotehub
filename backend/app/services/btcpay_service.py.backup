import httpx
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from ..config.settings import get_settings
from ..utils.logger import logger
from ..utils.exceptions import PaymentProcessingError

class BTCPayService:
    """BTCPay Server Greenfield API v1 integration"""
    
    def __init__(self):
        # Load settings fresh each time the service is initialized
        self._settings = get_settings()
        self.api_key = self._settings.BTCPAY_API_KEY
        self.server_url = self._settings.BTCPAY_SERVER_URL
        self.store_id = self._settings.BTCPAY_STORE_ID
        self.webhook_secret = self._settings.BTCPAY_WEBHOOK_SECRET
        
        logger.info("btcpay_service_initialized", 
            server_url=self.server_url,
            store_id=self.store_id,
            has_api_key=bool(self.api_key),
            has_webhook_secret=bool(self.webhook_secret)
        )
        
        if not all([self.api_key, self.server_url, self.store_id]):
            logger.warning("BTCPay configuration incomplete")
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for BTCPay API requests"""
        return {
            "Authorization": f"token {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def create_invoice(
        self, 
        amount: float, 
        currency: str = "USD", 
        order_id: str = None,
        buyer_email: str = None,
        description: str = None
    ) -> Dict[str, Any]:
        """
        Create a new invoice using BTCPay Greenfield API
        
        Args:
            amount: Invoice amount
            currency: Currency code (USD, EUR, etc.)
            order_id: Optional order ID for tracking
            buyer_email: Optional buyer email
            description: Optional description
            
        Returns:
            Invoice data from BTCPay Server
        """
        try:
            # For demo purposes, convert USD to a small BTC amount to avoid rate issues
            if currency == "USD":
                # Use a fixed small BTC amount for testing (0.0001 BTC ≈ $4-6)
                btc_amount = "0.0001"
                invoice_data = {
                    "amount": btc_amount,
                    "currency": "BTC",
                    "metadata": {
                        "orderId": order_id,
                        "buyerEmail": buyer_email,
                        "originalAmount": str(amount),
                        "originalCurrency": currency
                    }
                }
                
                if description:
                    invoice_data["metadata"]["itemDesc"] = f"{description} (BTC equivalent for ${amount} USD)"
                
                logger.info("btcpay_using_btc_fallback", 
                    original_amount=amount,
                    original_currency=currency,
                    btc_amount=btc_amount
                )
            else:
                # Use original currency if not USD
                invoice_data = {
                    "amount": str(amount),
                    "currency": currency,
                    "metadata": {
                        "orderId": order_id,
                        "buyerEmail": buyer_email
                    }
                }
                
                if description:
                    invoice_data["metadata"]["itemDesc"] = description
            
            # Set invoice expiration (30 minutes)
            invoice_data["checkout"] = {
                "expirationMinutes": 30,
                "monitoring": {
                    "enabled": True
                },
                "paymentTolerance": 0,
                "redirectURL": f"{self._settings.FRONTEND_URL}/payment/success",
                "defaultLanguage": "en"
            }
            
            async with httpx.AsyncClient() as client:
                url = f"{self.server_url}/api/v1/stores/{self.store_id}/invoices"
                logger.info("btcpay_creating_invoice", 
                    url=url,
                    server_url=self.server_url,
                    store_id=self.store_id,
                    amount=amount,
                    currency=currency
                )
                
                response = await client.post(
                    url,
                    headers=self._get_headers(),
                    json=invoice_data,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    invoice = response.json()
                    
                    logger.info("btcpay_invoice_created",
                        invoice_id=invoice.get("id"),
                        amount=amount,
                        currency=currency,
                        order_id=order_id
                    )
                    
                    return invoice
                else:
                    # If USD rate is unavailable, try with a smaller BTC amount
                    if "rate" in response.text.lower() and currency == "USD":
                        logger.warning("btcpay_usd_rate_unavailable_trying_btc", 
                            original_amount=amount,
                            original_currency=currency
                        )
                        
                        # Try with a minimal BTC amount (0.0001 BTC ≈ $4-6)
                        btc_invoice_data = {
                            "amount": "0.0001",
                            "currency": "BTC",
                            "metadata": {
                                "orderId": order_id,
                                "buyerEmail": buyer_email,
                                "originalAmount": str(amount),
                                "originalCurrency": currency
                            }
                        }
                        
                        if description:
                            btc_invoice_data["metadata"]["itemDesc"] = f"{description} (BTC fallback due to USD rate unavailable)"
                        
                        btc_invoice_data["checkout"] = invoice_data["checkout"]
                        
                        logger.info("btcpay_creating_btc_fallback_invoice", 
                            btc_amount="0.0001",
                            original_amount=amount,
                            original_currency=currency
                        )
                        
                        btc_response = await client.post(
                            url,
                            headers=self._get_headers(),
                            json=btc_invoice_data,
                            timeout=30.0
                        )
                        
                        if btc_response.status_code == 200:
                            btc_invoice = btc_response.json()
                            
                            logger.info("btcpay_btc_fallback_invoice_created",
                                invoice_id=btc_invoice.get("id"),
                                btc_amount="0.0001",
                                original_amount=amount,
                                original_currency=currency
                            )
                            
                            return btc_invoice
                    
                    error_msg = f"BTCPay invoice creation failed: {response.status_code} - {response.text}"
                    logger.error("btcpay_invoice_creation_failed",
                        status_code=response.status_code,
                        response=response.text,
                        amount=amount,
                        currency=currency
                    )
                    raise PaymentProcessingError(error_msg)
                    
        except httpx.TimeoutException:
            logger.error("btcpay_invoice_creation_timeout", amount=amount)
            raise PaymentProcessingError("BTCPay server timeout")
        except Exception as e:
            logger.error("btcpay_invoice_creation_error", error=str(e), amount=amount)
            raise PaymentProcessingError(f"BTCPay invoice creation failed: {str(e)}")
    
    async def get_invoice(self, invoice_id: str) -> Dict[str, Any]:
        """
        Get invoice details from BTCPay Server
        
        Args:
            invoice_id: BTCPay invoice ID
            
        Returns:
            Invoice data
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.server_url}/api/v1/stores/{self.store_id}/invoices/{invoice_id}",
                    headers=self._get_headers(),
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    error_msg = f"BTCPay get invoice failed: {response.status_code} - {response.text}"
                    logger.error("btcpay_get_invoice_failed",
                        invoice_id=invoice_id,
                        status_code=response.status_code,
                        response=response.text
                    )
                    raise PaymentProcessingError(error_msg)
                    
        except httpx.TimeoutException:
            logger.error("btcpay_get_invoice_timeout", invoice_id=invoice_id)
            raise PaymentProcessingError("BTCPay server timeout")
        except Exception as e:
            logger.error("btcpay_get_invoice_error", error=str(e), invoice_id=invoice_id)
            raise PaymentProcessingError(f"BTCPay get invoice failed: {str(e)}")
    
    async def get_invoice_payment_methods(self, invoice_id: str) -> Dict[str, Any]:
        """
        Get available payment methods for an invoice
        
        Args:
            invoice_id: BTCPay invoice ID
            
        Returns:
            Payment methods data
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.server_url}/api/v1/stores/{self.store_id}/invoices/{invoice_id}/payment-methods",
                    headers=self._get_headers(),
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    error_msg = f"BTCPay get payment methods failed: {response.status_code} - {response.text}"
                    logger.error("btcpay_get_payment_methods_failed",
                        invoice_id=invoice_id,
                        status_code=response.status_code
                    )
                    raise PaymentProcessingError(error_msg)
                    
        except Exception as e:
            logger.error("btcpay_get_payment_methods_error", error=str(e), invoice_id=invoice_id)
            raise PaymentProcessingError(f"BTCPay get payment methods failed: {str(e)}")
    
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """
        Verify BTCPay webhook signature
        
        Args:
            payload: Raw webhook payload
            signature: Webhook signature header
            
        Returns:
            True if signature is valid
        """
        try:
            import hmac
            import hashlib
            
            if not self.webhook_secret:
                logger.warning("btcpay_webhook_secret_not_configured")
                return False
            
            expected_signature = hmac.new(
                self.webhook_secret.encode('utf-8'),
                payload,
                hashlib.sha256
            ).hexdigest()
            
            # BTCPay uses format: sha256=<signature>
            if signature.startswith("sha256="):
                signature = signature[7:]
            
            return hmac.compare_digest(expected_signature, signature)
            
        except Exception as e:
            logger.error("btcpay_webhook_verification_error", error=str(e))
            return False
    
    def parse_invoice_status(self, status: str, exception_status: str = None) -> str:
        """
        Parse BTCPay invoice status to our payment status
        
        Args:
            status: BTCPay invoice status
            exception_status: BTCPay exception status
            
        Returns:
            Our standardized payment status
        """
        # BTCPay invoice statuses:
        # New, Processing, Settled, Invalid, Expired
        
        if status == "Settled":
            return "completed"
        elif status == "Processing":
            return "pending"
        elif status in ["Invalid", "Expired"]:
            return "failed"
        elif status == "New":
            return "pending"
        else:
            return "pending"
    
    async def get_supported_payment_methods(self) -> Dict[str, Any]:
        """
        Get supported cryptocurrencies and payment methods from the store
        
        Returns:
            Supported payment methods
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.server_url}/api/v1/stores/{self.store_id}/payment-methods",
                    headers=self._get_headers(),
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error("btcpay_get_payment_methods_failed",
                        status_code=response.status_code
                    )
                    return []
                    
        except Exception as e:
            logger.error("btcpay_get_payment_methods_error", error=str(e))
            return []

# Global BTCPay service instance - lazy loaded
_btcpay_service = None

def get_btcpay_service() -> BTCPayService:
    """Get or create BTCPay service instance"""
    global _btcpay_service
    if _btcpay_service is None:
        _btcpay_service = BTCPayService()
    return _btcpay_service

# Note: btcpay_service should be accessed via get_btcpay_service() function
# to ensure proper lazy loading

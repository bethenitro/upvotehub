"""
Bot Backend Client Service
Handles communication with the dedicated bot backend
"""

import httpx
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class BotBackendClient:
    """Client for communicating with the bot backend"""
    
    def __init__(self):
        self.bot_backend_url = os.getenv("BOT_BACKEND_URL", "http://localhost:8001")
        self.client = httpx.AsyncClient(timeout=60.0)  # Longer timeout for bot operations
    
    async def create_bot_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send an order to the bot backend for processing
        
        Args:
            order_data: Order information
            
        Returns:
            Response from bot backend
        """
        try:
            url = f"{self.bot_backend_url}/orders"
            
            payload = {
                "order_id": order_data["order_id"],
                "reddit_url": order_data["reddit_url"],
                "upvotes": order_data["upvotes"],
                "upvotes_per_minute": order_data["upvotes_per_minute"]
            }
            
            logger.info(f"Sending order {order_data['order_id']} to bot backend")
            
            response = await self.client.post(url, json=payload)
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Bot backend accepted order {order_data['order_id']}")
                return {
                    "success": True,
                    "data": result
                }
            else:
                error_msg = f"Bot backend rejected order: {response.status_code}"
                logger.error(f"Error creating bot order {order_data['order_id']}: {error_msg}")
                return {
                    "success": False,
                    "error": error_msg,
                    "status_code": response.status_code
                }
                
        except httpx.TimeoutException:
            logger.error(f"Timeout creating bot order {order_data['order_id']}")
            return {
                "success": False,
                "error": "Bot backend timeout"
            }
        except Exception as e:
            logger.error(f"Error creating bot order {order_data['order_id']}: {str(e)}")
            return {
                "success": False,
                "error": f"Communication error: {str(e)}"
            }
    
    async def get_bot_order_status(self, order_id: str) -> Dict[str, Any]:
        """
        Get order status from bot backend
        
        Args:
            order_id: The order ID
            
        Returns:
            Order status data
        """
        try:
            url = f"{self.bot_backend_url}/orders/{order_id}"
            response = await self.client.get(url)
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "data": response.json()
                }
            elif response.status_code == 404:
                return {
                    "success": False,
                    "error": "Order not found in bot backend - may have been interrupted by restart"
                }
            else:
                return {
                    "success": False,
                    "error": f"Bot backend error: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"Error getting bot order status {order_id}: {str(e)}")
            return {
                "success": False,
                "error": f"Communication error: {str(e)}"
            }
    
    async def cancel_bot_order(self, order_id: str) -> Dict[str, Any]:
        """
        Cancel an order in the bot backend
        
        Args:
            order_id: The order ID
            
        Returns:
            Cancellation result
        """
        try:
            url = f"{self.bot_backend_url}/orders/{order_id}"
            response = await self.client.delete(url)
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "data": response.json()
                }
            else:
                return {
                    "success": False,
                    "error": f"Bot backend error: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"Error cancelling bot order {order_id}: {str(e)}")
            return {
                "success": False,
                "error": f"Communication error: {str(e)}"
            }
    
    async def retry_bot_order(self, order_id: str) -> Dict[str, Any]:
        """
        Retry a failed order in the bot backend
        
        Args:
            order_id: The order ID
            
        Returns:
            Retry result
        """
        try:
            url = f"{self.bot_backend_url}/orders/{order_id}/retry"
            response = await self.client.post(url)
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "data": response.json()
                }
            else:
                return {
                    "success": False,
                    "error": f"Bot backend error: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"Error retrying bot order {order_id}: {str(e)}")
            return {
                "success": False,
                "error": f"Communication error: {str(e)}"
            }
    
    async def get_bot_health(self) -> Dict[str, Any]:
        """
        Check bot backend health
        
        Returns:
            Health status
        """
        try:
            url = f"{self.bot_backend_url}/health"
            response = await self.client.get(url)
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "data": response.json()
                }
            else:
                return {
                    "success": False,
                    "error": f"Bot backend unhealthy: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"Error checking bot backend health: {str(e)}")
            return {
                "success": False,
                "error": f"Bot backend unreachable: {str(e)}"
            }
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()

# Global client instance
bot_client = BotBackendClient()

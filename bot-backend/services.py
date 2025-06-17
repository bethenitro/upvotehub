"""
Bot Backend Service Layer
Handles communication with the main backend and bot operations
"""

import httpx
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class BotBackendService:
    """Service for handling bot backend operations and communication with main backend"""
    
    def __init__(self):
        self.main_backend_url = os.getenv("MAIN_BACKEND_URL", "http://localhost:8000")
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def notify_main_backend(self, order_id: str, status_data: Dict[str, Any]) -> bool:
        """
        Notify the main backend about order status updates
        
        Args:
            order_id: The order ID
            status_data: Status information to send
            
        Returns:
            bool: True if notification was successful
        """
        try:
            url = f"{self.main_backend_url}/api/orders/{order_id}/bot-status"
            
            payload = {
                "order_id": order_id,
                "status": status_data.get("status"),
                "upvotes_done": status_data.get("upvotes_done", 0),
                "progress_percentage": status_data.get("progress_percentage", 0.0),
                "error": status_data.get("error"),
                "last_update": datetime.now().isoformat()
            }
            
            response = await self.client.post(url, json=payload)
            
            if response.status_code == 200:
                logger.info(f"Successfully notified main backend for order {order_id}")
                return True
            else:
                logger.warning(f"Failed to notify main backend for order {order_id}: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error notifying main backend for order {order_id}: {str(e)}")
            return False
    
    async def get_order_from_main_backend(self, order_id: str) -> Optional[Dict[str, Any]]:
        """
        Get order details from the main backend
        
        Args:
            order_id: The order ID
            
        Returns:
            Order data if found, None otherwise
        """
        try:
            url = f"{self.main_backend_url}/api/orders/{order_id}"
            response = await self.client.get(url)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"Order {order_id} not found in main backend: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting order {order_id} from main backend: {str(e)}")
            return None
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()

# Global service instance
bot_service = BotBackendService()

#!/usr/bin/env python3
"""
Order History Manager for Bot Backend
Provides persistent storage of order information to handle bot backend restarts
"""

import json
import os
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class OrderHistoryManager:
    """
    Manages persistent storage of order history in JSON format
    """
    
    def __init__(self, history_file_path: str = "order_history.json"):
        """
        Initialize the order history manager
        
        Args:
            history_file_path: Path to the JSON file for storing order history
        """
        self.history_file_path = Path(history_file_path)
        self._ensure_history_file_exists()
    
    def _ensure_history_file_exists(self):
        """Ensure the history file exists, create if it doesn't"""
        if not self.history_file_path.exists():
            self._save_history({})
            logger.info(f"Created new order history file: {self.history_file_path}")
    
    def _load_history(self) -> Dict[str, Any]:
        """
        Load order history from JSON file
        
        Returns:
            Dictionary containing order history
        """
        try:
            with open(self.history_file_path, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError) as e:
            logger.error(f"Error loading order history: {e}")
            return {}
    
    def _save_history(self, history: Dict[str, Any]):
        """
        Save order history to JSON file
        
        Args:
            history: Dictionary containing order history to save
        """
        try:
            with open(self.history_file_path, 'w') as f:
                json.dump(history, f, indent=2, default=str)
            logger.debug(f"Saved order history to {self.history_file_path}")
        except Exception as e:
            logger.error(f"Error saving order history: {e}")
    
    def add_order(self, order_id: str, order_data: Dict[str, Any]):
        """
        Add a new order to the history
        
        Args:
            order_id: The order ID
            order_data: Dictionary containing order information
        """
        try:
            history = self._load_history()
            
            order_entry = {
                "order_id": order_id,
                "reddit_url": order_data.get("reddit_url"),
                "total_upvotes": order_data.get("upvotes"),
                "upvotes_per_minute": order_data.get("upvotes_per_minute"),
                "status": "pending",
                "upvotes_done": 0,
                "progress_percentage": 0.0,
                "created_at": datetime.now().isoformat(),
                "started_at": None,
                "completed_at": None,
                "last_update": datetime.now().isoformat(),
                "error_message": None
            }
            
            history[order_id] = order_entry
            self._save_history(history)
            
            logger.info(f"Added order {order_id} to history")
            
        except Exception as e:
            logger.error(f"Error adding order {order_id} to history: {e}")
    
    def update_order_status(self, order_id: str, status: str, **kwargs):
        """
        Update order status and other fields in history
        
        Args:
            order_id: The order ID
            status: New status
            **kwargs: Additional fields to update (upvotes_done, progress_percentage, error_message, etc.)
        """
        try:
            history = self._load_history()
            
            if order_id not in history:
                logger.warning(f"Order {order_id} not found in history, cannot update")
                return
            
            # Update fields
            history[order_id]["status"] = status
            history[order_id]["last_update"] = datetime.now().isoformat()
            
            # Update optional fields
            for key, value in kwargs.items():
                if value is not None:
                    history[order_id][key] = value
            
            # Set timestamps based on status
            if status == "running" and not history[order_id].get("started_at"):
                history[order_id]["started_at"] = datetime.now().isoformat()
            elif status in ["completed", "failed"] and not history[order_id].get("completed_at"):
                history[order_id]["completed_at"] = datetime.now().isoformat()
            
            self._save_history(history)
            
            logger.debug(f"Updated order {order_id} status to {status}")
            
        except Exception as e:
            logger.error(f"Error updating order {order_id} status: {e}")
    
    def get_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        """
        Get order information from history
        
        Args:
            order_id: The order ID
            
        Returns:
            Order data dictionary or None if not found
        """
        try:
            history = self._load_history()
            return history.get(order_id)
        except Exception as e:
            logger.error(f"Error getting order {order_id} from history: {e}")
            return None
    
    def get_all_orders(self) -> Dict[str, Any]:
        """
        Get all orders from history
        
        Returns:
            Dictionary containing all orders
        """
        try:
            return self._load_history()
        except Exception as e:
            logger.error(f"Error getting all orders from history: {e}")
            return {}
    
    def mark_as_failed_after_restart(self, order_id: str):
        """
        Mark an order as failed due to bot backend restart
        
        Args:
            order_id: The order ID
        """
        self.update_order_status(
            order_id=order_id,
            status="failed",
            error_message="Order failed due to bot backend restart",
            completed_at=datetime.now().isoformat()
        )
        logger.info(f"Marked order {order_id} as failed due to restart")
    
    def cleanup_old_orders(self, days: int = 30):
        """
        Remove orders older than specified days
        
        Args:
            days: Number of days to keep orders
        """
        try:
            history = self._load_history()
            cutoff_date = datetime.now().timestamp() - (days * 24 * 60 * 60)
            
            orders_to_remove = []
            for order_id, order_data in history.items():
                try:
                    created_at = datetime.fromisoformat(order_data["created_at"])
                    if created_at.timestamp() < cutoff_date:
                        orders_to_remove.append(order_id)
                except (ValueError, KeyError):
                    # If we can't parse the date, keep the order
                    continue
            
            for order_id in orders_to_remove:
                del history[order_id]
            
            if orders_to_remove:
                self._save_history(history)
                logger.info(f"Cleaned up {len(orders_to_remove)} old orders from history")
                
        except Exception as e:
            logger.error(f"Error cleaning up old orders: {e}")

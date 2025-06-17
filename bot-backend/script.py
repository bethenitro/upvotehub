#!/usr/bin/env python3
"""
UpVote Processing Script
Handles upvote orders from the backend with proper JSON input/output interface
Integrates with the actual bot in Upvote-RotatingProxies
"""

import time
import threading
import json
import sys
import subprocess
import os
import logging
from datetime import datetime
from typing import Dict, Any
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path
from dotenv import load_dotenv
from order_history import OrderHistoryManager

# Load environment variables
load_dotenv()

# Set up logging
logger = logging.getLogger(__name__)


class UpvoteStatus(Enum):
    """Status enumeration for upvote operations"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class UpvoteSession:
    """Data class to represent an upvote session"""
    order_id: str
    url: str
    total_upvotes: int
    upvotes_per_minute: int
    status: UpvoteStatus
    start_time: str
    last_update: str
    error_message: str = None


class UpvoteProcessor:
    """
    Enhanced upvote processor that handles orders from the backend
    Integrates with the actual upvote bot
    """
    
    def __init__(self):
        self.sessions: Dict[str, UpvoteSession] = {}
        self.active_threads: Dict[str, threading.Thread] = {}
        self.order_history = OrderHistoryManager()
        
        # Handle restart recovery on initialization
        self._handle_restart_recovery()
    
    def process_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a single order from the backend
        
        Args:
            order_data (dict): Order information containing order_id, reddit_url, upvotes, upvotes_per_minute
            
        Returns:
            dict: Processing result with status and progress information
        """
        try:
            # Validate input
            required_fields = ["order_id", "reddit_url", "upvotes", "upvotes_per_minute"]
            for field in required_fields:
                if field not in order_data:
                    return {
                        "success": False,
                        "status": "failed",
                        "error": f"Missing required field: {field}",
                        "upvotes_done": 0,
                        "progress_percentage": 0
                    }
            
            order_id = order_data["order_id"]
            url = order_data["reddit_url"]
            total_upvotes = int(order_data["upvotes"])
            upvotes_per_minute = int(order_data["upvotes_per_minute"])
            
            # Validate parameters
            if total_upvotes <= 0 or upvotes_per_minute <= 0:
                return {
                    "success": False,
                    "status": "failed",
                    "error": "Invalid upvote parameters",
                    "upvotes_done": 0,
                    "progress_percentage": 0
                }
            
            # Create session
            session = UpvoteSession(
                order_id=order_id,
                url=url,
                total_upvotes=total_upvotes,
                upvotes_per_minute=upvotes_per_minute,
                status=UpvoteStatus.PENDING,
                start_time=datetime.now().isoformat(),
                last_update=datetime.now().isoformat()
            )
            
            self.sessions[order_id] = session
            
            # Add order to persistent history
            self.order_history.add_order(order_id, order_data)
            
            # Start processing
            return self._start_upvote_processing(order_id)
            
        except Exception as e:
            return {
                "success": False,
                "status": "failed",
                "error": f"Processing error: {str(e)}",
                "upvotes_done": 0,
                "progress_percentage": 0
            }
    
    def _start_upvote_processing(self, order_id: str) -> Dict[str, Any]:
        """
        Start upvote processing for an order
        
        Args:
            order_id (str): The order ID to process
            
        Returns:
            dict: Initial processing status
        """
        if order_id not in self.sessions:
            return {
                "success": False,
                "status": "failed",
                "error": "Session not found",
                "upvotes_done": 0,
                "progress_percentage": 0
            }
        
        session = self.sessions[order_id]
        session.status = UpvoteStatus.RUNNING
        session.last_update = datetime.now().isoformat()
        
        # Update history
        self.order_history.update_order_status(order_id, "running", started_at=datetime.now().isoformat())
        
        # Start processing in a thread
        thread = threading.Thread(target=self._upvote_worker, args=(order_id,))
        thread.daemon = True
        self.active_threads[order_id] = thread
        thread.start()
        
        return {
            "success": True,
            "status": session.status.value,
            "upvotes_done": session.upvotes_done,
            "total_upvotes": session.total_upvotes,
            "progress_percentage": session.progress_percentage,
            "order_id": order_id
        }
    
    def _upvote_worker(self, order_id: str):
        """
        Worker thread that performs the actual upvoting using the bot
        
        Args:
            order_id (str): The order ID to process
        """
        session = self.sessions[order_id]
        
        try:
            # Prepare JSON input for the bot
            bot_input = {
                "order_id": session.order_id,
                "reddit_url": session.url,
                "upvotes": session.total_upvotes,
                "upvotes_per_minute": session.upvotes_per_minute
            }
            
            # Path to the bot integration script (from environment variable)
            bot_script_path = os.getenv("BOT_SCRIPT_PATH", "/Users/nikanyad/Documents/UpVote/Upvote-RotatingProxies/bot_integration.py")
            
            # Path to the Python executable in the bot's virtual environment (from environment variable)
            bot_python_path = os.getenv("BOT_PYTHON_EXECUTABLE", "/Users/nikanyad/Documents/UpVote/Upvote-RotatingProxies/env/bin/python")
            
            # Bot working directory (from environment variable)
            bot_working_dir = os.getenv("BOT_WORKING_DIRECTORY", "/Users/nikanyad/Documents/UpVote/Upvote-RotatingProxies")
            
            # Check if bot script exists
            if not os.path.exists(bot_script_path):
                session.status = UpvoteStatus.FAILED
                session.error_message = f"Bot script not found at {bot_script_path}"
                session.last_update = datetime.now().isoformat()
                return
            
            # Check if bot Python executable exists
            if not os.path.exists(bot_python_path):
                session.status = UpvoteStatus.FAILED
                session.error_message = f"Bot Python executable not found at {bot_python_path}"
                session.last_update = datetime.now().isoformat()
                return
            
            # Start the bot process
            process = subprocess.Popen(
                [bot_python_path, bot_script_path, "--json-mode"],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=bot_working_dir
            )
            
            # Send JSON input to the bot and wait for completion
            stdout, stderr = process.communicate(input=json.dumps(bot_input))
            
            # Parse the bot's output
            try:
                bot_result = json.loads(stdout.strip()) if stdout.strip() else {}
                
                # Update session based on bot result - no estimation, just use what bot returns
                if bot_result.get("success", False) and bot_result.get("status") == "completed":
                    session.status = UpvoteStatus.COMPLETED
                    session.progress_percentage = 100.0
                    session.upvotes_done = session.total_upvotes  # Only set when completed
                    
                    # Update history
                    self.order_history.update_order_status(
                        order_id, "completed",
                        upvotes_done=session.total_upvotes,
                        progress_percentage=100.0,
                        completed_at=datetime.now().isoformat()
                    )
                    
                elif bot_result.get("status") == "failed":
                    session.status = UpvoteStatus.FAILED
                    session.error_message = bot_result.get("error", "Bot execution failed")
                    
                    # Update history
                    self.order_history.update_order_status(
                        order_id, "failed",
                        error_message=session.error_message,
                        completed_at=datetime.now().isoformat()
                    )
                    
                elif bot_result.get("status") == "running":
                    # Bot is still running, keep status as running without estimates
                    session.status = UpvoteStatus.RUNNING
                    
                    # Update history
                    self.order_history.update_order_status(order_id, "running")
                    
                else:
                    session.status = UpvoteStatus.FAILED
                    session.error_message = "Bot execution completed with unknown status"
                    
                    # Update history
                    self.order_history.update_order_status(
                        order_id, "failed",
                        error_message=session.error_message,
                        completed_at=datetime.now().isoformat()
                    )
                    
            except json.JSONDecodeError as e:
                session.status = UpvoteStatus.FAILED
                session.error_message = f"Failed to parse bot output: {str(e)}"
                if stderr:
                    session.error_message += f". Bot stderr: {stderr[:500]}"  # Limit error message length
                if stdout:
                    session.error_message += f". Bot stdout: {stdout[:500]}"
                
                # Update history
                self.order_history.update_order_status(
                    order_id, "failed",
                    error_message=session.error_message,
                    completed_at=datetime.now().isoformat()
                )
                
        except Exception as e:
            session.status = UpvoteStatus.FAILED
            session.error_message = f"Bot execution error: {str(e)}"
            
            # Update history
            self.order_history.update_order_status(
                order_id, "failed",
                error_message=session.error_message,
                completed_at=datetime.now().isoformat()
            )
        
        session.last_update = datetime.now().isoformat()
        
        # Clean up thread reference
        if order_id in self.active_threads:
            del self.active_threads[order_id]
    
    def get_session_status(self, order_id: str) -> Dict[str, Any]:
        """
        Get the current status of an upvote session
        
        Args:
            order_id (str): The order ID to check
            
        Returns:
            dict: Dictionary containing status and progress information
        """
        # First check in-memory sessions
        if order_id in self.sessions:
            session = self.sessions[order_id]
            
            return {
                "success": True,
                "order_id": session.order_id,
                "url": session.url,
                "status": session.status.value,
                "upvotes_done": session.upvotes_done,
                "total_upvotes": session.total_upvotes,
                "upvotes_per_minute": session.upvotes_per_minute,
                "progress_percentage": session.progress_percentage,
                "start_time": session.start_time,
                "last_update": session.last_update,
                "error": session.error_message
            }
        
        # Fallback to persistent history
        historical_order = self.order_history.get_order(order_id)
        if historical_order:
            # If order found in history but not in memory, it means bot restarted
            # Check if it was incomplete when restart happened
            status = historical_order.get("status", "not_found")
            
            return {
                "success": True,
                "order_id": order_id,
                "url": historical_order.get("reddit_url", ""),
                "status": status,
                "upvotes_done": historical_order.get("upvotes_done", 0),
                "total_upvotes": historical_order.get("total_upvotes", 0),
                "upvotes_per_minute": historical_order.get("upvotes_per_minute", 1),
                "progress_percentage": historical_order.get("progress_percentage", 0.0),
                "start_time": historical_order.get("started_at"),
                "last_update": historical_order.get("last_update"),
                "error": historical_order.get("error_message")
            }
        
        # Order not found anywhere
        return {
            "success": False,
            "status": "not_found",
            "error": "Session not found",
            "upvotes_done": 0,
            "progress_percentage": 0
        }
    
        return {
            order_id: self.get_session_status(order_id)
            for order_id in self.sessions
        }
    
    def _handle_restart_recovery(self):
        """
        Handle recovery of orders that were interrupted by restart
        Mark incomplete orders as failed
        """
        try:
            all_orders = self.order_history.get_all_orders()
            
            for order_id, order_data in all_orders.items():
                status = order_data.get("status")
                
                # If order was in progress when restart happened, mark as failed
                if status in ["pending", "running"]:
                    self.order_history.mark_as_failed_after_restart(order_id)
                    logger.warning(f"Marked order {order_id} as failed due to restart (was {status})")
            
            logger.info("Completed restart recovery process")
            
        except Exception as e:
            logger.error(f"Error during restart recovery: {e}")
    
def main():
    """
    Main function that handles JSON input from the backend
    """
    try:
        # Read JSON input from stdin
        input_data = sys.stdin.read().strip()
        if not input_data:
            result = {
                "success": False,
                "status": "failed",
                "error": "No input data provided",
                "upvotes_done": 0,
                "progress_percentage": 0
            }
            print(json.dumps(result))
            sys.exit(1)
        
        # Parse JSON input
        try:
            order_data = json.loads(input_data)
        except json.JSONDecodeError as e:
            result = {
                "success": False,
                "status": "failed",
                "error": f"Invalid JSON input: {str(e)}",
                "upvotes_done": 0,
                "progress_percentage": 0
            }
            print(json.dumps(result))
            sys.exit(1)
        
        # Create processor and process the order
        processor = UpvoteProcessor()
        result = processor.process_order(order_data)
        
        # If processing started successfully, wait for completion
        if result.get("success") and result.get("status") in ["running", "pending"]:
            order_id = result.get("order_id")
            if order_id:
                # Wait for processing to complete or fail
                max_wait_time = 300  # 5 minutes max
                wait_interval = 5    # Check every 5 seconds
                waited = 0
                
                while waited < max_wait_time:
                    time.sleep(wait_interval)
                    waited += wait_interval
                    
                    status = processor.get_session_status(order_id)
                    if status.get("status") in ["completed", "failed"]:
                        result = status
                        break
                
                # If still running after max wait time, return current status
                if result.get("status") == "running":
                    result = processor.get_session_status(order_id)
        
        # Output final result as JSON
        print(json.dumps(result))
        
        # Exit with appropriate code
        if result.get("success") and result.get("status") == "completed":
            sys.exit(0)
        else:
            sys.exit(1)
            
    except Exception as e:
        # Handle any unexpected errors
        result = {
            "success": False,
            "status": "failed",
            "error": f"Unexpected error: {str(e)}",
            "upvotes_done": 0,
            "progress_percentage": 0
        }
        print(json.dumps(result))
        sys.exit(1)


if __name__ == "__main__":
    main()

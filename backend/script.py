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
from datetime import datetime
from typing import Dict, Any
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path


class UpvoteStatus(Enum):
    """Status enumeration for upvote operations"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    PAUSED = "paused"
    FAILED = "failed"


@dataclass
class UpvoteSession:
    """Data class to represent an upvote session"""
    order_id: str
    url: str
    total_upvotes: int
    upvotes_per_minute: int
    status: UpvoteStatus
    upvotes_done: int
    start_time: str
    last_update: str
    progress_percentage: float = 0.0
    error_message: str = None


class UpvoteProcessor:
    """
    Enhanced upvote processor that handles orders from the backend
    Integrates with the actual upvote bot
    """
    
    def __init__(self):
        self.sessions: Dict[str, UpvoteSession] = {}
        self.active_threads: Dict[str, threading.Thread] = {}
    
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
                upvotes_done=0,
                start_time=datetime.now().isoformat(),
                last_update=datetime.now().isoformat()
            )
            
            self.sessions[order_id] = session
            
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
            
            # Path to the bot integration script
            bot_script_path = "/Users/nikanyad/Documents/UpVote/Upvote-RotatingProxies/bot_integration.py"
            
            # Check if bot script exists
            if not os.path.exists(bot_script_path):
                session.status = UpvoteStatus.FAILED
                session.error_message = f"Bot script not found at {bot_script_path}"
                session.last_update = datetime.now().isoformat()
                return
            
            # Start the bot process with real-time monitoring
            process = subprocess.Popen(
                ["python3", bot_script_path, "--json-mode"],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd="/Users/nikanyad/Documents/UpVote/Upvote-RotatingProxies"
            )
            
            # Send JSON input to the bot and wait for it to start
            stdout, stderr = process.communicate(input=json.dumps(bot_input))
            
            # Parse the bot's output
            try:
                bot_result = json.loads(stdout.strip()) if stdout.strip() else {}
                
                # Update session based on bot result
                session.upvotes_done = bot_result.get("upvotes_done", 0)
                session.progress_percentage = bot_result.get("progress_percentage", 0.0)
                
                if bot_result.get("success", False) and bot_result.get("status") == "completed":
                    session.status = UpvoteStatus.COMPLETED
                    session.progress_percentage = 100.0
                elif bot_result.get("status") == "failed":
                    session.status = UpvoteStatus.FAILED
                    session.error_message = bot_result.get("error", "Bot execution failed")
                else:
                    session.status = UpvoteStatus.FAILED
                    session.error_message = "Bot execution completed with unknown status"
                    
            except json.JSONDecodeError as e:
                session.status = UpvoteStatus.FAILED
                session.error_message = f"Failed to parse bot output: {str(e)}"
                if stderr:
                    session.error_message += f". Bot stderr: {stderr[:500]}"  # Limit error message length
                if stdout:
                    session.error_message += f". Bot stdout: {stdout[:500]}"
                
        except Exception as e:
            session.status = UpvoteStatus.FAILED
            session.error_message = f"Bot execution error: {str(e)}"
        
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
        if order_id not in self.sessions:
            return {
                "success": False,
                "status": "not_found",
                "error": "Session not found",
                "upvotes_done": 0,
                "progress_percentage": 0
            }
        
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
    
    def pause_session(self, order_id: str) -> bool:
        """
        Pause an active upvote session
        
        Args:
            order_id (str): The order ID to pause
            
        Returns:
            bool: True if successfully paused, False otherwise
        """
        if order_id not in self.sessions:
            return False
        
        session = self.sessions[order_id]
        if session.status == UpvoteStatus.RUNNING:
            session.status = UpvoteStatus.PAUSED
            return True
        
        return False
    
    def resume_session(self, order_id: str) -> bool:
        """
        Resume a paused upvote session
        
        Args:
            order_id (str): The order ID to resume
            
        Returns:
            bool: True if successfully resumed, False otherwise
        """
        if order_id not in self.sessions:
            return False
        
        session = self.sessions[order_id]
        if session.status == UpvoteStatus.PAUSED:
            session.status = UpvoteStatus.RUNNING
            # Restart the worker thread
            thread = threading.Thread(target=self._upvote_worker, args=(order_id,))
            thread.daemon = True
            self.active_threads[order_id] = thread
            thread.start()
            return True
        
        return False
    
    def get_all_sessions(self) -> Dict[str, Dict[str, Any]]:
        """
        Get status of all sessions
        
        Returns:
            dict: Dictionary of all session statuses
        """
        return {
            order_id: self.get_session_status(order_id)
            for order_id in self.sessions
        }


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

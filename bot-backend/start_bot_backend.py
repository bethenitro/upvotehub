#!/bin/bash
"""
Startup script for the Bot Backend
"""

import uvicorn
import os
import sys
from pathlib import Path

# Add the parent directory to Python path for imports
current_dir = Path(__file__).parent
sys.path.append(str(current_dir.parent / "backend"))

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def main():
    """Start the bot backend server"""
    host = os.getenv("BOT_BACKEND_HOST", "0.0.0.0")
    port = int(os.getenv("BOT_BACKEND_PORT", "8001"))
    log_level = os.getenv("BOT_BACKEND_LOG_LEVEL", "info")
    
    print(f"Starting Bot Backend on {host}:{port}")
    print(f"Log level: {log_level}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        log_level=log_level,
        reload=True,
        access_log=True
    )

if __name__ == "__main__":
    main()

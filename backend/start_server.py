#!/usr/bin/env python3
"""
Start the FastAPI backend server
"""
import uvicorn
import os
from app.main import app
from app.config.settings import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        log_level="info"
    )

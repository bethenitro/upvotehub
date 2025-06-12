from fastapi import Request, HTTPException
from datetime import datetime, timedelta
from typing import Dict, Tuple
import time
from ..utils.logger import logger

class RateLimiter:
    def __init__(self):
        self.requests: Dict[str, list] = {}
        self.window_size = 60  # 1 minute window
        self.max_requests = 60  # 60 requests per minute

    def _get_client_id(self, request: Request) -> str:
        """Get unique client identifier"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0]
        return request.client.host

    def _cleanup_old_requests(self, client_id: str):
        """Remove requests older than window_size"""
        now = time.time()
        self.requests[client_id] = [
            req_time for req_time in self.requests[client_id]
            if now - req_time < self.window_size
        ]

    async def check_rate_limit(self, request: Request):
        """Check if request is within rate limits"""
        client_id = self._get_client_id(request)
        now = time.time()

        # Initialize client's request history if not exists
        if client_id not in self.requests:
            self.requests[client_id] = []

        # Cleanup old requests
        self._cleanup_old_requests(client_id)

        # Check if rate limit is exceeded
        if len(self.requests[client_id]) >= self.max_requests:
            logger.warning("rate_limit_exceeded",
                client_id=client_id,
                endpoint=request.url.path
            )
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later."
            )

        # Add current request
        self.requests[client_id].append(now)

        # Log rate limit info
        logger.debug("rate_limit_check",
            client_id=client_id,
            endpoint=request.url.path,
            requests_in_window=len(self.requests[client_id])
        )

# Global rate limiter instance
rate_limiter = RateLimiter() 
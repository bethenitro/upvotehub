from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import time
from ..utils.monitoring import metrics_collector
from ..utils.logger import logger

class ResponseTimerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Record response time
            metrics_collector.record_api_response_time(
                request.url.path,
                process_time
            )
            
            # Add response time header
            response.headers["X-Process-Time"] = str(process_time)
            
            # Log response time
            logger.debug("api_response_time",
                endpoint=request.url.path,
                method=request.method,
                status_code=response.status_code,
                process_time=process_time
            )
            
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            
            # Record error response time
            metrics_collector.record_api_response_time(
                request.url.path,
                process_time
            )
            
            # Log error
            logger.error("api_error",
                endpoint=request.url.path,
                method=request.method,
                error=str(e),
                process_time=process_time
            )
            
            raise 
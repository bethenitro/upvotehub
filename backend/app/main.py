from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
import traceback

from app.middleware.rate_limiter import rate_limiter
from app.middleware.response_timer import ResponseTimerMiddleware
from app.utils.task_manager import task_manager
from app.utils.monitoring import metrics_collector
from app.utils.logger import logger
from app.config.database import Database
from app.routes import user_routes, order_routes, payment_routes, auth_routes
from app.config.settings import settings

app = FastAPI(
    title="Upvote API",
    description="API for managing upvote orders and payments",
    version="1.0.0"
)

# Add CORS middleware - configured to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,  # Must be False when allow_origins=["*"]
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Add response timer middleware
app.add_middleware(ResponseTimerMiddleware)

# Add rate limiter middleware
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Skip rate limiting for OPTIONS requests (CORS preflight)
    if request.method == "OPTIONS":
        return await call_next(request)
    await rate_limiter.check_rate_limit(request)
    return await call_next(request)

# Exception handler for request validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error("request_validation_error", 
        url=str(request.url),
        method=request.method,
        errors=exc.errors(),
        body=await request.body() if hasattr(request, 'body') else None
    )
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

# Exception handler for HTTP exceptions
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

# Exception handler for general exceptions
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    # Log the exception traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred."},
    )

# Include routers
app.include_router(auth_routes.router, prefix="/api/auth", tags=["auth"])
app.include_router(user_routes.router, prefix="/api/users", tags=["users"])
app.include_router(order_routes.router, prefix="/api/orders", tags=["orders"])
app.include_router(payment_routes.router, prefix="/api/payments", tags=["payments"])

@app.on_event("startup")
async def startup_event():
    """Start background tasks and initialize components"""
    await Database.connect_db()
    await task_manager.start()
    await metrics_collector.collect_metrics()

@app.on_event("shutdown")
async def shutdown_event():
    """Stop background tasks"""
    await task_manager.stop()
    await Database.close_db()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "metrics": metrics_collector.get_metrics()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
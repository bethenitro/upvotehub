from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.middleware.rate_limiter import rate_limiter
from app.middleware.response_timer import ResponseTimerMiddleware
from app.utils.task_manager import task_manager
from app.utils.monitoring import metrics_collector
from app.routes import user_routes, order_routes, payment_routes
from app.config.settings import settings

app = FastAPI(
    title="Upvote API",
    description="API for managing upvote orders and payments",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add response timer middleware
app.add_middleware(ResponseTimerMiddleware)

# Add rate limiter middleware
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    await rate_limiter.check_rate_limit(request)
    return await call_next(request)

# Include routers
app.include_router(user_routes.router, prefix="/api/users", tags=["users"])
app.include_router(order_routes.router, prefix="/api/orders", tags=["orders"])
app.include_router(payment_routes.router, prefix="/api/payments", tags=["payments"])

@app.on_event("startup")
async def startup_event():
    """Start background tasks and initialize components"""
    await task_manager.start()
    await metrics_collector.collect_metrics()

@app.on_event("shutdown")
async def shutdown_event():
    """Stop background tasks"""
    await task_manager.stop()

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
import logging
import sys
import json
from ..config.settings import get_settings
import structlog
from pathlib import Path

settings = get_settings()

def setup_logging():
    # Create logs directory if it doesn't exist
    Path(settings.LOG_FILE).parent.mkdir(parents=True, exist_ok=True)
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        wrapper_class=structlog.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # Configure file handler
    file_handler = logging.FileHandler(settings.LOG_FILE)
    log_format = '%(asctime)s %(name)s %(levelname)s %(message)s'
    file_handler.setFormatter(logging.Formatter(log_format))
    
    # Configure console handler
    console_handler = logging.StreamHandler(sys.stdout)
    json_format = '%(asctime)s %(name)s %(levelname)s %(message)s'
    console_handler.setFormatter(logging.Formatter(json_format))
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(settings.LOG_LEVEL)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)
    
    # Configure uvicorn access logger
    uvicorn_access = logging.getLogger("uvicorn.access")
    uvicorn_access.setLevel(settings.LOG_LEVEL)
    uvicorn_access.addHandler(file_handler)
    uvicorn_access.addHandler(console_handler)
    
    return structlog.get_logger()

logger = setup_logging() 
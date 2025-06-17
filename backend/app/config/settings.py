from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv
import json

load_dotenv()

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Upvote Backend"
    DEBUG: bool = True
    VERSION: str = "1.0.0"
    PORT: int = int(os.getenv("PORT", 8000))
    HOST: str = "0.0.0.0"
    
    # MongoDB
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "upvote_db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS - Parse the JSON string from environment variable
    @property
    def CORS_ORIGINS(self) -> list:
        cors_origins = os.getenv("CORS_ORIGINS", '["http://localhost:5173", "http://localhost:8080"]')
        try:
            parsed_origins = json.loads(cors_origins)
            # If the list contains "*", return ["*"] to allow all origins
            if "*" in parsed_origins:
                return ["*"]
            return parsed_origins
        except:
            return ["*"]  # Default to allow all origins if parsing fails
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    LOG_FILE: str = "logs/app.log"
    
    # Order Processing
    ORDER_SCRIPT_PATH: str = "script.py"
    
    # Cryptomus Personal API Configuration (Replaces BTCPay)
    CRYPTOMUS_API_KEY: str = os.getenv("CRYPTOMUS_API_KEY", "")
    CRYPTOMUS_USER_ID: str = os.getenv("CRYPTOMUS_USER_ID", "")
    
    # Proxy Configuration
    PROXY_CONFIG_FILE: str = os.getenv("PROXY_CONFIG_FILE", "/Users/nikanyad/Documents/UpVote/Upvote-RotatingProxies/mobile_proxies.json")
    
    # Admin Configuration
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@upvotezone.com")
    
    # Frontend URL for redirects
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    class Config:
        case_sensitive = True

def get_settings() -> Settings:
    return Settings() 

# Note: Removed @lru_cache() to avoid caching settings with empty environment variables
# The settings will be created fresh each time to ensure environment variables are loaded correctly

# Create a settings instance for backward compatibility with imports
settings = get_settings()

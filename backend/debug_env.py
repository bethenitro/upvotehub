#!/usr/bin/env python3
import os
from dotenv import load_dotenv

print("=== Environment Variables Debug ===")
print(f"Current working directory: {os.getcwd()}")
print(f".env file exists: {os.path.exists('.env')}")

# Load .env file
load_dotenv()

print("\n=== BTCPay Environment Variables ===")
btc_vars = [
    "BTCPAY_SERVER_URL",
    "BTCPAY_API_KEY", 
    "BTCPAY_STORE_ID",
    "BTCPAY_WEBHOOK_SECRET"
]

for var in btc_vars:
    value = os.getenv(var)
    print(f"{var}: {'SET' if value else 'NOT SET'} (length: {len(value) if value else 0})")
    if value:
        print(f"  Value: {value[:20]}...")

print("\n=== All Environment Variables Starting with BTCPAY ===")
for key, value in os.environ.items():
    if key.startswith("BTCPAY"):
        print(f"{key}: {value}")

print("\n=== Settings Import Test ===")
try:
    from app.config.settings import get_settings
    settings = get_settings()
    print(f"BTCPAY_SERVER_URL from settings: '{settings.BTCPAY_SERVER_URL}'")
    print(f"BTCPAY_STORE_ID from settings: '{settings.BTCPAY_STORE_ID}'")
    print(f"BTCPAY_API_KEY from settings: {'SET' if settings.BTCPAY_API_KEY else 'NOT SET'}")
except Exception as e:
    print(f"Error importing settings: {e}")

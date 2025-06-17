#!/usr/bin/env python3
import os
from dotenv import load_dotenv

print("=== Environment Variables Debug ===")
print(f"Current working directory: {os.getcwd()}")
print(f".env file exists: {os.path.exists('.env')}")

# Load .env file
load_dotenv()

print("\n=== Cryptomus Environment Variables ===")
cryptomus_vars = [
    "CRYPTOMUS_API_KEY",
    "CRYPTOMUS_USER_ID"
]

for var in cryptomus_vars:
    value = os.getenv(var)
    print(f"{var}: {'SET' if value else 'NOT SET'} (length: {len(value) if value else 0})")
    if value:
        if var.endswith("KEY"):
            print(f"  Value: {'*' * min(len(value), 8)}... (MASKED)")
        else:
            print(f"  Value: {value[:20]}...")

print("\n=== All Environment Variables Starting with CRYPTOMUS ===")
for key, value in os.environ.items():
    if key.startswith("CRYPTOMUS"):
        if key.endswith("KEY"):
            print(f"{key}: {'*' * min(len(value), 8)}... (MASKED)")
        else:
            print(f"{key}: {value}")

print("\n=== Settings Import Test ===")
try:
    from app.config.settings import get_settings
    settings = get_settings()
    print(f"CRYPTOMUS_API_KEY from settings: {'SET' if settings.CRYPTOMUS_API_KEY else 'NOT SET'}")
    print(f"CRYPTOMUS_USER_ID from settings: '{settings.CRYPTOMUS_USER_ID}'")
except Exception as e:
    print(f"Error importing settings: {e}")

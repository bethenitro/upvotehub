#!/usr/bin/env python3
import os
from dotenv import load_dotenv

print("=== Environment Debug When Cryptomus Service Initializes ===")
print(f"Current working directory: {os.getcwd()}")
print(f"Python path: {os.path.dirname(os.path.abspath(__file__))}")

# Check if .env file exists in various locations
locations = [
    ".env",
    "/Users/nikanyad/Documents/UpVote/upvote-integration/upvotehub/backend/.env",
    os.path.join(os.getcwd(), ".env"),
    os.path.join(os.path.dirname(__file__), ".env"),
    os.path.join(os.path.dirname(__file__), "..", ".env")
]

for loc in locations:
    exists = os.path.exists(loc)
    print(f".env exists at {loc}: {exists}")
    if exists:
        print(f"  -> Found at: {os.path.abspath(loc)}")

# Try loading from the specific path
print("\n=== Loading .env from specific path ===")
env_path = "/Users/nikanyad/Documents/UpVote/upvote-integration/upvotehub/backend/.env"
load_dotenv(env_path)

cryptomus_vars = ["CRYPTOMUS_API_KEY", "CRYPTOMUS_USER_ID"]
for var in cryptomus_vars:
    value = os.getenv(var)
    print(f"{var}: {'SET' if value else 'NOT SET'} (length: {len(value) if value else 0})")
    if value:
        if var.endswith("KEY"):
            print(f"  Value: {'*' * min(len(value), 8)}... (MASKED)")
        else:
            print(f"  Value: {value[:20]}...")

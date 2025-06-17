#!/usr/bin/env python3
"""
Test script to verify Cryptomus Personal API credentials and endpoints
Run this script to test your Cryptomus configuration before using it in the main app.
"""

import os
import sys
import json
import hashlib
import base64
import asyncio
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_cryptomus_api():
    """Test Cryptomus Personal API with your credentials"""
    
    # Get credentials from environment
    api_key = os.getenv("CRYPTOMUS_API_KEY", "")
    user_id = os.getenv("CRYPTOMUS_USER_ID", "")
    
    print("🔧 Cryptomus API Test")
    print("=" * 50)
    
    # Check if credentials are configured
    if not api_key or api_key == "your-cryptomus-api-key-here":
        print("❌ CRYPTOMUS_API_KEY not configured in .env file")
        return False
        
    if not user_id or user_id == "your-cryptomus-user-id-here":
        print("❌ CRYPTOMUS_USER_ID not configured in .env file")
        return False
    
    print(f"✅ API Key configured: {api_key[:8]}...")
    print(f"✅ User ID configured: {user_id}")
    
    # Test 1: Get Payment Services (simplest endpoint)
    print("\n🧪 Test 1: Get Payment Services")
    print("-" * 30)
    
    try:
        # Generate signature for empty payload
        payload = "{}"
        encoded_payload = base64.b64encode(payload.encode('utf-8')).decode('utf-8')
        signature_string = encoded_payload + api_key
        signature = hashlib.md5(signature_string.encode('utf-8')).hexdigest()
        
        headers = {
            "userId": user_id,
            "sign": signature,
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.cryptomus.com/v1/payment/services",
                headers=headers,
                content=payload,
                timeout=30.0
            )
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"Response: {json.dumps(result, indent=2)}")
                
                if result.get("state") == 0:
                    services = result.get("result", [])
                    print(f"✅ Success! Found {len(services)} payment services")
                    if services:
                        print("Available cryptocurrencies:")
                        for service in services[:5]:  # Show first 5
                            network = service.get("network", "Unknown")
                            currency = service.get("currency", "Unknown")
                            available = service.get("is_available", False)
                            status = "✅" if available else "❌"
                            print(f"  {status} {currency} on {network}")
                    return True
                else:
                    print(f"❌ API Error: {result.get('message', 'Unknown error')}")
                    return False
            else:
                print(f"❌ HTTP Error: {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return False

def main():
    """Main test function"""
    print("🚀 Starting Cryptomus API Test...\n")
    
    # Check if .env file exists
    env_file = ".env"
    if not os.path.exists(env_file):
        print(f"❌ .env file not found at {env_file}")
        print("Please create a .env file with your Cryptomus credentials.")
        return
    
    # Run async test
    result = asyncio.run(test_cryptomus_api())
    
    print("\n" + "=" * 50)
    if result:
        print("🎉 Cryptomus API test PASSED!")
        print("Your credentials are working. You can now test payment creation.")
    else:
        print("❌ Cryptomus API test FAILED!")
        print("Please check your credentials and try again.")
        print("\nTo get credentials:")
        print("1. Go to https://cryptomus.com")
        print("2. Create personal account & verify")
        print("3. Go to Settings → API")
        print("4. Generate Personal API key (NOT merchant)")
        print("5. Copy User ID (UUID format)")
        print("6. Update .env file with actual values")

if __name__ == "__main__":
    main()

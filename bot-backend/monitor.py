#!/usr/bin/env python3
"""
UpVote Backend Monitor
Monitors both main and bot backends and provides status information
"""

import asyncio
import httpx
import json
import time
import os
from datetime import datetime
from typing import Dict, Any
from dotenv import load_dotenv

class BackendMonitor:
    def __init__(self, main_backend_url: str = None, bot_backend_url: str = None):
        # Load environment variables
        load_dotenv()
        
        # Use provided URLs or fallback to environment variables or defaults
        self.main_backend_url = (
            main_backend_url or 
            os.getenv("MAIN_BACKEND_URL") or 
            "http://localhost:8000"
        )
        self.bot_backend_url = (
            bot_backend_url or 
            os.getenv("BOT_BACKEND_URL") or 
            "http://localhost:8001"
        )
        
        self.client = httpx.AsyncClient(timeout=5.0)
        
        # Print configuration on startup
        print(f"📡 Monitoring Configuration:")
        print(f"   Main Backend: {self.main_backend_url}")
        print(f"   Bot Backend:  {self.bot_backend_url}")
    
    async def check_main_backend(self) -> Dict[str, Any]:
        """Check main backend health"""
        try:
            response = await self.client.get(f"{self.main_backend_url}/health")
            if response.status_code == 200:
                data = response.json()
                return {
                    "status": "healthy",
                    "data": data,
                    "response_time": response.elapsed.total_seconds()
                }
            else:
                return {
                    "status": "unhealthy",
                    "error": f"HTTP {response.status_code}",
                    "response_time": response.elapsed.total_seconds()
                }
        except Exception as e:
            return {
                "status": "unreachable",
                "error": str(e),
                "response_time": None
            }
    
    async def check_bot_backend(self) -> Dict[str, Any]:
        """Check bot backend health"""
        try:
            response = await self.client.get(f"{self.bot_backend_url}/health")
            if response.status_code == 200:
                data = response.json()
                return {
                    "status": "healthy",
                    "data": data,
                    "response_time": response.elapsed.total_seconds()
                }
            else:
                return {
                    "status": "unhealthy",
                    "error": f"HTTP {response.status_code}",
                    "response_time": response.elapsed.total_seconds()
                }
        except Exception as e:
            return {
                "status": "unreachable",
                "error": str(e),
                "response_time": None
            }
    
    async def check_bot_integration(self) -> Dict[str, Any]:
        """Check if main backend can communicate with bot backend"""
        try:
            response = await self.client.get(f"{self.main_backend_url}/api/bot/health")
            if response.status_code == 200:
                data = response.json()
                return {
                    "status": "healthy",
                    "data": data,
                    "response_time": response.elapsed.total_seconds()
                }
            else:
                return {
                    "status": "unhealthy",
                    "error": f"HTTP {response.status_code}",
                    "response_time": response.elapsed.total_seconds()
                }
        except Exception as e:
            return {
                "status": "unreachable",
                "error": str(e),
                "response_time": None
            }
    
    async def get_bot_orders(self) -> Dict[str, Any]:
        """Get current bot orders"""
        try:
            response = await self.client.get(f"{self.bot_backend_url}/orders")
            if response.status_code == 200:
                orders = response.json()
                
                # Categorize orders by status
                status_counts = {}
                for order in orders:
                    status = order.get("status", "unknown")
                    status_counts[status] = status_counts.get(status, 0) + 1
                
                return {
                    "total_orders": len(orders),
                    "status_breakdown": status_counts,
                    "recent_orders": orders[:5]  # Show last 5 orders
                }
            else:
                return {
                    "error": f"HTTP {response.status_code}",
                    "total_orders": 0
                }
        except Exception as e:
            return {
                "error": str(e),
                "total_orders": 0
            }
    
    def format_status(self, service: str, status_data: Dict[str, Any]) -> str:
        """Format status information for display"""
        status = status_data.get("status", "unknown")
        
        if status == "healthy":
            emoji = "✅"
            response_time = status_data.get("response_time", 0)
            return f"{emoji} {service}: {status} ({response_time:.3f}s)"
        elif status == "unhealthy":
            emoji = "⚠️"
            error = status_data.get("error", "unknown error")
            return f"{emoji} {service}: {status} - {error}"
        elif status == "unreachable":
            emoji = "❌"
            error = status_data.get("error", "connection failed")
            return f"{emoji} {service}: {status} - {error}"
        else:
            emoji = "❓"
            return f"{emoji} {service}: {status}"
    
    async def run_single_check(self):
        """Run a single health check of all services"""
        print(f"\n🔍 Backend Health Check - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("-" * 70)
        
        # Check main backend
        main_status = await self.check_main_backend()
        print(self.format_status("Main Backend (8000)", main_status))
        
        # Check bot backend
        bot_status = await self.check_bot_backend()
        print(self.format_status("Bot Backend (8001)", bot_status))
        
        # Check integration if both are healthy
        if main_status.get("status") == "healthy" and bot_status.get("status") == "healthy":
            integration_status = await self.check_bot_integration()
            print(self.format_status("Bot Integration", integration_status))
        else:
            print("⚠️ Bot Integration: Cannot test (one or both backends unhealthy)")
        
        # Get bot orders summary
        if bot_status.get("status") == "healthy":
            print("\n📊 Bot Orders Summary:")
            orders_data = await self.get_bot_orders()
            
            if "error" not in orders_data:
                print(f"   Total Orders: {orders_data['total_orders']}")
                
                if orders_data.get("status_breakdown"):
                    print("   Status Breakdown:")
                    for status, count in orders_data["status_breakdown"].items():
                        print(f"     {status}: {count}")
                
                if orders_data.get("recent_orders"):
                    print("   Recent Orders:")
                    for order in orders_data["recent_orders"]:
                        order_id = order.get("order_id", "unknown")
                        status = order.get("status", "unknown")
                        print(f"     {order_id}: {status}")
            else:
                print(f"   Error: {orders_data['error']}")
        
        print("-" * 70)
    
    async def run_continuous_monitoring(self, interval=30):
        """Run continuous monitoring with specified interval"""
        print("🚀 Starting Continuous Backend Monitoring")
        print(f"📊 Checking every {interval} seconds")
        print("Press Ctrl+C to stop")
        
        try:
            while True:
                await self.run_single_check()
                await asyncio.sleep(interval)
        except KeyboardInterrupt:
            print("\n\n🛑 Monitoring stopped by user")
        finally:
            await self.client.aclose()
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()

async def main():
    """Main function"""
    import sys
    
    # Parse command line arguments
    main_backend_url = None
    bot_backend_url = None
    
    # Check command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == "--continuous" or sys.argv[1] == "-c":
            interval = 30
            if len(sys.argv) > 2:
                try:
                    interval = int(sys.argv[2])
                except ValueError:
                    print("Invalid interval. Using default 30 seconds.")
            
            monitor = BackendMonitor(main_backend_url, bot_backend_url)
            await monitor.run_continuous_monitoring(interval)
            
        elif sys.argv[1] == "--help" or sys.argv[1] == "-h":
            print("UpVote Backend Monitor")
            print("Usage:")
            print("  python monitor.py                           # Single check")
            print("  python monitor.py -c [interval]             # Continuous monitoring")
            print("  python monitor.py --main-url <url>          # Set main backend URL")
            print("  python monitor.py --bot-url <url>           # Set bot backend URL")
            print("  python monitor.py --help                    # Show this help")
            print("")
            print("Environment Variables:")
            print("  MAIN_BACKEND_URL   # Main backend URL (default: http://localhost:8000)")
            print("  BOT_BACKEND_URL    # Bot backend URL (default: http://localhost:8001)")
            print("")
            print("Examples:")
            print("  python monitor.py --main-url http://prod-main:8000 --bot-url http://prod-bot:8001")
            print("  MAIN_BACKEND_URL=http://staging:8000 python monitor.py")
            
        elif sys.argv[1] == "--main-url":
            if len(sys.argv) > 2:
                main_backend_url = sys.argv[2]
                # Check for additional arguments
                if len(sys.argv) > 4 and sys.argv[3] == "--bot-url":
                    bot_backend_url = sys.argv[4]
            monitor = BackendMonitor(main_backend_url, bot_backend_url)
            await monitor.run_single_check()
            await monitor.close()
            
        elif sys.argv[1] == "--bot-url":
            if len(sys.argv) > 2:
                bot_backend_url = sys.argv[2]
                # Check for additional arguments
                if len(sys.argv) > 4 and sys.argv[3] == "--main-url":
                    main_backend_url = sys.argv[4]
            monitor = BackendMonitor(main_backend_url, bot_backend_url)
            await monitor.run_single_check()
            await monitor.close()
            
        else:
            print("Unknown argument. Use --help for usage information.")
    else:
        # Single check with default or environment URLs
        monitor = BackendMonitor(main_backend_url, bot_backend_url)
        await monitor.run_single_check()
        await monitor.close()

if __name__ == "__main__":
    asyncio.run(main())

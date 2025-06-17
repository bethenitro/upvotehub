# BTCPay Server Configuration for UpVote Integration
# Copy this to your .env file and fill in the actual values

# =============================================================================
# BTCPay Server Configuration (Required for Crypto Payments)
# =============================================================================

# BTCPay Server instance URL (without trailing slash)
# Example: https://btcpay.yourdomain.com or https://testnet.demo.btcpayserver.org
BTCPAY_SERVER_URL=

# BTCPay API Key (Generate in BTCPay Server > Account > Manage Account > API Keys)
# Required permissions: btcpay.store.canmodifyinvoices, btcpay.store.cancreatenonapprovedinvoices
BTCPAY_API_KEY=

# BTCPay Store ID (Found in BTCPay Server > Stores > Store Settings > General)
BTCPAY_STORE_ID=

# Webhook Secret (Generate a random string for webhook signature verification)
# Recommended: Use a 32+ character random string
BTCPAY_WEBHOOK_SECRET=

# Frontend URL for payment redirects
# Example: https://yourdomain.com or http://localhost:5173 for development
FRONTEND_URL=http://localhost:5173

# =============================================================================
# BTCPay Server Setup Instructions
# =============================================================================

# 1. Deploy BTCPay Server:
#    - Use BTCPay Server Docker deployment: https://docs.btcpayserver.org/Docker/
#    - Or use a hosted solution like Voltage.cloud or Luna Node
#    - For testing, you can use the public testnet instance: https://testnet.demo.btcpayserver.org

# 2. Create a Store:
#    - Login to BTCPay Server admin panel
#    - Go to "Stores" > "Create a new store"
#    - Fill in store name and copy the Store ID from settings

# 3. Configure Payment Methods:
#    - In your store, go to "Settings" > "Payment methods" 
#    - Enable desired cryptocurrencies (Bitcoin, Ethereum, Litecoin, etc.)
#    - Configure wallet derivation schemes or connect external wallets

# 4. Generate API Key:
#    - Go to "Account" > "Manage Account" > "API Keys"
#    - Create new API key with permissions:
#      * btcpay.store.canmodifyinvoices
#      * btcpay.store.cancreatenonapprovedinvoices
#    - Copy the generated API key

# 5. Set up Webhooks:
#    - Go to your store "Settings" > "Webhooks"
#    - Add webhook with URL: https://yourdomain.com/api/payments/btcpay/webhook
#    - Enable events: Invoice payment settled, Invoice expired, Invoice invalid
#    - Set the webhook secret (same as BTCPAY_WEBHOOK_SECRET above)

# =============================================================================
# Development Environment
# =============================================================================

# For development, you can use BTCPay testnet:
# BTCPAY_SERVER_URL=https://testnet.demo.btcpayserver.org
# This allows testing with testnet cryptocurrencies (no real money)

# =============================================================================
# Production Checklist
# =============================================================================

# ☐ BTCPay Server deployed and accessible
# ☐ SSL certificate configured for BTCPay Server
# ☐ Store created and payment methods configured
# ☐ API key generated with correct permissions
# ☐ Webhook endpoint configured and tested
# ☐ Environment variables set in production environment
# ☐ Database backup strategy in place
# ☐ Monitoring and alerting configured

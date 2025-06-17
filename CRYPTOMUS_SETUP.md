# Cryptomus Personal API Configuration for UpVote Integration
# Copy these values to your .env file and fill in the actual values

# =============================================================================
# Cryptomus Personal API Configuration (Required for Crypto Payments)
# =============================================================================

# Cryptomus API Key (Generate in Cryptomus Personal Account > API Settings)
# This is your Personal API key, NOT the merchant API key
CRYPTOMUS_API_KEY=

# Cryptomus User ID (Found in Cryptomus Personal Account > API Settings)
# This is your user UUID identifier
CRYPTOMUS_USER_ID=

# Frontend URL for payment redirects
# Example: https://yourdomain.com or http://localhost:5173 for development
FRONTEND_URL=http://localhost:5173

# =============================================================================
# Cryptomus Personal API Setup Instructions
# =============================================================================

# 1. Create Cryptomus Account:
#    - Go to https://cryptomus.com and create an account
#    - Complete KYC verification if required
#    - Access your personal dashboard

# 2. Generate Personal API Keys:
#    - Navigate to your personal account settings
#    - Go to "API" or "API Settings" section
#    - Generate a new Personal API key (NOT merchant API)
#    - Copy both the API key and your User ID (UUID)
#    - Important: Make sure you're using the PERSONAL API, not the merchant API

# 3. Configure Payment Settings:
#    - In your Cryptomus personal account, ensure you can receive payments
#    - Set up your preferred cryptocurrencies and networks
#    - Configure any necessary wallet addresses

# 4. Set up Webhooks (Optional):
#    - In API settings, you can configure webhook URLs
#    - Webhook URL: https://yourdomain.com/api/payments/cryptomus/webhook
#    - This will be used to automatically update payment statuses

# =============================================================================
# Supported Cryptocurrencies (via Cryptomus Personal API)
# =============================================================================

# The Cryptomus Personal API supports numerous cryptocurrencies including:
# - Bitcoin (BTC) on Bitcoin network
# - Ethereum (ETH) on Ethereum network
# - USDT on multiple networks (TRON, Ethereum, BSC, Polygon)
# - Litecoin (LTC) on Litecoin network
# - Binance Coin (BNB) on BSC network
# - And many more...

# The exact list is fetched dynamically via the /payment/services endpoint

# =============================================================================
# Development Environment
# =============================================================================

# For development, you can use Cryptomus testnet if available, or use small amounts
# on mainnet. Cryptomus Personal API works with real cryptocurrencies.

# =============================================================================
# Production Checklist
# =============================================================================

# ☐ Cryptomus account created and verified
# ☐ Personal API key generated (not merchant API)
# ☐ User ID (UUID) obtained
# ☐ Environment variables set in production environment
# ☐ Webhook endpoint configured and tested (optional)
# ☐ Database backup strategy in place
# ☐ Monitoring and alerting configured
# ☐ Test payments with small amounts first

# =============================================================================
# Important Notes
# =============================================================================

# 1. Personal API vs Merchant API:
#    - Use the PERSONAL API for individual payments
#    - The Personal API is simpler and designed for personal use cases
#    - Do NOT use the merchant API keys

# 2. Security:
#    - Keep your API key secure and never expose it in client-side code
#    - Use environment variables for all sensitive configuration
#    - Regularly rotate your API keys

# 3. Payment Flow:
#    - User initiates payment in your app
#    - App creates payment via Cryptomus Personal API
#    - User is redirected to Cryptomus payment page
#    - User completes payment with their crypto wallet
#    - Cryptomus notifies your app via webhook (optional)
#    - App checks payment status and credits user account

# 4. Testing:
#    - Test with small amounts first
#    - Verify webhook endpoints work correctly
#    - Test payment status checking functionality

# Quick Start Guide: Cryptomus Integration

## ✅ Migration Complete!

The BTCPay Server integration has been successfully replaced with Cryptomus Personal API. Here's what you need to do to get it running:

## 🔧 Immediate Setup Steps

### 1. Get Cryptomus Credentials
1. Go to [Cryptomus.com](https://cryptomus.com) and create an account
2. Complete any required verification
3. Navigate to your account settings → API section
4. Generate a **Personal API key** (NOT merchant API)
5. Copy your **User ID** (UUID format)

### 2. Update Environment Variables
Edit your `.env` file in the backend directory:

```bash
# Remove old BTCPay variables (if present):
# BTCPAY_SERVER_URL=
# BTCPAY_API_KEY=
# BTCPAY_STORE_ID=
# BTCPAY_WEBHOOK_SECRET=

# Add new Cryptomus variables:
CRYPTOMUS_API_KEY=your-personal-api-key-here
CRYPTOMUS_USER_ID=your-user-uuid-here
FRONTEND_URL=http://localhost:5173
```

### 3. Test the Integration
```bash
cd backend
python -c "
from app.services.cryptomus_service import get_cryptomus_service
service = get_cryptomus_service()
print('✅ Cryptomus service initialized successfully')
print(f'API Key configured: {bool(service.api_key)}')
print(f'User ID configured: {bool(service.user_id)}')
"
```

## 🚀 Key Changes for Developers

### New API Endpoints
- **Webhook**: `POST /api/payments/cryptomus/webhook` (was `/api/payments/btcpay/webhook`)
- **Supported Methods**: `GET /api/payments/crypto/supported-methods` (now returns Cryptomus services)

### Payment Flow Changes
1. **Payment Creation**: Now returns `cryptomus_payment_url` instead of `btcpay_checkout_link`
2. **Payment Status**: Uses Cryptomus status mapping (paid, process, fail, etc.)
3. **Webhooks**: Different signature verification method (MD5 + base64)

### Frontend Updates
- Payment pages now show "Cryptomus" instead of "BTCPay Server"
- Payment URLs redirect to Cryptomus payment pages
- Same user experience, different provider

## 📋 Testing Checklist

- [ ] Environment variables set correctly
- [ ] Backend starts without errors
- [ ] Can create a payment (should return Cryptomus payment URL)
- [ ] Payment URL opens Cryptomus payment page
- [ ] Webhook endpoint accessible (for production)
- [ ] Payment status updates work
- [ ] Credits added to user account on completion

## 🔍 Troubleshooting

### Common Issues:

1. **"Cryptomus configuration incomplete"**
   - Check that both `CRYPTOMUS_API_KEY` and `CRYPTOMUS_USER_ID` are set
   - Verify the API key is for Personal API, not Merchant API

2. **"Failed to create crypto payment"**
   - Verify your Cryptomus account is active and verified
   - Check API key permissions
   - Ensure you're using the correct User ID

3. **Payment creation works but no webhook notifications**
   - Webhook URL must be publicly accessible (use ngrok for local testing)
   - Check webhook signature verification in logs

### Debug Commands:
```bash
# Check environment variables
cd backend && python debug_env.py

# Test Cryptomus service
cd backend && python -c "
import asyncio
from app.services.cryptomus_service import get_cryptomus_service

async def test():
    service = get_cryptomus_service()
    services = await service.get_payment_services()
    print(f'Available services: {len(services)}')

asyncio.run(test())
"
```

## 📚 Documentation

- **Full Setup Guide**: See `CRYPTOMUS_SETUP.md`
- **Migration Details**: See `MIGRATION_SUMMARY.md`
- **Cryptomus API Docs**: https://doc.cryptomus.com/personal

## 🎯 Next Steps

1. **Test in Development**: Create a small test payment to verify everything works
2. **Production Setup**: Update production environment variables
3. **Monitor Logs**: Watch for any Cryptomus-related errors in application logs
4. **Update Documentation**: Update any internal docs that mentioned BTCPay

---

**Need Help?** Check the migration summary and setup documentation, or review the Cryptomus API documentation for specific API questions.

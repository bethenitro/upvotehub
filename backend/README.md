# UpvoteZone Backend

This is the FastAPI backend for the UpvoteZone frontend application. It provides all the necessary endpoints for user management, orders, and payments.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Server

To run the development server:

```bash
cd app
uvicorn main:app --reload
```

The server will start at `http://localhost:8000`

## API Documentation

Once the server is running, you can access:
- Swagger UI documentation: `http://localhost:8000/docs`
- ReDoc documentation: `http://localhost:8000/redoc`

## Available Endpoints

### Authentication Endpoints
- `POST /api/auth/login` - Authenticate user and return access token
- `POST /api/auth/signup` - Register new user and return access token
- `POST /api/auth/logout` - Logout user (client-side token invalidation)

### User Endpoints
- `GET /api/users/me` - Get current user information
- `GET /api/users/stats` - Get user statistics and order counts
- `GET /api/users/activity` - Get user account activity for a date range
- `GET /api/users/validate-reddit-url` - Validate Reddit URL

### Order Endpoints
- `GET /api/orders` - Get user's orders
- `POST /api/orders` - Create new order
- `GET /api/orders/payment-methods` - Get user's payment methods

### Payment Endpoints
- `GET /api/payments` - Get user's payment history
- `POST /api/payments` - Create new payment
- `POST /api/payments/methods` - Add new payment method

## Features

- **Full Authentication**: JWT-based authentication system
- **Real Database Integration**: MongoDB integration for user, order, and payment data
- **Rate Limiting**: Request rate limiting middleware
- **Error Handling**: Comprehensive error handling and logging
- **Input Validation**: Proper input validation for all endpoints
- **Background Tasks**: Task management for order processing 
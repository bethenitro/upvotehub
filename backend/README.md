# Upvote Backend

This is the FastAPI backend for the Upvote frontend application. It provides all the necessary endpoints for user management, orders, and payments.

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

### User Endpoints
- `GET /api/user/current` - Get current user information
- `GET /api/user/activity` - Get user account activity
- `POST /api/user/topup` - Add credits to user account

### Order Endpoints
- `GET /api/orders` - Get all orders
- `GET /api/orders/history` - Get orders history
- `GET /api/orders/auto` - Get auto orders
- `POST /api/orders` - Create new one-time order
- `POST /api/orders/auto` - Create new auto order
- `DELETE /api/orders/auto/{order_id}` - Cancel an auto order

### Payment Endpoints
- `GET /api/payments` - Get payment history

## Note

This is a mock implementation. In a production environment, you would need to:
1. Implement proper authentication and authorization
2. Connect to a real database
3. Implement proper error handling
4. Add input validation
5. Add proper logging
6. Implement the actual order processing logic 
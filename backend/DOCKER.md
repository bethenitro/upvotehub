# Docker Setup for UpVote Backend

This document provides instructions for deploying the UpVote backend using Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/) (included with Docker Desktop)

## Setup

1. **Environment Variables**

   Create a `.env` file in the backend directory with your configuration:

   ```
   SECRET_KEY=your-secret-key
   MONGODB_URL=mongodb://mongodb:27017
   MONGODB_DB_NAME=upvote_db
   BTCPAY_SERVER_URL=your-btcpay-server-url
   BTCPAY_API_KEY=your-btcpay-api-key
   BTCPAY_STORE_ID=your-btcpay-store-id
   BTCPAY_WEBHOOK_SECRET=your-btcpay-webhook-secret
   FRONTEND_URL=http://localhost:5173
   CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
   ```

   Adjust these values according to your specific environment and requirements.

2. **Build and Run with Docker Compose**

   ```bash
   # Build and start the services
   docker-compose up -d

   # To view logs
   docker-compose logs -f
   ```

3. **Access the API**

   Once running, the API will be available at: http://localhost:8000

## Running Individual Commands

- **Build the Docker image:**
  ```bash
  docker build -t upvote-backend .
  ```

- **Run the container:**
  ```bash
  docker run -p 8000:8000 --env-file .env upvote-backend
  ```

## Deployment Notes

- **Production Settings**: For production, make sure to set `DEBUG=False` in your environment variables
- **Persistent Data**: MongoDB data is stored in a Docker volume named `mongodb_data`
- **Logs**: Application logs are stored in a volume mounted at `./logs`

## Troubleshooting

1. If you encounter connection issues with MongoDB, ensure the MongoDB service is running:
   ```bash
   docker-compose ps
   ```

2. To check the application logs:
   ```bash
   docker-compose logs -f backend
   ```

3. To check MongoDB logs:
   ```bash
   docker-compose logs -f mongodb
   ```

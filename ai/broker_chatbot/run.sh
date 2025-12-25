#!/bin/bash
# Broker Chatbot startup script

cd "$(dirname "$0")"

# Load environment variables from .env if it exists
if [ -f .env ]; then
    echo "Loading environment from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Default port
PORT=${PORT:-8002}

echo "Starting Broker Chatbot on port $PORT..."
echo "Backend API: ${BACKEND_API_URL:-http://localhost:3000}"
echo "Embedding Service: ${EMBEDDING_SERVICE_URL:-http://localhost:8001}"

# Run the FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port $PORT --reload

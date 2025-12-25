#!/bin/bash
# Script to run the Broker Chatbot within the conda environment

# Set strict mode
set -e

# Change to script directory
cd "$(dirname "$0")"

# Define environment name (same as customer chatbot)
ENV_NAME="chatbot-ai-realstate"

echo "🚀 Starting Broker Chatbot..."

# Load environment variables from .env if it exists
if [ -f .env ]; then
    echo "📁 Loading environment from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default port
PORT=${PORT:-8002}

# Find conda
CONDA_PATH="/home/hanafy/miniconda3/bin/conda"
if [ ! -f "$CONDA_PATH" ]; then
    CONDA_PATH=$(which conda || echo "conda")
fi

# Use conda run to execute the script in the environment context
echo "📦 Installing/Updating requirements..."
"$CONDA_PATH" run --no-capture-output -n "$ENV_NAME" pip install -r requirements.txt

echo "🏃 Running Broker Chatbot in environment: $ENV_NAME"
echo "   Port: $PORT"
echo "   Backend API: ${BACKEND_API_URL:-http://localhost:3000}"
echo "   Embedding Service: ${EMBEDDING_SERVICE_URL:-http://localhost:8001}"

export CHATBOT_RUN_ID=$(date +"%Y%m%d_%H%M%S")
"$CONDA_PATH" run --no-capture-output -n "$ENV_NAME" python run.py

#!/bin/bash

# Broker Interviewer Service - Run Script

# Activate conda environment if exists
if [ -f ~/miniconda3/etc/profile.d/conda.sh ]; then
    source ~/miniconda3/etc/profile.d/conda.sh
    conda activate chatbot-ai-realstate
fi

# Load environment variables from .env if it exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Set environment variables with defaults if not already set
export COHERE_API_KEY=${COHERE_API_KEY:-}
export BACKEND_URL=${BACKEND_URL:-http://localhost:3001}
export PORT=${PORT:-8004}
export LOG_LEVEL=${LOG_LEVEL:-INFO}

echo "🚀 Starting Broker Interviewer Service on port $PORT..."

# Run the application
python run.py

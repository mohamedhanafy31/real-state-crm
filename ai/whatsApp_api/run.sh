#!/bin/bash

# WhatsApp Orchestrator Service - Run Script
# Uses the same conda environment as other AI services

SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
cd "$SCRIPT_DIR"

# Activate conda environment if exists (same as embedding service)
if [ -f ~/miniconda3/etc/profile.d/conda.sh ]; then
    source ~/miniconda3/etc/profile.d/conda.sh
    conda activate chatbot-ai-realstate
fi

# Load environment variables from .env if it exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Set environment variables with defaults
export CHATBOT_API_URL=${CHATBOT_API_URL:-http://localhost:8000}
export PORT=${PORT:-8003}
export LOG_LEVEL=${LOG_LEVEL:-INFO}

echo "🚀 Starting WhatsApp Orchestrator on port ${PORT}..."

# Run with python script
python run.py

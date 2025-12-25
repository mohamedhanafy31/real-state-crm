#!/bin/bash

# Embedding Microservice Startup Script

# Activate conda environment if exists
if [ -f ~/miniconda3/etc/profile.d/conda.sh ]; then
    source ~/miniconda3/etc/profile.d/conda.sh
    conda activate chatbot-ai-realstate
fi

# Load environment variables from .env if it exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Set environment variables with defaults if not already set by .env or current shell
export DATABASE_HOST=${DATABASE_HOST:-localhost}
export DATABASE_PORT=${DATABASE_PORT:-5433}
export DATABASE_USER=${DATABASE_USER:-admin}
export DATABASE_PASSWORD=${DATABASE_PASSWORD:-password}
export DATABASE_NAME=${DATABASE_NAME:-real_estate_crm}
export EMBEDDING_MODEL_NAME=${EMBEDDING_MODEL_NAME:-mohamed2811/Muffakir_Embedding_V2}
export PORT=${PORT:-8001}
export LOG_LEVEL=${LOG_LEVEL:-INFO}

echo "🚀 Starting Embedding Microservice via run.py..."

# Run with python script to enable advanced logging
python run.py

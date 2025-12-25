#!/bin/bash
# Script to run the Customer Chatbot within the conda environment

# Set strict mode
set -e

# Define environment name
ENV_NAME="chatbot-ai-realstate"

echo "🚀 Starting Customer Chatbot..."

# Find conda
CONDA_PATH="/home/hanafy/miniconda3/bin/conda"
if [ ! -f "$CONDA_PATH" ]; then
    CONDA_PATH=$(which conda || echo "conda")
fi

# Use conda run to execute the script in the environment context
# This is more robust than conda activate in shell scripts
echo "📦 Installing/Updating requirements..."
"$CONDA_PATH" run --no-capture-output -n "$ENV_NAME" pip install -r requirements.txt

echo "🏃 Running application in environment: $ENV_NAME"
export CHATBOT_RUN_ID=$(date +"%Y%m%d_%H%M%S")
"$CONDA_PATH" run --no-capture-output -n "$ENV_NAME" python run.py

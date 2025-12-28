#!/bin/bash
# run_docker.sh
# Starts the full application stack using Docker Compose.

echo "🐳 Starting Real Estate CRM with Docker Compose..."
export COMPOSE_PARALLEL_LIMIT=1
docker compose up --build
echo "✅ Docker command executed."

# run_docker.ps1
# Starts the full application stack using Docker Compose (Windows).

Write-Host "🐳 Starting Real Estate CRM with Docker Compose..."
$Env:COMPOSE_PARALLEL_LIMIT = 1
docker compose up --build
Write-Host "✅ Docker command executed."

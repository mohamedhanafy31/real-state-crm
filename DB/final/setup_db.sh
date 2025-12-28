#!/bin/bash

# setup_db.sh
# Orchestrates the full database reset and setup flow for Real Estate CRM.
# Usage: ./DB/final/setup_db.sh [--reset] (Run from project root)

set -e

# Ensure we are in the project root (where docker-compose.yml exists)
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found in current directory."
    echo "Please run this script from the project root: ./DB/final/setup_db.sh"
    exit 1
fi

RESET_MODE=false
if [[ "$1" == "--reset" ]]; then
    RESET_MODE=true
    echo "⚠️  RESET MODE ENABLED: This will destroy existing database volume!"
    read -p "Are you sure? (y/N) " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "Aborted."
        exit 1
    fi
fi

echo "🚀 Starting Database Setup Flow..."

# 1. Stop containers
echo "🛑 Stopping containers..."
docker compose down

# 2. Reset volume if requested
if [ "$RESET_MODE" = true ]; then
    echo "🗑️  Removing postgres data volume..."
    docker volume rm real_state_crm_postgres_data || true
    docker rm real_state_crm_db || true
fi

# 3. Start DB and Redis
echo "🐳 Starting Database and Redis..."
docker compose up -d real_estate_crm_db real_estate_crm_redis

# 4. Wait for DB to be healthy
echo "⏳ Waiting for Database to be ready..."
MAX_RETRIES=30
count=0
while [ $count -lt $MAX_RETRIES ]; do
    if docker exec real_estate_crm_db pg_isready -U admin -d real_estate_crm > /dev/null 2>&1; then
        echo "✅ Database is ready!"
        break
    fi
    echo "   ... waiting ($count/$MAX_RETRIES)"
    sleep 2
    count=$((count + 1))
done

if [ $count -eq $MAX_RETRIES ]; then
    echo "❌ Timeout waiting for database."
    exit 1
fi

# 5. Run Data Import Script
echo "📥 Running Data Import & Seeding..."
# Check dependencies
if ! python3 -c "import pandas, psycopg2, nanoid" &> /dev/null; then
    echo "⚠️  Python dependencies missing. Installing locally..."
    pip install pandas psycopg2-binary nanoid || echo "pip install failed, trying to run anyway..."
fi

# Script path relative to root
MPORT_SCRIPT="DB/final/import_data.py"
python3 "$MPORT_SCRIPT"

echo "==========================================="
echo "✅ Setup Complete!"
echo "==========================================="
echo "Credentials created:"
echo "  Supervisor: admin@example.com / password"
echo "  Broker:     broker@example.com / password"
echo "==========================================="

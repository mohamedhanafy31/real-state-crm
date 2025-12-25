#!/bin/bash

# Configuration
DB_SERVICE="db"
DB_USER="admin"
DB_NAME="real_estate_crm"

echo "============================================"
echo "      Real Estate CRM Database Inspector    "
echo "============================================"

# Check if container is running
if ! docker compose ps --services --filter "status=running" | grep -q "${DB_SERVICE}"; then
    echo "Error: Database container '${DB_SERVICE}' is not running."
    echo "Try running: docker compose up -d"
    exit 1
fi

echo ""
echo "--> List of Tables:"
echo "-------------------"
docker compose exec "${DB_SERVICE}" psql -U "${DB_USER}" -d "${DB_NAME}" -P pager=off -c "\dt"

echo ""
echo "--> Database Schema (DDL):"
echo "--------------------------"
docker compose exec "${DB_SERVICE}" pg_dump -U "${DB_USER}" -s "${DB_NAME}" | grep -v "^--" | grep -v "^$"

echo ""
echo "--> Table Data:"
echo "---------------"

# Get list of public tables
TABLES=$(docker compose exec -T "${DB_SERVICE}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public';")

# Clean up whitespace (remove \r)
TABLES=$(echo "$TABLES" | tr -d '\r')

for TABLE in $TABLES; do
    if [ ! -z "$TABLE" ]; then
        echo "Table: $TABLE"
        echo "................"
        docker compose exec "${DB_SERVICE}" psql -U "${DB_USER}" -d "${DB_NAME}" -P pager=off -c "SELECT * FROM \"$TABLE\";"
        echo ""
    fi
done

echo "============================================"
echo "Done."

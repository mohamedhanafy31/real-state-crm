#!/bin/bash

# Real Estate CRM - Start All Services
# This script starts all required services for the Real Estate CRM system

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Root directory
ROOT_DIR="$(dirname "$(readlink -f "$0")")"

# Ports to clean
PORTS=(3000 3001 5000 8000 8001 8002 8003 8004)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Real Estate CRM - Starting All Services${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${YELLOW}🧹 Cleaning up ports: ${PORTS[*]}...${NC}"
for PORT in "${PORTS[@]}"; do
    if fuser -n tcp "$PORT" > /dev/null 2>&1; then
        echo -e "${YELLOW}   Killing process on port $PORT...${NC}"
        fuser -k -n tcp "$PORT" > /dev/null 2>&1
    else
        echo -e "${GREEN}   Port $PORT is free${NC}"
    fi
done

echo -e "${YELLOW}⏳ Waiting 2 seconds for ports to clear...${NC}"
sleep 2
echo ""

echo -e "${GREEN}🚀 Starting services...${NC}"
echo ""

# 1. Docker (Redis, DB)
echo -e "${GREEN}1. Starting Docker containers (Redis, DB)...${NC}"
docker compose up redis db -d || { echo -e "${RED}❌ Docker failed to start${NC}"; exit 1; }

echo -e "${YELLOW}⏳ Waiting 5 seconds for databases to initialize...${NC}"
sleep 5
echo ""

# 2. Backend (NestJS on port 3001)
echo -e "${GREEN}2. Spawning Backend (Port 3001)...${NC}"
gnome-terminal --title="Backend" --working-directory="$ROOT_DIR/backend" -- bash -c "echo '🚀 Starting Backend...'; npm start; exec bash"

# 3. Frontend (Next.js on port 5000)
echo -e "${GREEN}3. Spawning Frontend (Port 5000)...${NC}"
gnome-terminal --title="Frontend" --working-directory="$ROOT_DIR/frontend/app" -- bash -c "echo '🚀 Starting Frontend...'; npm run dev; exec bash"

# 4. AI Embedding Service (Port 8001)
echo -e "${GREEN}4. Spawning AI Embedding Service (Port 8001)...${NC}"
gnome-terminal --title="AI Embedding" --working-directory="$ROOT_DIR/ai/embedding" -- bash -c "echo '🚀 Starting AI Embedding...'; ./run.sh; exec bash"

# 5. AI Customer Chatbot (Port 8000)
echo -e "${GREEN}5. Spawning AI Customer Chatbot (Port 8000)...${NC}"
gnome-terminal --title="AI Customer Chatbot" --working-directory="$ROOT_DIR/ai/customer_chatbot" -- bash -c "echo '🚀 Starting AI Customer Chatbot...'; ./run.sh; exec bash"

# 6. AI Broker Chatbot (Port 8002)
echo -e "${GREEN}6. Spawning AI Broker Chatbot (Port 8002)...${NC}"
gnome-terminal --title="AI Broker Chatbot" --working-directory="$ROOT_DIR/ai/broker_chatbot" -- bash -c "echo '🚀 Starting AI Broker Chatbot...'; ./run.sh; exec bash"

# 7. WhatsApp Orchestrator (Port 8003)
echo -e "${GREEN}7. Spawning WhatsApp Orchestrator (Port 8003)...${NC}"
gnome-terminal --title="WhatsApp Orchestrator" --working-directory="$ROOT_DIR/ai/whatsApp_api" -- bash -c "echo '🚀 Starting WhatsApp Orchestrator...'; ./run.sh; exec bash"

# 8. Broker Interviewer (Port 8004)
echo -e "${GREEN}8. Spawning Broker Interviewer (Port 8004)...${NC}"
gnome-terminal --title="Broker Interviewer" --working-directory="$ROOT_DIR/ai/broker_interviewer" -- bash -c "echo '🚀 Starting Broker Interviewer...'; ./run.sh; exec bash"

echo ""
echo -e "${GREEN}✅ All services launch commands issued.${NC}"
echo -e "${GREEN}Check individual terminal windows for service status.${NC}"


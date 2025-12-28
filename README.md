# Real Estate CRM with AI

A comprehensive, microservices-based Real Estate Customer Relationship Management system integrated with advanced AI capabilities for customer interaction, broker interviewing, and intelligent search.

## 🏗️ Architecture

The system is composed of the following microservices:

### Core Services
- **Backend**: NestJS application handling core business logic, user management, and API orchestration.
- **Frontend**: Next.js application providing the user interface for admins, brokers, and customers.
- **Database**: PostgreSQL with `pgvector` extension for storing application data and vector embeddings.
- **Redis**: In-memory store for caching and queue management.

### AI Services (Python/FastAPI)
- **Customer Chatbot**: AI assistant for handling customer inquiries.
- **Broker Chatbot**: AI assistant for supporting brokers.
- **Broker Interviewer**: AI agent for conducting automated broker interviews.
- **Embedding Service**: Generates vector embeddings for semantic search.
- **WhatsApp API**: Orchestrator for WhatsApp integration.

## 🚀 Setup & Run

We provide a **unified cross-platform script** to handle environment setup, port cleaning, and execution.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
- [Python 3](https://www.python.org/downloads/) installed.

### Quick Start
Run the following command in the project root:

```bash
python3 setup_and_run.py
```

### What the script does:
1. **Clean**: Kills any processes occupying ports `3000-8004`.
2. **Pre-pull**: Downloads Docker images (`python:3.11-slim`, `node:20`, etc.) to cache.
3. **Configure**: Generates `.env` files for all 7 services with correct local development defaults.
4. **Build**: Sequentially builds containers to prevent network timeouts.
5. **Run**: Starts the stack in attached mode, streaming logs to your console.

## 📂 Project Structure

- `/backend`: NestJS Server
- `/frontend`: Next.js Client
- `/ai`: Python Microservices
- `/DB`: Database schemas and seeding scripts

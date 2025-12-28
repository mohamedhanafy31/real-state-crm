# AI Microservices Layer

This directory contains the Python-based microservices that power the intelligent features of the CRM.

## Services

| Service | Path | Description | Port |
|---------|------|-------------|------|
| **Customer Chatbot** | `/customer_chatbot` | Handles inquiries from end-users/customers via chat. | 8000 |
| **Broker Chatbot** | `/broker_chatbot` | Assists real estate brokers with data lookups and tasks. | 8002 |
| **Broker Interviewer** | `/broker_interviewer` | Conducts automated AI video/text interviews for new broker applicants. | 8000 |
| **Embedding** | `/embedding` | Generates vector embeddings using models (e.g., Cohere, OpenAI) for semantic search integration with `pgvector`. | 8001 |
| **WhatsApp API** | `/whatsApp_api` | Connector service for WhatsApp Cloud API integration. | 8003 |

## Tech Stack
- **Framework**: FastAPI
- **Language**: Python 3.11
- **ML/AI**: LangChain, LangGraph, Cohere SDK
- **Database**: AsyncPG, PGVector

## Development
All services are containerized. See the root `requirements.txt` consistency guidelines if adding new dependencies.

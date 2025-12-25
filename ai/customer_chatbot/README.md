# Customer Chatbot RAG Service

A RAG-based chatbot for real estate customer interactions via WhatsApp.

## Tech Stack

- **FastAPI** - Web framework
- **LangGraph** - Conversation workflow orchestration
- **Gemini API** - Text generation (LLM)
- **Muffakir_Embedding_V2** - Arabic embeddings
- **pgvector** - Vector storage in PostgreSQL

## Project Structure

```
app/
├── main.py              # FastAPI entry point
├── config.py            # Environment configuration
├── api/
│   └── routes/
│       └── webhook.py   # WhatsApp webhook & chat endpoints
├── core/
│   ├── embeddings.py    # Muffakir embedding service
│   ├── llm.py           # Gemini API service
│   └── vector_store.py  # pgvector operations
├── graph/
│   ├── state.py         # Conversation state schema
│   ├── nodes.py         # LangGraph node definitions
│   └── workflow.py      # Workflow builder
├── models/
│   └── schemas.py       # Pydantic models
└── services/
    └── conversation.py  # Conversation management
```

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Ensure PostgreSQL with pgvector is running:**
   ```bash
   # From project root
   docker compose up -d
   ```

4. **Run the service:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/health` | GET | Health check |
| `/api/webhook` | GET | WhatsApp verification |
| `/api/webhook` | POST | WhatsApp incoming messages |
| `/api/webhook/chat` | POST | Direct chat (testing) |
| `/api/webhook/history/{phone}` | GET | Conversation history |

## Testing

Send a test message:

```bash
curl -X POST http://localhost:8000/api/webhook/chat \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "201234567890", "message": "أنا عايز شقة في التجمع الخامس"}'
```

## WhatsApp Integration

Configure your WhatsApp Business API webhook to point to:
- Verification: `GET https://your-domain.com/api/webhook`
- Messages: `POST https://your-domain.com/api/webhook`

Set `WHATSAPP_VERIFY_TOKEN` in `.env` to match your WhatsApp app settings.

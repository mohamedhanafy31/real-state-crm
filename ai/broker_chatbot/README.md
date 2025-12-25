# Broker Chatbot

AI-powered assistant for real estate brokers to analyze client requests before direct communication.

## Features

- 🧑 **Client Personality Analysis** - Analyze client behavior from conversation history
- ⚠️ **Risk Assessment** - Identify warning signs and risk indicators
- 💡 **Strategy Recommendations** - Get actionable advice for handling clients
- 💬 **Interactive Q&A** - Ask specific questions about assigned requests

## Architecture

```
ai/broker_chatbot/
├── app/
│   ├── api/routes/       # FastAPI endpoints
│   ├── core/             # LLM, logging
│   ├── graph/            # LangGraph workflow
│   ├── models/           # Pydantic schemas
│   └── services/         # Backend/Embedding clients
├── requirements.txt
├── run.py / run.sh
└── .env.example
```

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure environment
cp .env.example .env
# Edit .env with your COHERE_API_KEY

# 3. Run the server
./run.sh
# Or: python run.py
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/ready` | GET | Readiness with dependency checks |
| `/api/chat` | POST | Main chat endpoint |
| `/api/requests/{id}/summary` | GET | Quick request summary |

## Usage Example

```bash
curl -X POST http://localhost:8002/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "broker_id": 1,
    "request_id": 123,
    "message": "حللي العميل ده وقولي ازاي اتعامل معاه"
  }'
```

## Response Format

```json
{
  "success": true,
  "response": "📊 تحليل الطلب رقم 123...",
  "client_analysis": {
    "personality_type": "حساس للميزانية",
    "seriousness_level": "متوسط",
    "risk_level": "منخفض"
  },
  "strategy": {
    "communication_tone": "مهنية",
    "summary": "ركز على الخيارات ضمن الميزانية"
  }
}
```

## Dependencies

| Service | Port | Required |
|---------|------|----------|
| NestJS Backend | 3000 | Yes |
| Embedding Service | 8001 | Yes |
| PostgreSQL | 5433 | Yes |
| Cohere API | - | Yes (API key) |

## Port

Default: `8002`

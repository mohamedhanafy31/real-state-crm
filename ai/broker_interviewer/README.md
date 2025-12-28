# AI Broker Interview/Exam System

A comprehensive AI-powered interview system for verifying real estate broker applicants before they can use the CRM platform.

## Overview

When a new broker registers, instead of immediately getting access, they must complete a 6-phase AI interview. The interview evaluates:
- Real-world brokerage experience
- Professional terminology knowledge
- Scenario-based decision making
- Financial awareness
- Credibility and self-awareness

## Interview Flow

```
Register → Application Created → Interview Started → 6 Phases → Score Calculated → Approved/Rejected
```

## Scoring

| Phase | Name | Max Points |
|-------|------|------------|
| 1 | Ice-Breaking & Identity | 10 |
| 2 | Real-World Experience | 30 |
| 3 | Professional Terminology | 20 |
| 4 | Scenario-Based Decisions | 25 |
| 5 | Numbers & Financial Awareness | 15 |
| 6 | Credibility & Self-Awareness | 10 |
| **Total** | | **100** |

### Pass/Fail Thresholds
- **≥75 points**: ✅ Approved - Broker account created
- **<75 points**: ❌ Rejected - No retry allowed

Red flags (vague answers, avoiding numbers, etc.) deduct 2 points each.

## Quick Start

### Local Development

```bash
# Navigate to the service directory
cd ai/broker_interviewer

# Copy environment file and configure
cp .env.example .env
# Edit .env and set your COHERE_API_KEY

# Run the service
./run.sh
```

### Docker

```bash
# From project root
docker-compose up broker_interviewer
```

The service will be available at `http://localhost:8003`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/api/interview/start` | POST | Start/resume interview |
| `/api/interview/respond` | POST | Submit answer, get next question |
| `/api/interview/{session_id}` | GET | Get session state |
| `/docs` | GET | OpenAPI documentation |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `COHERE_API_KEY` | Cohere API key for LLM | Required |
| `BACKEND_URL` | CRM backend URL | `http://localhost:3000` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `PASS_SCORE_THRESHOLD` | Pass score | `75.0` |
| `RED_FLAG_PENALTY` | Points deducted per red flag | `2.0` |

## Architecture

```
Frontend (Next.js)
     ↓
Backend (NestJS) ←→ broker_interviewer (FastAPI)
     ↓                      ↓
PostgreSQL              Cohere API
```

The frontend handles the interview UI. The backend manages application state and session data. The broker_interviewer service conducts the AI interview using Cohere's LLM.

## Files Structure

```
ai/broker_interviewer/
├── app/
│   ├── main.py                 # FastAPI entry
│   ├── config.py               # Settings
│   ├── api/routes/interview.py # API endpoints
│   ├── core/
│   │   ├── llm.py              # Cohere integration
│   │   └── prompts.py          # LLM prompts
│   ├── models/
│   │   ├── schemas.py          # Pydantic models
│   │   └── interview_phases.py # Phase definitions
│   └── services/
│       ├── interview_service.py
│       ├── scoring_service.py
│       └── backend_client.py
├── requirements.txt
├── Dockerfile
└── run.sh
```

## Database Tables (Backend)

- `broker_applications` - Tracks applications through interview process
- `interview_sessions` - Stores session state and phase scores
- `interview_responses` - Individual Q&A audit trail

## Integration Notes

1. **Backend must run the migration**: `DB/add_broker_interview_tables.sql`
2. **Set COHERE_API_KEY** in environment
3. **Frontend needs interview UI** (not included in this phase)

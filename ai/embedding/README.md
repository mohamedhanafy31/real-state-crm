# ai/embedding - Embedding Microservice

FastAPI service for centralized embedding operations using Muffakir_Embedding_V2 model.

## Features

- Single model loading (saves RAM across services)
- Text embedding API
- Sync embeddings for areas/projects/unit-types
- pgvector-based semantic search
- Top-K similarity results

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/embed/text` | POST | Single text → embedding |
| `/embed/batch` | POST | Multiple texts → embeddings |
| `/sync/area` | POST | Sync area embedding |
| `/sync/project` | POST | Sync project embedding |
| `/delete/area/{id}` | DELETE | Remove area embedding |
| `/delete/project/{id}` | DELETE | Remove project embedding |
| `/search/area` | GET | Search areas by query |
| `/search/project` | GET | Search projects by query |
| `/health` | GET | Health check |
| `/ready` | GET | Readiness (model loaded) |

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run server
./run.sh
```

## Configuration

Set environment variables or use `.env`:

```env
DATABASE_URL=postgresql://admin:admin123@localhost:5432/real_estate_crm
EMBEDDING_MODEL=mohamed2811/Muffakir_Embedding_V2
PORT=8001
LOG_LEVEL=INFO
```

## Port

Default: `8001`

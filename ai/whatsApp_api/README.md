# WhatsApp Orchestrator Service

A lightweight **FastAPI service** that routes messages between **WhatsApp Cloud API** and the **Customer Chatbot API**.

## Architecture

```
WhatsApp User → Meta Cloud API → Orchestrator (8003) → Customer Chatbot (8000)
                                          ↓
WhatsApp User ← Meta Cloud API ← Orchestrator ← AI Response
```

## Quick Start

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Configure WhatsApp credentials in `.env`:**
   - `WHATSAPP_VERIFY_TOKEN` - Your webhook verification token
   - `WHATSAPP_ACCESS_TOKEN` - Meta Graph API access token
   - `WHATSAPP_PHONE_NUMBER_ID` - Your WhatsApp Business phone number ID

3. **Run the service:**
   ```bash
   ./run.sh
   ```

4. **Verify it's running:**
   ```bash
   curl http://localhost:8003/health
   ```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/webhook` | WhatsApp webhook verification |
| POST | `/webhook` | Receive incoming WhatsApp messages |
| GET | `/health` | Service health check |

## Setting up WhatsApp Business

1. Create a Meta Business account at [business.facebook.com](https://business.facebook.com)
2. Set up a WhatsApp Business app in Meta Developer Console
3. Configure the webhook URL: `https://your-domain.com/webhook`
4. Set the verify token to match `WHATSAPP_VERIFY_TOKEN`
5. Subscribe to the `messages` webhook field

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification token | Yes |
| `WHATSAPP_ACCESS_TOKEN` | Meta API access token | Yes |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp phone number ID | Yes |
| `WHATSAPP_API_VERSION` | Graph API version (default: v18.0) | No |
| `CHATBOT_API_URL` | Customer Chatbot URL (default: localhost:8000) | No |
| `PORT` | Server port (default: 8003) | No |
| `LOG_LEVEL` | Logging level (default: INFO) | No |

## Development

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest tests/ -v

# Run with auto-reload
python run.py
```

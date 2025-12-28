# setup_envs.ps1
# Creates .env files for all services with local development configuration (Windows Version).
# This setup assumes services are running on localhost (or managed by run_all.sh).
# When running via Docker Compose, these values are overridden by docker-compose.yml.

Write-Host "🚀 Setting up environment variables for all services..."

# 1. Customer Chatbot
Write-Host "📝 Creating ai/customer_chatbot/.env"
$CustomerChatbotEnv = @"
GENERATOR_TYPE=cohere
GEMINI_API_KEY=AIzaSyCr6-jbYUip5OD0gEYYpdjkNN1hp-1U8TA
COHERE_API_KEY=KnobN1zL2vuObEJEEhRKhy3bANHkoYV4OXolcaLO
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_USER=admin
DATABASE_PASSWORD=password
DATABASE_NAME=real_estate_crm
BACKEND_API_URL=http://localhost:3001/api
EMBEDDING_MODEL_NAME=mohamed2811/Muffakir_Embedding_V2
WHATSAPP_VERIFY_TOKEN=your_verify_token
WHATSAPP_ACCESS_TOKEN=your_access_token
"@
Set-Content -Path "ai/customer_chatbot/.env" -Value $CustomerChatbotEnv -Encoding UTF8

# 2. Broker Chatbot
Write-Host "📝 Creating ai/broker_chatbot/.env"
$BrokerChatbotEnv = @"
COHERE_API_KEY=KnobN1zL2vuObEJEEhRKhy3bANHkoYV4OXolcaLO
BACKEND_API_URL=http://localhost:3001/api
EMBEDDING_SERVICE_URL=http://localhost:8001
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_USER=admin
DATABASE_PASSWORD=password
DATABASE_NAME=real_estate_crm
PORT=8002
LOG_LEVEL=INFO
"@
Set-Content -Path "ai/broker_chatbot/.env" -Value $BrokerChatbotEnv -Encoding UTF8

# 3. Broker Interviewer
Write-Host "📝 Creating ai/broker_interviewer/.env"
$BrokerInterviewerEnv = @"
APP_NAME=Broker Interviewer
DEBUG=false
LOG_LEVEL=INFO
BACKEND_URL=http://localhost:3001/api
BACKEND_TIMEOUT=30
COHERE_API_KEY=KnobN1zL2vuObEJEEhRKhy3bANHkoYV4OXolcaLO
COHERE_MODEL=command-r7b-12-2024
PASS_SCORE_THRESHOLD=75.0
RED_FLAG_PENALTY=2.0
"@
Set-Content -Path "ai/broker_interviewer/.env" -Value $BrokerInterviewerEnv -Encoding UTF8

# 4. Embedding Service
Write-Host "📝 Creating ai/embedding/.env"
$EmbeddingEnv = @"
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_USER=admin
DATABASE_PASSWORD=password
DATABASE_NAME=real_estate_crm
EMBEDDING_MODEL_NAME=mohamed2811/Muffakir_Embedding_V2
HOST=0.0.0.0
PORT=8001
RELOAD=true
LOG_LEVEL=INFO
"@
Set-Content -Path "ai/embedding/.env" -Value $EmbeddingEnv -Encoding UTF8

# 5. WhatsApp API
Write-Host "📝 Creating ai/whatsApp_api/.env"
$WhatsAppEnv = @"
WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token
WHATSAPP_ACCESS_TOKEN=EAAKQZCqFp9ZBoBQfviX2BugTclnbAhGNRvWSJ12npzxDFja0T5DS8OgZBwomzZAbwo1ubJhNvNwBSYvu7ZAE6ILgM80HiHJzW5iWFcGCgLaOji6a2g1MV7pxmo7mZAP6DU74DVCpZBBlSBT6AoCdIO6kcOFN4hrfNZB2DJgiIL5qOEQy7OHzy7uEzrns0qclUDH2pHSnnZBZArJweVZCMcb1oQV9TiaO8A7o17FjPaZC
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_API_VERSION=v18.0
CHATBOT_API_URL=http://localhost:8000
PORT=8003
LOG_LEVEL=INFO
"@
Set-Content -Path "ai/whatsApp_api/.env" -Value $WhatsAppEnv -Encoding UTF8

# 6. Backend
Write-Host "📝 Creating backend/.env"
$BackendEnv = @"
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=admin
DB_PASSWORD=password
DB_DATABASE=real_estate_crm
REDIS_HOST=localhost
REDIS_PORT=6383
CACHE_TTL_DEFAULT=3600
CACHE_TTL_STATIC=86400
CACHE_TTL_DYNAMIC=300
AI_INTERVIEWER_URL=http://localhost:8004
JWT_SECRET=dev-secret-key-12345-change-in-production
JWT_EXPIRATION=7d
SLA_CHECK_INTERVAL=3600000
SLA_RESPONSE_TIMEOUT_HOURS=48
"@
Set-Content -Path "backend/.env" -Value $BackendEnv -Encoding UTF8

Write-Host "✅ All .env files created successfully!"

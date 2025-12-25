# Customer Chatbot AI Service – Detailed Logic, Scenarios, and Architecture (pgvector + LangGraph)

## 1. Overview and Purpose
The Customer Chatbot AI Service is a **conversation-driven intake, understanding, and qualification system** that interacts with customers via WhatsApp.

Its main objective is to transform **unstructured natural language conversations** into **structured, actionable real estate requests**, while preserving context across long conversations and multiple days.

The chatbot is not a generic Q&A bot. It is a **stateful business agent** that follows defined logic, rules, and workflows.

---

## 2. Strategic Business Value

### 2.1 Operational Value
- Reduces broker workload by handling initial conversations
- Standardizes data collection across all customers
- Works 24/7 with no operational cost increase

### 2.2 Intelligence & Data Value
- Builds semantic memory of customer intent
- Learns demand patterns (budget, area, unit type)
- Enables accurate future matching

### 2.3 Customer Experience Value
- Natural Arabic conversation
- No repeated questions
- Context-aware replies

---

## 3. Core Responsibilities

The Customer Chatbot AI Service is responsible for:

1. Understanding customer intent
2. Extracting and validating requirements
3. Managing request lifecycle
4. Recommending units
5. Preserving conversation context
6. Communicating structured data to backend services

It is **not responsible** for negotiation, broker assignment, or payment processing.

---

## 4. Semantic Memory Layer (pgvector)

pgvector is the **persistent semantic memory** of the chatbot.

### 4.1 What is Stored as Vectors
- Customer messages
- AI replies
- Request summaries
- Unit descriptions

### 4.2 Why pgvector (and Not FAISS)
- PostgreSQL is already the system database
- pgvector provides sufficient performance for chat-scale workloads
- Strong consistency with transactional data
- Simpler deployment and maintenance

FAISS is designed for **very large-scale, high-performance vector search**, which is not required at this stage. pgvector fully satisfies the chatbot needs.

---

## 5. Conversation Orchestration with LangGraph

LangGraph is used as the **conversation control engine**.

Instead of a single prompt-response loop, the chatbot is modeled as a **state machine / directed graph**.

### 5.1 Why LangGraph is Needed
- Conversations are multi-step and non-linear
- The chatbot must decide *what to do next*, not just *what to say*
- Business rules must be enforced

LangGraph allows explicit control over:
- Conversation states
- Allowed transitions
- Tool usage decisions

---

## 6. Defined Conversation States (Graph Nodes)

Each node represents a logical step in the conversation:

1. **ReceiveMessage**
   - Entry point for every customer message

2. **RetrieveContext**
   - Fetch relevant past messages and requests from pgvector

3. **DetectIntent**
   - Determine user intent (search, update, inquiry, follow-up)

4. **ExtractRequirements**
   - Extract structured fields from the message

5. **CheckMissingData**
   - Validate if minimum request data exists

6. **ClarificationQuestion**
   - Ask focused questions for missing data

7. **UpdateRequest**
   - Create or update the request entity

8. **SearchUnits**
   - Perform semantic unit search using pgvector

9. **GenerateResponse**
   - Generate final reply using Gemini API

10. **PersistConversation**
   - Store messages, embeddings, and state

---

## 7. Defined Tools and Their Roles

LangGraph nodes can call **tools**. Each tool has a clear responsibility.

### 7.1 Tool: Embedding Tool
- Converts text into vectors
- Uses Muffakir Embedding V2

### 7.2 Tool: Vector Retrieval Tool
- Queries pgvector for similar messages or units
- Used for context recall and unit matching

### 7.3 Tool: Requirement Extraction Tool
- Extracts structured fields from text
- Produces normalized request data

### 7.4 Tool: Request Management Tool
- Sends request updates to backend APIs
- Ensures backend remains the single source of truth

### 7.5 Tool: Response Generation Tool
- Uses Gemini API
- Receives structured context and produces human-like replies

---

## 8. Detailed Logical Flow (LangGraph Driven)

```
Customer Message
       ↓
ReceiveMessage
       ↓
RetrieveContext (pgvector)
       ↓
DetectIntent
       ↓
ExtractRequirements
       ↓
CheckMissingData
   ┌──────────────┐
   │ Missing Data │ → ClarificationQuestion → PersistConversation
   └──────────────┘
       ↓ No
UpdateRequest
       ↓
SearchUnits (pgvector)
       ↓
GenerateResponse (Gemini)
       ↓
PersistConversation
       ↓
Send Reply
```

---

## 9. Detailed Scenarios with LangGraph

### Scenario 1: Clear Request
- Graph flows directly to UpdateRequest → SearchUnits

### Scenario 2: Incomplete Request
- Graph loops between CheckMissingData and ClarificationQuestion

### Scenario 3: Returning Customer
- RetrieveContext changes graph path

### Scenario 4: Request Update
- DetectIntent routes to UpdateRequest only

---

## 10. Responsibility Boundaries

| Layer | Responsibility |
|-----|---------------|
| LangGraph | Flow control & decisions |
| Gemini | Language generation |
| pgvector | Semantic memory |
| Backend | Data authority |

---

## 11. Final Summary
The Customer Chatbot AI Service is a **stateful, tool-driven conversational agent**.

- pgvector provides semantic memory and retrieval
- LangGraph enforces business logic and conversation flow
- Gemini handles natural language generation

This architecture ensures correctness, scalability, and clear separation between intelligence, control, and data persistence.


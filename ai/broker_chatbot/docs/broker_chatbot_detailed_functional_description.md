# Broker Chatbot – Detailed Functional Description

## 1. Overview

The **Broker Chatbot** is an internal AI assistant designed specifically to support brokers in handling their assigned customer requests more effectively. Unlike the customer-facing chatbot, this chatbot is **strictly request-scoped**, **context-aware**, and **broker-oriented**.

It acts as an **experienced senior broker advisor**, helping brokers:
- Understand the customer deeply before contacting them
- Analyze customer personality, intent, seriousness, and risks
- Decide the best communication and negotiation strategy
- Avoid common mistakes that lead to lost or withdrawn requests

The chatbot does **not** communicate directly with customers. It communicates **only with brokers** inside the CRM system.

---

## 2. Scope & Access Control

### 2.1 Request-Scoped Access

- Each broker can only access requests **assigned to them**.
- The chatbot conversation is **bound to a single request**.
- A new chatbot context is opened per request.

This ensures:
- Data isolation
- Privacy
- Focused analysis

The chatbot **cannot**:
- See other brokers’ requests
- See unassigned requests
- Answer generic questions unrelated to the current request

---

## 3. Core Responsibilities

The Broker Chatbot is responsible for:

1. **Analyzing customer behavior** based on conversation history
2. **Summarizing the customer request** in practical broker terms
3. **Classifying customer personality and intent**
4. **Highlighting risks and warning signals**
5. **Recommending broker actions and strategies**
6. **Answering broker questions about the request**

---

## 4. Data Sources Used by the Chatbot

The chatbot operates using multiple internal data sources:

### 4.1 Customer ↔ Customer Chatbot Conversations

- Full conversation history between the customer and the customer chatbot
- Extracted requirements and updates
- Confirmation loops and changes

### 4.2 Request Metadata

- Area
- Project
- Unit type
- Budget range
- Size requirements
- Request status

### 4.3 Historical Signals

- Number of requirement changes
- Hesitation patterns
- Time gaps between replies
- Confirmation behavior

---

## 5. Customer Personality Analysis

Before the broker contacts the customer, the chatbot performs a **behavioral and intent analysis**.

### 5.1 Personality Dimensions

The chatbot evaluates:

- **Seriousness level** (High / Medium / Low)
- **Decision speed** (Fast / Hesitant / Slow)
- **Budget realism** (Realistic / Optimistic / Unrealistic)
- **Knowledge level** (Beginner / Informed / Expert)
- **Communication style** (Direct / Negotiator / Indecisive)

### 5.2 Example Output

> "The customer appears to be **price-sensitive**, moderately hesitant, and likely comparing multiple projects. Expect objections around budget and availability."

---

## 6. Request Quality & Risk Assessment

The chatbot flags potential risks before broker engagement.

### 6.1 Risk Indicators

- Multiple budget changes
- Large gap between budget and market prices
- Frequent corrections or confusion
- Avoiding confirmation
- Asking hypothetical or unrealistic questions

### 6.2 Risk Levels

- Low Risk → Proceed normally
- Medium Risk → Needs careful qualification
- High Risk → High chance of withdrawal or loss

---

## 7. Broker Guidance & Strategy Recommendations

The chatbot recommends **how** the broker should approach the customer.

### 7.1 Communication Strategy

Examples:
- Start with education
- Focus on budget alignment
- Limit options to avoid overload
- Push for quick confirmation

### 7.2 Negotiation Advice

Examples:
- When to push
- When to slow down
- When to walk away

---

## 8. Broker Interaction Scenarios

### 8.1 Pre-Call Preparation

**Broker asks:**
> "Summarize this client and how I should start the call."

**Chatbot responds:**
- Client summary
- Key concerns
- Suggested opening sentence

---

### 8.2 During Negotiation

**Broker asks:**
> "Client is asking for a 20% discount. How should I respond?"

**Chatbot responds:**
- Practical negotiation advice
- Risk explanation

---

### 8.3 After Customer Hesitation

**Broker asks:**
> "Client stopped replying. What’s the best follow-up?"

**Chatbot responds:**
- Follow-up timing
- Suggested message tone

---

## 9. Continuous Learning Loop

The chatbot adapts recommendations based on:

- Request outcome (closed / lost / withdrawn)
- Broker actions taken
- Customer final behavior

This improves future recommendations.

---

## 10. Business Value

### For Brokers

- Higher closing rates
- Better preparation
- Reduced stress
- Fewer lost clients

### For Management

- Consistent broker quality
- Reduced dependency on senior brokers
- Scalable training mechanism

---

## 11. Key Design Principles

- Broker-first, not customer-facing
- Advisory, not decision-making
- Context-aware and request-scoped
- Practical, field-tested language
- Arabic-first communication

---

**End of Document**


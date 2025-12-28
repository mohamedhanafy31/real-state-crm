# AI Broker Interview & Verification System

## 1. Overview
This system is **powered by a Large Language Model (LLM)** integrated through the **Cohere API**, and it is a core intelligence component of the broker onboarding flow.

The LLM is not used only as a text generator; instead, it acts as a **reasoning engine and conversational evaluator**. It conducts the interview in a human-like manner, dynamically adapting questions based on previous answers, clarifying ambiguous responses, and maintaining a natural dialogue flow.

Key responsibilities of the LLM in this system include:
- Understanding free-form answers in **Arabic (primary language)** and **English**
- Handling mixed-language inputs (Arabizi, Arabic written in English letters, or English terms inside Arabic sentences)
- Analyzing semantic meaning rather than relying on keyword matching
- Detecting inconsistencies, exaggeration, or evasive behavior across multiple answers
- Applying scoring rules logically based on content quality, realism, and internal coherence

The interview logic (phases, questions, scoring weights) is **defined by the system**, while the LLM executes this logic intelligently. This separation ensures:
- Consistency across all broker interviews
- Fair evaluation regardless of wording style
- Scalability without manual human interviewers

Unlike traditional rule-based chatbots, the LLM can:
- Ask follow-up clarification questions when an answer is unclear
- Rephrase questions if the broker misunderstands
- Identify red flags through language tone and structure
- Compare numerical answers against realistic market ranges

All interview interactions, intermediate scores, detected red flags, and the final decision are logged and stored for audit and review purposes.

The Cohere API is used as the LLM provider due to its strong performance in:
- Multilingual understanding (Arabic & English)
- Long-context conversations
- Instruction-following and reasoning tasks

This LLM-powered approach enables the system to simulate a **real senior broker or supervisor interview**, providing a much higher signal of broker authenticity than static forms or document-only verification.
This document describes the **AI-based Broker Interview and Verification Process** used during broker registration. The interview is conducted automatically by an AI chatbot and aims to determine whether the applicant is:
- A **real, experienced broker**
- A **potential broker requiring additional verification**
- **Not qualified / not a real broker**

The system relies on structured conversational questions, real-world scenarios, and scoring logic rather than documents only.

---

## 2. Objectives of the Interview

- Validate real-world brokerage experience
- Detect fake, scripted, or exaggerated answers
- Assess market knowledge, negotiation skills, and professionalism
- Ensure brokers accepted into the system can properly handle customers

The interview simulates a **real conversation**, not a formal exam.

---

## 3. Interview Structure (Phases)

The interview consists of **6 sequential phases**. Each phase focuses on a different dimension of broker credibility.

---

## Phase 1: Ice-Breaking & Identity Validation

### Purpose
To establish a natural conversation flow and collect baseline professional information.

### Questions
1. How long have you been working as a real estate broker?
2. Do you mainly work in sales, rentals, or both?
3. Which areas or cities do you usually work in?

### Success Criteria
- Clear, direct answers
- Specific areas (not vague like "anywhere" or "all Egypt")
- Consistent experience timeline

### Red Flags
- Extremely generic answers
- Inconsistent timelines
- Avoiding area specification

### Score Weight: 10 points

---

## Phase 2: Real-World Experience Validation

### Purpose
To confirm hands-on experience rather than theoretical knowledge.

### Questions
4. Tell me about the last deal you successfully closed (without sensitive details).
5. What was the main challenge in that deal, and how did you solve it?
6. On average, how long does it take you from first contact with a client to closing a deal?

### Success Criteria
- Logical sequence of events
- Presence of a real problem and solution
- Realistic timelines (not exaggerated)

### Red Flags
- Marketing-style language
- No challenges mentioned
- Unrealistic speed or perfection

### Score Weight: 30 points

---

## Phase 3: Professional Terminology Check

### Purpose
To verify practical understanding of brokerage terms.

### Question Selection
The AI randomly selects **2–3 questions** from the list below:

7. What is a down payment, and when is it refundable?
8. What is the difference between exclusive and non-exclusive selling agreements?
9. In which cases does a broker lose their commission?
10. What does it mean when a deal falls through?

### Success Criteria
- Practical explanations
- Use of examples
- Contextual understanding (not dictionary definitions)

### Red Flags
- Incorrect definitions
- Overly academic explanations
- Confusing terms

### Score Weight: 20 points

---

## Phase 4: Scenario-Based Decision Making

### Purpose
To evaluate negotiation logic and client-handling behavior.

### Primary Scenario
11. A client wants to buy at 20% below market price and refuses to accept reality. What do you do?

### Alternative Scenario (Random)
12. A property owner changes their mind after an initial agreement. How do you protect your rights?

### Success Criteria
- Logical negotiation approach
- Understanding role boundaries
- Balanced behavior (not aggressive, not unrealistic)

### Red Flags
- Emotional or impulsive answers
- Unrealistic guarantees
- Ignoring legal/ethical limits

### Score Weight: 25 points

---

## Phase 5: Numbers & Financial Awareness

### Purpose
To catch fake brokers who avoid numbers.

### Questions
13. What is the average commission rate you work with?
14. If a unit costs 2,000,000, how much commission do you earn?
15. What percentage does your company take?

### Success Criteria
- Correct calculations
- Market-realistic percentages
- Confidence with numbers

### Red Flags
- Hesitation or avoidance
- Incorrect math
- Unrealistic commission rates

### Score Weight: 15 points

---

## Phase 6: Credibility & Self-Awareness

### Purpose
To assess honesty, maturity, and professional self-awareness.

### Questions
16. Why did you lose your last deal?
17. What is the most common mistake you see new brokers make?
18. What type of clients do you usually avoid?

### Success Criteria
- Acknowledgment of failure
- Constructive criticism
- Realistic client assessment

### Red Flags
- Claiming no losses ever
- Blaming others exclusively
- Overconfidence

### Score Weight: 10 points

---

## 4. Scoring System Summary

| Category | Max Score |
|--------|-----------|
| Real Experience | 30 |
| Terminology | 20 |
| Scenarios | 25 |
| Numbers | 15 |
| Language Credibility | 10 |
| **Total** | **100** |

---

## 5. Final Decision Rules

- **85 – 100** → ✅ Verified Broker (Accepted)
- **70 – 84** → ⚠️ Potential Broker (Manual review / extra documents)
- **Below 70** → ❌ Rejected

---

## 6. Automatic Red Flags

- Extremely generic responses
- Avoiding numbers
- Excessive idealism (no losses, no mistakes)
- Incorrect professional terms

Red flags reduce scores automatically.

---

## 7. Outcome Message Examples

- ✅ "Your professional experience has been verified successfully."
- ⚠️ "Your experience appears moderate. Additional verification is recommended."
- ❌ "The provided answers do not demonstrate sufficient real-world brokerage experience."

---

## 8. Business Value

- Prevents fake or unqualified brokers
- Improves overall customer experience
- Reduces failed or mishandled deals
- Scales broker onboarding without human interviews

---

## 9. Extensibility

- Can be converted into a single structured AI prompt
- Supports Arabic (Egyptian dialect) by default
- Can be extended to voice-based interviews
- Easily integrated with backend scoring and audit logs

---

## 10. Conclusion

This AI interview system replaces traditional manual broker screening with a scalable, consistent, and realistic evaluation process that focuses on **actual field experience**, not memorized answers.


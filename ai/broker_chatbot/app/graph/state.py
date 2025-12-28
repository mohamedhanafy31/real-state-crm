"""
Conversation state schema for Broker Chatbot LangGraph.
Defines the state structure passed between workflow nodes.
"""

from typing import TypedDict, List, Optional, Any
from datetime import datetime


class ClientAnalysis(TypedDict, total=False):
    """Analysis of client from their conversation history."""
    
    # Personality traits
    personality_type: str            # budget-sensitive, exploratory, serious, hesitant, negotiator
    communication_style: str         # formal, casual, direct, emotional
    decision_speed: str              # urgent, moderate, slow
    budget_realism: str              # realistic, optimistic, unrealistic
    knowledge_level: str             # beginner, informed, expert
    
    # Seriousness assessment
    seriousness_level: str           # high, medium, low
    intent_strength: str             # strong, moderate, weak
    
    # Risk assessment
    risk_level: str                  # low, medium, high
    risk_indicators: List[str]       # List of warning signs detected
    
    # Summary
    summary: str                     # Human-readable summary of the client


class StrategyRecommendation(TypedDict, total=False):
    """Recommended broker strategy for handling the client."""
    
    # Communication approach
    communication_tone: str          # friendly, professional, reassuring, assertive
    opening_message: str             # Suggested first message to client
    
    # Key points
    key_points: List[str]            # Important points to emphasize
    warnings: List[str]              # Topics to be careful about
    questions_to_ask: List[str]      # Suggested clarifying questions
    
    # Negotiation
    negotiation_tips: List[str]      # Closing strategies
    expected_objections: List[str]   # Objections to prepare for
    
    # Summary
    summary: str                     # Human-readable strategy summary


class RequestData(TypedDict, total=False):
    """Request details from the CRM."""
    
    request_id: str
    customer_id: str
    customer_name: Optional[str]
    customer_phone: Optional[str]
    
    # Request details
    area_id: Optional[str]
    area_name: Optional[str]
    unit_type: Optional[str]
    budget_min: Optional[float]
    budget_max: Optional[float]
    size_min: Optional[float]
    size_max: Optional[float]
    bedrooms: Optional[int]
    
    # Status
    status: str
    created_at: str
    assigned_broker_id: Optional[str]


class ConversationMessage(TypedDict, total=False):
    """Single conversation message."""
    
    conversation_id: str
    actor_type: str                  # customer, broker, ai
    actor_id: str
    message: str
    created_at: str


class BrokerConversationState(TypedDict, total=False):
    """State passed between LangGraph nodes for broker chatbot."""
    
    # ========== Input ==========
    broker_id: str                   # ID of the broker using the chatbot
    request_id: str                  # ID of the client request being analyzed
    broker_message: str              # Broker's question or command
    
    # ========== Context (loaded from backend) ==========
    request_data: RequestData        # Request details from CRM
    client_conversation: List[ConversationMessage]  # Customer-AI conversation history
    client_messages_text: str        # Formatted text of client messages
    
    # ========== Analysis ==========
    client_analysis: ClientAnalysis
    strategy: StrategyRecommendation
    analysis_complete: bool          # Whether analysis has been performed
    
    # ========== Session State ==========
    session_history: List[dict]      # Broker-chatbot conversation history
    is_first_message: bool           # First message in this session
    
    # ========== Output ==========
    response: str                    # Final response to the broker
    
    # ========== Routing ==========
    has_question: bool               # Whether broker asked a specific question
    question_type: Optional[str]     # Type of question (personality, risk, strategy, general)
    
    # ========== Metadata ==========
    timestamp: str
    error: Optional[str]
    access_verified: bool            # Whether broker access was verified

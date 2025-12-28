"""
Conversation state schema for LangGraph.
Defines the state structure passed between nodes.
"""

from typing import TypedDict, List, Optional, Literal, Any
from datetime import datetime


class ExtractedRequirements(TypedDict, total=False):
    """Extracted real estate requirements from conversation."""
    area: Optional[str]
    area_id: Optional[int]  # Matched area ID from DB
    project: Optional[str]
    project_id: Optional[int]  # Matched project ID from DB
    budget_min: Optional[float]
    budget_max: Optional[float]
    unit_type: Optional[str]  # apartment, villa, duplex, etc.
    unit_type_validated: Optional[bool]  # True if matched against DB
    size_min: Optional[float]
    size_max: Optional[float]
    bedrooms: Optional[int]
    bathrooms: Optional[int]
    additional_notes: Optional[str]


class ConversationState(TypedDict, total=False):
    """State passed between LangGraph nodes."""
    
    # Input
    phone_number: str
    user_message: str
    
    # Customer Details (extracted or known)
    customer_name: Optional[str]
    customer_email: Optional[str]
    
    # Context
    conversation_history: List[dict]
    retrieved_context: List[str]
    
    # Intent detection
    intent: Literal[
        "new_search",
        "update_requirements",
        "inquiry",
        "follow_up",
        "greeting",
        "confirm",
        "edit",        # User wants to edit during confirmation
        "correction",  # User is correcting a name (area/project/unit type)
        "cancel",      # User wants to cancel/reset the request
        "unknown"
    ]
    
    # Requirements
    extracted_requirements: ExtractedRequirements
    missing_fields: List[str]
    is_complete: bool
    confirmed: bool  # User confirmed requirements
    
    # Project Suggestion Logic
    should_suggest_projects: bool  # Logic decided to suggest projects
    project_suggested: bool        # Suggestion question has been asked
    
    # Name validation (Phase 4)
    names_validated: bool  # All names matched against DB
    pending_correction: Optional[dict]  # Name needing correction
    awaiting_name_correction: bool  # Waiting for user to confirm name
    
    # Confirmation loop (Phase 7)
    confirmation_attempt: int  # Number of confirmation attempts
    awaiting_confirmation: bool  # Waiting for explicit confirm
    
    # Output
    response: str
    should_ask_clarification: bool
    clarification_question: Optional[str]
    
    # Backend Integration
    matched_units: Optional[List[dict]]
    request_id: Optional[int]
    customer_id: Optional[int]
    available_areas: Optional[List[dict]]
    area_not_found: Optional[str]
    inquiry_results: Optional[Any]  # For general inquiries (projects, areas, etc.)
    inquiry_classification: Optional[dict]  # Smart Router classification result
    
    # Metadata
    timestamp: str
    error: Optional[str]

"""
LangGraph workflow builder.
Defines the conversation flow as a directed graph.
"""

from langgraph.graph import StateGraph, END
from typing import Literal

from app.graph.state import ConversationState
from app.graph import nodes


def should_search_or_clarify(state: ConversationState) -> Literal["search", "clarify"]:
    """Routing function to decide if we should search units or ask for clarification.
    
    Args:
        state: Current conversation state.
        
    Returns:
        "search" if complete, "clarify" if missing data.
    """
    if state.get("is_complete"):
        return "search"
    return "clarify"


def build_conversation_workflow() -> StateGraph:
    """Build and compile the conversation workflow graph.
    
    Returns:
        Compiled LangGraph workflow.
    """
    # Create the graph
    workflow = StateGraph(ConversationState)
    
    # Add all nodes
    workflow.add_node("receive_message", nodes.receive_message)
    workflow.add_node("load_session_state", nodes.load_session_state)
    workflow.add_node("retrieve_context", nodes.retrieve_context)
    workflow.add_node("detect_intent", nodes.detect_intent)
    workflow.add_node("extract_requirements", nodes.extract_requirements)
    workflow.add_node("validate_names", nodes.validate_names)
    workflow.add_node("generate_correction_prompt", nodes.generate_correction_prompt)
    workflow.add_node("check_missing_data", nodes.check_missing_data)
    workflow.add_node("generate_clarification", nodes.generate_clarification)
    workflow.add_node("search_units", nodes.search_units)
    workflow.add_node("requirement_confirmation", nodes.requirement_confirmation)
    workflow.add_node("create_request", nodes.create_customer_request)
    workflow.add_node("handle_inquiry", nodes.handle_inquiry)
    workflow.add_node("generate_response", nodes.generate_response)
    workflow.add_node("save_session_state", nodes.save_session_state)
    workflow.add_node("persist_conversation", nodes.persist_conversation)
    
    # Define linear flow with conditional routing
    workflow.set_entry_point("receive_message")
    
    workflow.add_edge("receive_message", "load_session_state")
    workflow.add_edge("load_session_state", "retrieve_context")
    workflow.add_edge("retrieve_context", "detect_intent")
    workflow.add_edge("detect_intent", "extract_requirements")
    
    
    # CRITICAL FIX: Inquiry intent should also validate names to set area_id/project_id
    # This prevents re-validation errors in handle_inquiry
    workflow.add_edge("extract_requirements", "validate_names")
    
    # Check if names are valid or need correction
    def route_after_validation(state: ConversationState) -> Literal["correction", "inquiry", "check_missing"]:
        if state.get("pending_correction"):
            return "correction"
        # Route inquiry to handle_inquiry after validation
        if state.get("intent") == "inquiry":
            return "inquiry"
        return "check_missing"
        
    workflow.add_conditional_edges(
        "validate_names",
        route_after_validation,
        {
            "correction": "generate_correction_prompt",
            "inquiry": "handle_inquiry",
            "check_missing": "check_missing_data"
        }
    )
    
    workflow.add_edge("generate_correction_prompt", "generate_response")
    
    # Conditional routing: complete requirements → summary/confirmation, incomplete → clarify
    def should_confirm_or_clarify(state: ConversationState) -> Literal["confirm", "clarify"]:
        if state.get("is_complete"):
            return "confirm"
        return "clarify"

    workflow.add_conditional_edges(
        "check_missing_data",
        should_confirm_or_clarify,
        {
            "confirm": "search_units",
            "clarify": "generate_clarification"
        }
    )
    
    # Search units then confirm
    workflow.add_edge("search_units", "requirement_confirmation")
    
    # After confirmation: if confirmed → create request, else → generate response
    def route_after_confirmation(state: ConversationState) -> Literal["create", "respond"]:
        if state.get("confirmed"):
            return "create"
        return "respond"

    workflow.add_conditional_edges(
        "requirement_confirmation",
        route_after_confirmation,
        {
            "create": "create_request",
            "respond": "generate_response"
        }
    )
    
    # Final paths
    workflow.add_edge("create_request", "generate_response")
    workflow.add_edge("generate_clarification", "generate_response")
    workflow.add_edge("handle_inquiry", "generate_response")
    
    workflow.add_edge("generate_response", "save_session_state")
    workflow.add_edge("save_session_state", "persist_conversation")
    workflow.add_edge("persist_conversation", END)
    
    # Compile the graph
    return workflow.compile()


# Singleton workflow instance
_workflow_instance = None


def get_workflow():
    """Get or create the workflow instance.
    
    Returns:
        Compiled LangGraph workflow.
    """
    global _workflow_instance
    if _workflow_instance is None:
        _workflow_instance = build_conversation_workflow()
    return _workflow_instance

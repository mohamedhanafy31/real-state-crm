"""
LangGraph workflow builder for Broker Chatbot.
Defines the conversation flow as a directed graph.
"""

from langgraph.graph import StateGraph, END
from typing import Literal

from app.graph.state import BrokerConversationState
from app.graph import nodes
from app.core.logging_config import get_logger

logger = get_logger(__name__)


def should_handle_question(state: BrokerConversationState) -> Literal["question", "summary"]:
    """Route to question handler or summary generator.
    
    Args:
        state: Current conversation state.
        
    Returns:
        "question" if broker asked a question, "summary" for initial analysis.
    """
    if state.get('has_question'):
        return "question"
    return "summary"


def check_for_error(state: BrokerConversationState) -> Literal["continue", "error"]:
    """Check if there's an error in the state.
    
    Args:
        state: Current conversation state.
        
    Returns:
        "error" if error exists, "continue" otherwise.
    """
    if state.get('error'):
        return "error"
    return "continue"


def build_broker_workflow() -> StateGraph:
    """Build and compile the broker chatbot workflow graph.
    
    The workflow follows this flow:
    1. receive_message - Validate input
    2. detect_question_type - Check if broker asked a question
    3. load_request_context - Fetch request and conversations from backend
    4. analyze_client_personality - Analyze client from their messages
    5. assess_request_risk - Evaluate risk indicators
    6. generate_strategy - Create broker recommendations
    7. Conditional:
       - If question: handle_broker_question
       - Else: generate_response (summary)
    8. END
    
    Returns:
        Compiled LangGraph workflow.
    """
    logger.info("Building broker chatbot workflow...")
    
    # Create the graph
    workflow = StateGraph(BrokerConversationState)
    
    # ========== Add all nodes ==========
    workflow.add_node("receive_message", nodes.receive_message)
    workflow.add_node("detect_question_type", nodes.detect_question_type)
    workflow.add_node("load_request_context", nodes.load_request_context)
    workflow.add_node("analyze_client_personality", nodes.analyze_client_personality)
    workflow.add_node("assess_request_risk", nodes.assess_request_risk)
    workflow.add_node("generate_strategy", nodes.generate_strategy)
    workflow.add_node("handle_broker_question", nodes.handle_broker_question)
    workflow.add_node("generate_response", nodes.generate_response)
    workflow.add_node("persist_conversation", nodes.persist_conversation)
    
    # ========== Define the flow ==========
    
    # Set entry point
    workflow.set_entry_point("receive_message")
    
    # Linear flow: receive → detect → load context
    workflow.add_edge("receive_message", "detect_question_type")
    workflow.add_edge("detect_question_type", "load_request_context")
    
    # After loading context, check for errors
    workflow.add_conditional_edges(
        "load_request_context",
        check_for_error,
        {
            "error": "generate_response",  # Go directly to response if error
            "continue": "analyze_client_personality"
        }
    )
    
    # Linear flow through analysis
    workflow.add_edge("analyze_client_personality", "assess_request_risk")
    workflow.add_edge("assess_request_risk", "generate_strategy")
    
    # After strategy, route based on whether broker asked a question
    workflow.add_conditional_edges(
        "generate_strategy",
        should_handle_question,
        {
            "question": "handle_broker_question",
            "summary": "generate_response"
        }
    )
    
    # Both response paths lead to persist_conversation
    workflow.add_edge("handle_broker_question", "persist_conversation")
    workflow.add_edge("generate_response", "persist_conversation")
    
    # Persist leads to END
    workflow.add_edge("persist_conversation", END)
    
    # Compile the graph
    compiled = workflow.compile()
    logger.info("Broker chatbot workflow compiled successfully")
    
    return compiled


# Singleton workflow instance
_workflow_instance = None


def get_workflow():
    """Get or create the workflow instance.
    
    Returns:
        Compiled LangGraph workflow.
    """
    global _workflow_instance
    if _workflow_instance is None:
        _workflow_instance = build_broker_workflow()
    return _workflow_instance

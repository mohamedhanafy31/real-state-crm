"""
Chat routes for Broker Chatbot.
Main endpoint for broker-chatbot interactions.
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime

from app.models.schemas import (
    BrokerChatRequest,
    BrokerChatResponse,
    ClientAnalysisResponse,
    StrategyResponse,
    RequestDataResponse,
    ErrorResponse
)
from app.graph.workflow import get_workflow
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api", tags=["Chat"])


@router.post(
    "/chat",
    response_model=BrokerChatResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Bad request"},
        403: {"model": ErrorResponse, "description": "Access denied"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def chat(request: BrokerChatRequest) -> BrokerChatResponse:
    """Main chat endpoint for broker chatbot.
    
    Processes broker's message/question and returns analysis and recommendations.
    
    Args:
        request: BrokerChatRequest with broker_id, request_id, and message.
        
    Returns:
        BrokerChatResponse with analysis, strategy, and response.
        
    Raises:
        HTTPException: On validation or processing errors.
    """
    logger.info(f"Chat request from broker {request.broker_id} for request {request.request_id}")
    
    # Detailed Input Logging
    logger.info(f"\n=== API ENDPOINT INPUT START ===\n{request.model_dump_json(indent=2)}\n=== API ENDPOINT INPUT END ===\n")
    
    try:
        # Get the workflow
        workflow = get_workflow()
        
        # Prepare initial state
        initial_state = {
            "broker_id": request.broker_id,
            "request_id": request.request_id,
            "broker_message": request.message,
            "session_history": [],
            "is_first_message": True
        }
        
        # Run the workflow
        logger.info("Running broker chatbot workflow...")
        result = workflow.invoke(initial_state)
        
        # Check for errors
        if result.get('error'):
            logger.warning(f"Workflow returned error: {result['error']}")
            return BrokerChatResponse(
                success=False,
                response=result['error'],
                error=result['error'],
                timestamp=result.get('timestamp', datetime.now().isoformat())
            )
        
        # Extract analysis and strategy
        client_analysis = result.get('client_analysis', {})
        strategy = result.get('strategy', {})
        request_data = result.get('request_data', {})
        
        # Build response
        response = BrokerChatResponse(
            success=True,
            response=result.get('response', 'لم يتم إنشاء رد'),
            client_analysis=ClientAnalysisResponse(
                personality_type=client_analysis.get('personality_type'),
                communication_style=client_analysis.get('communication_style'),
                decision_speed=client_analysis.get('decision_speed'),
                budget_realism=client_analysis.get('budget_realism'),
                seriousness_level=client_analysis.get('seriousness_level'),
                risk_level=client_analysis.get('risk_level'),
                risk_indicators=client_analysis.get('risk_indicators', []),
                summary=client_analysis.get('summary')
            ) if client_analysis else None,
            strategy=StrategyResponse(
                communication_tone=strategy.get('communication_tone'),
                opening_message=strategy.get('opening_message'),
                key_points=strategy.get('key_points', []),
                warnings=strategy.get('warnings', []),
                negotiation_tips=strategy.get('negotiation_tips', []),
                summary=strategy.get('summary')
            ) if strategy else None,
            request_data=RequestDataResponse(
                request_id=request_data.get('request_id', request.request_id),
                customer_name=request_data.get('customer_name'),
                area_name=request_data.get('area_name'),
                unit_type=request_data.get('unit_type'),
                budget_min=request_data.get('budget_min'),
                budget_max=request_data.get('budget_max'),
                status=request_data.get('status')
            ) if request_data else None,
            timestamp=result.get('timestamp', datetime.now().isoformat())
        )
        
        logger.info(f"Chat response generated successfully for broker {request.broker_id}")
        
        # Detailed Output Logging
        logger.info(f"\n=== API ENDPOINT OUTPUT START ===\n{response.model_dump_json(indent=2)}\n=== API ENDPOINT OUTPUT END ===\n")
        
        return response
        
    except Exception as e:
        logger.error(f"Error processing chat request: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"حدث خطأ أثناء معالجة الطلب: {str(e)}"
        )


@router.get("/requests/{request_id}/summary")
async def get_request_summary(request_id: str, broker_id: str) -> BrokerChatResponse:
    """Get a quick summary of a request without asking a specific question.
    
    Args:
        request_id: ID of the request.
        broker_id: ID of the broker.
        
    Returns:
        Quick analysis summary.
    """
    # Delegate to main chat with a standard message
    request = BrokerChatRequest(
        broker_id=broker_id,
        request_id=request_id,
        message="اعطيني ملخص سريع عن العميل والتوصيات"
    )
    return await chat(request)

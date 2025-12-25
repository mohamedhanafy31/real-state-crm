"""
LangGraph node definitions for Broker Chatbot workflow.
Each node represents a step in the conversation processing pipeline.
"""

from typing import Dict, Any
from datetime import datetime
import json

from app.graph.state import BrokerConversationState, ClientAnalysis, StrategyRecommendation
from app.core.llm import get_llm_service
from app.core.logging_config import get_logger
from app.services.backend_api import get_backend_api_service

logger = get_logger(__name__)


def receive_message(state: BrokerConversationState) -> Dict[str, Any]:
    """Entry point - receives and validates the broker's message.
    
    Args:
        state: Current conversation state.
        
    Returns:
        Updated state with timestamp and validation.
    """
    logger.info(f"Receiving message from broker {state.get('broker_id')} for request {state.get('request_id')}")
    
    # Validate required fields
    if not state.get('broker_id'):
        return {
            "error": "broker_id is required",
            "timestamp": datetime.now().isoformat()
        }
    
    if not state.get('request_id'):
        return {
            "error": "request_id is required",
            "timestamp": datetime.now().isoformat()
        }
    
    if not state.get('broker_message'):
        return {
            "error": "broker_message is required",
            "timestamp": datetime.now().isoformat()
        }
    
    return {
        "timestamp": datetime.now().isoformat(),
        "error": None
    }


def load_request_context(state: BrokerConversationState) -> Dict[str, Any]:
    """Load request details and conversation history from backend.
    
    Args:
        state: Current conversation state.
        
    Returns:
        Updated state with request data and conversations.
    """
    if state.get('error'):
        return {}
    
    broker_id = state.get('broker_id')
    request_id = state.get('request_id')
    
    logger.info(f"Loading context for request {request_id}")
    
    backend_api = get_backend_api_service()
    
    # Get request with conversations (includes access verification)
    request_data = backend_api.get_request_with_conversations(request_id, broker_id)
    
    if not request_data:
        logger.warning(f"Request {request_id} not found or broker {broker_id} not authorized")
        return {
            "error": f"الطلب رقم {request_id} غير موجود أو ليس لديك صلاحية الوصول إليه",
            "access_verified": False
        }
    
    # Extract conversations
    conversations = request_data.get('conversations', [])
    
    # Filter to only customer and AI messages (not broker messages)
    client_conversation = [
        conv for conv in conversations 
        if conv.get('actor_type') in ('customer', 'ai')
    ]
    
    # Format client messages as text for analysis
    client_messages_text = _format_conversations_for_analysis(client_conversation)
    
    logger.info(f"Loaded {len(client_conversation)} client messages for analysis")
    
    return {
        "request_data": {
            "request_id": request_data.get('requestId'),
            "customer_id": request_data.get('customerId'),
            "customer_name": request_data.get('customer', {}).get('name'),
            "customer_phone": request_data.get('customer', {}).get('phone'),
            "area_id": request_data.get('areaId'),
            "area_name": request_data.get('area', {}).get('name'),
            "unit_type": request_data.get('unitType'),
            "budget_min": request_data.get('budgetMin'),
            "budget_max": request_data.get('budgetMax'),
            "size_min": request_data.get('sizeMin'),
            "size_max": request_data.get('sizeMax'),
            "bedrooms": request_data.get('bedrooms'),
            "status": request_data.get('status'),
            "created_at": str(request_data.get('createdAt', '')),
            "assigned_broker_id": request_data.get('assignedBrokerId')
        },
        "client_conversation": client_conversation,
        "client_messages_text": client_messages_text,
        "access_verified": True
    }


def _format_conversations_for_analysis(conversations: list) -> str:
    """Format conversation messages for LLM analysis.
    
    Args:
        conversations: List of conversation messages.
        
    Returns:
        Formatted string of conversations.
    """
    if not conversations:
        return "لا توجد محادثات سابقة"
    
    formatted = []
    for conv in conversations:
        actor = "العميل" if conv.get('actor_type') == 'customer' else "المساعد الآلي"
        message = conv.get('message', '')
        formatted.append(f"{actor}: {message}")
    
    return "\n".join(formatted)


def analyze_client_personality(state: BrokerConversationState) -> Dict[str, Any]:
    """Analyze client personality from conversation history.
    
    Args:
        state: Current conversation state.
        
    Returns:
        Updated state with client analysis.
    """
    if state.get('error'):
        return {}
    
    client_messages = state.get('client_messages_text', '')
    request_data = state.get('request_data', {})
    
    if not client_messages or client_messages == "لا توجد محادثات سابقة":
        logger.info("No client conversations to analyze")
        return {
            "client_analysis": {
                "personality_type": "غير محدد",
                "communication_style": "غير محدد",
                "decision_speed": "غير محدد",
                "budget_realism": "غير محدد",
                "seriousness_level": "غير محدد",
                "risk_level": "منخفض",
                "risk_indicators": [],
                "summary": "لا توجد محادثات كافية لتحليل شخصية العميل"
            },
            "analysis_complete": False
        }
    
    logger.info("Analyzing client personality...")
    
    llm_service = get_llm_service()
    
    # Build analysis prompt
    analysis_prompt = """حلل شخصية العميل التالي من محادثاته:

**محادثات العميل:**
{conversations}

**تفاصيل الطلب:**
- المنطقة: {area}
- نوع الوحدة: {unit_type}
- الميزانية: {budget_min} - {budget_max} جنيه
- المساحة المطلوبة: {size_min} متر

**المطلوب:**
قدم تحليلاً مختصراً يشمل:
1. نوع الشخصية (حساس للميزانية / مستكشف / جاد / متردد / مفاوض)
2. أسلوب التواصل (رسمي / ودي / مباشر)
3. سرعة اتخاذ القرار (عاجل / متوسط / بطيء)
4. واقعية الميزانية (واقعي / متفائل / غير واقعي)
5. مستوى الجدية (عالي / متوسط / منخفض)
6. ملخص قصير للعميل

أجب بشكل مباشر ومختصر.""".format(
        conversations=client_messages,
        area=request_data.get('area_name', 'غير محدد'),
        unit_type=request_data.get('unit_type', 'غير محدد'),
        budget_min=request_data.get('budget_min', 'غير محدد'),
        budget_max=request_data.get('budget_max', 'غير محدد'),
        size_min=request_data.get('size_min', 'غير محدد')
    )
    
    try:
        analysis_response = llm_service.generate_response(analysis_prompt)
        
        # Parse the response into structured analysis
        client_analysis = _parse_personality_analysis(analysis_response)
        
        logger.info(f"Client analysis complete: {client_analysis.get('personality_type')}")
        
        return {
            "client_analysis": client_analysis,
            "analysis_complete": True
        }
        
    except Exception as e:
        logger.error(f"Error analyzing client personality: {e}")
        return {
            "client_analysis": {
                "summary": "حدث خطأ أثناء تحليل شخصية العميل"
            },
            "analysis_complete": False,
            "error": str(e)
        }


def _parse_personality_analysis(response: str) -> ClientAnalysis:
    """Parse LLM response into structured ClientAnalysis.
    
    Args:
        response: LLM response text.
        
    Returns:
        Structured ClientAnalysis dict.
    """
    # Default values
    analysis: ClientAnalysis = {
        "personality_type": "غير محدد",
        "communication_style": "غير محدد",
        "decision_speed": "متوسط",
        "budget_realism": "غير محدد",
        "seriousness_level": "متوسط",
        "risk_level": "متوسط",
        "risk_indicators": [],
        "summary": response
    }
    
    # Try to extract structured info from response
    response_lower = response.lower()
    
    # Personality type detection
    if any(word in response for word in ['حساس للميزانية', 'حساس للسعر', 'budget-sensitive']):
        analysis['personality_type'] = 'حساس للميزانية'
    elif any(word in response for word in ['مستكشف', 'استكشاف', 'exploratory']):
        analysis['personality_type'] = 'مستكشف'
    elif any(word in response for word in ['جاد', 'جدي', 'serious']):
        analysis['personality_type'] = 'جاد'
    elif any(word in response for word in ['متردد', 'hesitant']):
        analysis['personality_type'] = 'متردد'
    elif any(word in response for word in ['مفاوض', 'negotiator']):
        analysis['personality_type'] = 'مفاوض'
    
    # Seriousness level
    if any(word in response for word in ['جدية عالية', 'عالي', 'high']):
        analysis['seriousness_level'] = 'عالي'
    elif any(word in response for word in ['منخفض', 'low', 'ضعيف']):
        analysis['seriousness_level'] = 'منخفض'
    
    # Decision speed
    if any(word in response for word in ['عاجل', 'سريع', 'urgent']):
        analysis['decision_speed'] = 'عاجل'
    elif any(word in response for word in ['بطيء', 'slow']):
        analysis['decision_speed'] = 'بطيء'
    
    return analysis


def assess_request_risk(state: BrokerConversationState) -> Dict[str, Any]:
    """Assess risk level of the request.
    
    Args:
        state: Current conversation state.
        
    Returns:
        Updated state with risk assessment.
    """
    if state.get('error'):
        return {}
    
    client_analysis = state.get('client_analysis', {})
    client_messages = state.get('client_messages_text', '')
    
    risk_indicators = []
    risk_level = 'منخفض'
    
    # Check for risk indicators
    if 'متردد' in client_analysis.get('personality_type', ''):
        risk_indicators.append('العميل متردد في قراراته')
        risk_level = 'متوسط'
    
    if client_analysis.get('budget_realism') == 'غير واقعي':
        risk_indicators.append('توقعات ميزانية غير واقعية')
        risk_level = 'عالي'
    
    if client_analysis.get('seriousness_level') == 'منخفض':
        risk_indicators.append('مستوى جدية منخفض')
        risk_level = 'عالي'
    
    # Check conversation patterns
    if client_messages:
        # Multiple mentions of budget changes
        budget_mentions = client_messages.lower().count('ميزانية') + client_messages.lower().count('سعر')
        if budget_mentions > 3:
            risk_indicators.append('تغييرات متكررة في موضوع الميزانية')
            risk_level = 'متوسط' if risk_level == 'منخفض' else risk_level
    
    logger.info(f"Risk assessment: {risk_level} with {len(risk_indicators)} indicators")
    
    # Update analysis with risk info
    updated_analysis = {**client_analysis}
    updated_analysis['risk_level'] = risk_level
    updated_analysis['risk_indicators'] = risk_indicators
    
    return {
        "client_analysis": updated_analysis
    }


def generate_strategy(state: BrokerConversationState) -> Dict[str, Any]:
    """Generate broker strategy recommendations.
    
    Args:
        state: Current conversation state.
        
    Returns:
        Updated state with strategy recommendations.
    """
    if state.get('error'):
        return {}
    
    client_analysis = state.get('client_analysis', {})
    request_data = state.get('request_data', {})
    client_messages = state.get('client_messages_text', '')
    
    logger.info("Generating broker strategy...")
    
    llm_service = get_llm_service()
    
    strategy_prompt = """بناءً على تحليل العميل التالي، قدم استراتيجية للوسيط:

**تحليل العميل:**
- نوع الشخصية: {personality}
- مستوى الجدية: {seriousness}
- مستوى المخاطر: {risk}
- المخاطر المحددة: {risk_indicators}

**تفاصيل الطلب:**
- المنطقة: {area}
- الميزانية: {budget_min} - {budget_max}

**المطلوب:**
1. النبرة المناسبة للتواصل (ودية / مهنية / مطمئنة)
2. جملة افتتاحية مقترحة للتواصل مع العميل
3. نقاط مهمة يجب التركيز عليها (3 نقاط)
4. تحذيرات يجب مراعاتها
5. نصائح للتفاوض

أجب بشكل مختصر وعملي.""".format(
        personality=client_analysis.get('personality_type', 'غير محدد'),
        seriousness=client_analysis.get('seriousness_level', 'غير محدد'),
        risk=client_analysis.get('risk_level', 'غير محدد'),
        risk_indicators=', '.join(client_analysis.get('risk_indicators', [])) or 'لا توجد',
        area=request_data.get('area_name', 'غير محدد'),
        budget_min=request_data.get('budget_min', 'غير محدد'),
        budget_max=request_data.get('budget_max', 'غير محدد')
    )
    
    try:
        strategy_response = llm_service.generate_response(strategy_prompt)
        
        strategy: StrategyRecommendation = {
            "summary": strategy_response,
            "communication_tone": _extract_tone(strategy_response),
            "key_points": [],
            "warnings": client_analysis.get('risk_indicators', []),
            "negotiation_tips": []
        }
        
        logger.info("Strategy generation complete")
        
        return {
            "strategy": strategy
        }
        
    except Exception as e:
        logger.error(f"Error generating strategy: {e}")
        return {
            "strategy": {
                "summary": "حدث خطأ أثناء إنشاء الاستراتيجية"
            }
        }


def _extract_tone(response: str) -> str:
    """Extract recommended tone from LLM response."""
    if any(word in response for word in ['ودية', 'ودي', 'friendly']):
        return 'ودية'
    elif any(word in response for word in ['مطمئنة', 'reassuring']):
        return 'مطمئنة'
    elif any(word in response for word in ['حازم', 'assertive']):
        return 'حازمة'
    return 'مهنية'


def handle_broker_question(state: BrokerConversationState) -> Dict[str, Any]:
    """Handle specific question from broker.
    
    Args:
        state: Current conversation state.
        
    Returns:
        Updated state with answer to broker's question.
    """
    if state.get('error'):
        return {}
    
    broker_message = state.get('broker_message', '')
    client_analysis = state.get('client_analysis', {})
    strategy = state.get('strategy', {})
    client_messages = state.get('client_messages_text', '')
    request_data = state.get('request_data', {})
    
    logger.info(f"Handling broker question: {broker_message[:50]}...")
    
    llm_service = get_llm_service()
    
    # Build context for answering the question
    context = f"""
**تحليل العميل:**
{client_analysis.get('summary', 'لا يوجد تحليل')}

**الاستراتيجية المقترحة:**
{strategy.get('summary', 'لا توجد استراتيجية')}

**محادثات العميل:**
{client_messages}

**تفاصيل الطلب:**
- المنطقة: {request_data.get('area_name', 'غير محدد')}
- الميزانية: {request_data.get('budget_min', '?')} - {request_data.get('budget_max', '?')}
- نوع الوحدة: {request_data.get('unit_type', 'غير محدد')}
"""
    
    try:
        response = llm_service.generate_response(
            user_message=broker_message,
            context=context
        )
        
        return {
            "response": response
        }
        
    except Exception as e:
        logger.error(f"Error handling broker question: {e}")
        return {
            "response": "عذراً، حدث خطأ أثناء معالجة سؤالك. حاول مرة أخرى."
        }


def generate_response(state: BrokerConversationState) -> Dict[str, Any]:
    """Generate final response for the broker.
    
    Args:
        state: Current conversation state.
        
    Returns:
        Updated state with final response.
    """
    # If there's already a response (from handle_broker_question), use it
    if state.get('response'):
        return {}
    
    # If there's an error, return error message
    if state.get('error'):
        return {
            "response": f"❌ {state.get('error')}"
        }
    
    # Build comprehensive response from analysis and strategy
    client_analysis = state.get('client_analysis', {})
    strategy = state.get('strategy', {})
    request_data = state.get('request_data', {})
    
    # Format response
    response_parts = []
    
    # Header
    response_parts.append(f"📊 **تحليل الطلب رقم {request_data.get('request_id', '?')}**\n")
    
    # Client Analysis Section
    response_parts.append("🧑 **تحليل العميل:**")
    response_parts.append(f"• نوع الشخصية: {client_analysis.get('personality_type', 'غير محدد')}")
    response_parts.append(f"• مستوى الجدية: {client_analysis.get('seriousness_level', 'غير محدد')}")
    response_parts.append(f"• مستوى المخاطر: {client_analysis.get('risk_level', 'غير محدد')}")
    
    if client_analysis.get('risk_indicators'):
        response_parts.append(f"• تحذيرات: {', '.join(client_analysis['risk_indicators'])}")
    
    response_parts.append("")
    
    # Strategy Section
    response_parts.append("💡 **التوصيات:**")
    response_parts.append(f"• نبرة التواصل: {strategy.get('communication_tone', 'مهنية')}")
    
    if strategy.get('summary'):
        response_parts.append(f"\n{strategy['summary']}")
    
    final_response = "\n".join(response_parts)
    
    logger.info("Generated final response for broker")
    
    return {
        "response": final_response
    }


def detect_question_type(state: BrokerConversationState) -> Dict[str, Any]:
    """Detect if broker message is a question and its type.
    
    Args:
        state: Current conversation state.
        
    Returns:
        Updated state with question detection results.
    """
    broker_message = state.get('broker_message', '').lower()
    
    # Check if it's a question
    question_words = ['؟', '?', 'هل', 'ما', 'كيف', 'لماذا', 'متى', 'أين', 'ازاي', 'ليه', 'ايه']
    has_question = any(word in broker_message for word in question_words)
    
    # Determine question type
    question_type = None
    if has_question:
        if any(word in broker_message for word in ['جاد', 'جدي', 'سيرياس', 'serious']):
            question_type = 'seriousness'
        elif any(word in broker_message for word in ['خطر', 'مخاطر', 'risk']):
            question_type = 'risk'
        elif any(word in broker_message for word in ['استراتيجية', 'اتعامل', 'تعامل', 'strategy']):
            question_type = 'strategy'
        elif any(word in broker_message for word in ['شخصية', 'personality']):
            question_type = 'personality'
        else:
            question_type = 'general'
    
    return {
        "has_question": has_question,
        "question_type": question_type,
        "is_first_message": not state.get('session_history')
    }

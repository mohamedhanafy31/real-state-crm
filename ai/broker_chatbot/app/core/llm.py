"""
LLM service for Broker Chatbot using Cohere API.
Provides text generation for broker assistance and client analysis.
"""

from typing import List, Optional, Any
from functools import lru_cache
from abc import ABC, abstractmethod

from langchain_cohere import ChatCohere
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from app.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class ILLMService(ABC):
    """Interface for LLM services."""
    
    @abstractmethod
    def generate_response(
        self,
        user_message: str,
        context: Optional[str] = None,
        conversation_history: Optional[List[dict]] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        """Generate response."""
        pass

    @abstractmethod
    def validate_connectivity(self) -> bool:
        """Check if API is working."""
        pass


class CohereLLMService(ILLMService):
    """Service for generating text using Cohere API."""
    
    def __init__(self, api_key: str = None, model_name: str = "command-a-03-2025"):
        """Initialize Cohere LLM service.
        
        Args:
            api_key: Cohere API key.
            model_name: Cohere model to use.
        """
        settings = get_settings()
        self.api_key = api_key or settings.cohere_api_key
        self.model_name = model_name
        self._llm = None
    
    @property
    def llm(self) -> ChatCohere:
        """Lazy-load the LLM instance."""
        if self._llm is None:
            if not self.api_key:
                raise ValueError("COHERE_API_KEY is not set in environment.")
            self._llm = ChatCohere(
                model=self.model_name,
                cohere_api_key=self.api_key,
                temperature=0.7
            )
            logger.info(f"Initialized Cohere LLM with model: {self.model_name}")
        return self._llm
    
    def _get_broker_system_prompt(self) -> str:
        """Get the system prompt for broker chatbot."""
        return """أنت مساعد ذكي متخصص لمساعدة وسطاء العقارات. مهمتك هي:

1. **تحليل شخصية العميل**: افهم من خلال محادثات العميل السابقة نوع شخصيته (حساس للميزانية، مستكشف، جاد، متردد، إلخ)
2. **تقييم المخاطر**: حدد علامات التحذير مثل تغييرات متكررة في الميزانية، توقعات غير واقعية، أو تردد
3. **تقديم استراتيجية**: اقترح أفضل طريقة للتواصل مع العميل وكيفية إتمام الصفقة
4. **الإجابة على أسئلة الوسيط**: أجب بوضوح على أي سؤال يطرحه الوسيط عن العميل

قواعد مهمة:
- تحدث دائماً بالعربية الواضحة والمهنية
- قدم تحليلاً عملياً يمكن للوسيط تطبيقه فوراً
- كن صريحاً في تقييم جدية العميل ومستوى المخاطر
- اقترح جملاً محددة يمكن للوسيط استخدامها مع العميل
- لا تفترض معلومات غير موجودة في البيانات المتاحة

أنت وسيط عقاري ذو خبرة 20 عاماً تساعد زملاءك الأقل خبرة."""
    
    def _prepare_messages(
        self,
        user_message: str,
        context: Optional[str] = None,
        conversation_history: Optional[List[dict]] = None,
        system_prompt: Optional[str] = None
    ) -> List[Any]:
        """Prepare LangChain messages for the LLM.
        
        Args:
            user_message: The broker's message/question.
            context: Additional context (client data, analysis).
            conversation_history: Previous broker-chatbot conversation.
            system_prompt: Optional custom system prompt.
            
        Returns:
            List of LangChain message objects.
        """
        messages = []
        
        # Add system prompt
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        else:
            messages.append(SystemMessage(content=self._get_broker_system_prompt()))
        
        # Add context if available
        if context:
            messages.append(SystemMessage(content=f"البيانات المتاحة:\n{context}"))
        
        # Add conversation history
        if conversation_history:
            for msg in conversation_history:
                if msg.get("role") == "user":
                    messages.append(HumanMessage(content=msg["content"]))
                elif msg.get("role") == "assistant":
                    messages.append(AIMessage(content=msg["content"]))
        
        # Add current user message
        messages.append(HumanMessage(content=user_message))
        return messages
    
    def validate_connectivity(self) -> bool:
        """Validate that Cohere API is accessible.
        
        Returns:
            True if API is working.
            
        Raises:
            Exception if API is not accessible.
        """
        logger.info("Validating Cohere API connectivity...")
        try:
            self.llm.invoke([HumanMessage(content="hi")])
            logger.info("Cohere API connectivity validated successfully")
            return True
        except Exception as e:
            logger.error(f"Cohere API validation failed: {e}")
            raise e
    
    def generate_response(
        self,
        user_message: str,
        context: Optional[str] = None,
        conversation_history: Optional[List[dict]] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        """Generate AI response using Cohere.
        
        Args:
            user_message: The broker's question or command.
            context: Client data and analysis context.
            conversation_history: Previous messages in this session.
            system_prompt: Optional custom system prompt.
            
        Returns:
            Generated response text.
        """
        messages = self._prepare_messages(
            user_message, context, conversation_history, system_prompt
        )
        logger.info(f"Generating response for broker message (length: {len(user_message)})")
        
        try:
            response = self.llm.invoke(messages)
            logger.debug(f"Generated response (length: {len(response.content)})")
            return response.content
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            raise
    
    def analyze_client_personality(
        self,
        client_messages: List[dict]
    ) -> str:
        """Analyze client personality from their conversation history.
        
        Args:
            client_messages: List of messages from client-AI conversation.
            
        Returns:
            JSON-like analysis of client personality.
        """
        analysis_prompt = """حلل شخصية هذا العميل من خلال محادثاته وأعطني:

1. نوع الشخصية (حساس للميزانية / مستكشف / جاد / متردد / مفاوض)
2. أسلوب التواصل (رسمي / ودي / مباشر)
3. سرعة اتخاذ القرار (عاجل / متوسط / بطيء)
4. واقعية الميزانية (واقعي / متفائل / غير واقعي)
5. مستوى الجدية (عالي / متوسط / منخفض)

أجب بشكل مختصر وعملي."""
        
        # Format client messages as context
        context = "محادثات العميل:\n"
        for msg in client_messages:
            actor = "العميل" if msg.get("actor_type") == "customer" else "المساعد"
            context += f"{actor}: {msg.get('message', '')}\n"
        
        return self.generate_response(
            user_message=analysis_prompt,
            context=context
        )


# Singleton instance
_llm_service: Optional[CohereLLMService] = None


@lru_cache()
def get_llm_service() -> CohereLLMService:
    """Get the Cohere LLM service instance.
    
    Returns:
        CohereLLMService instance.
    """
    global _llm_service
    if _llm_service is None:
        _llm_service = CohereLLMService()
    return _llm_service

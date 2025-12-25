"""
LLM service factory for multiple providers (Gemini, Cohere).
Provides text generation for the chatbot responses.
"""

from typing import List, Optional, Protocol, Any
from functools import lru_cache
from abc import ABC, abstractmethod

from langchain_google_genai import ChatGoogleGenerativeAI
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

    def _get_default_system_prompt(self) -> str:
        """Get the default system prompt for the real estate chatbot."""
        return """أنت مساعد ذكي لشركة عقارات. مهمتك الرئيسية هي:
1. فهم احتياجات العميل العقارية
2. جمع المعلومات المطلوبة (المنطقة، الميزانية، نوع الوحدة، المساحة)
3. تقديم توصيات مناسبة
4. الرد بلغة عربية واضحة ومهنية

قواعد مهمة:
- لا تقدم أسعار أو تفاصيل غير مؤكدة
- إذا كانت المعلومات ناقصة، اسأل سؤالاً واحداً فقط
- حافظ على سياق المحادثة السابقة
- كن ودوداً ومحترفاً"""

    def _prepare_messages(
        self,
        user_message: str,
        context: Optional[str] = None,
        conversation_history: Optional[List[dict]] = None,
        system_prompt: Optional[str] = None
    ) -> List[Any]:
        """Helper to prepare LangChain messages."""
        messages = []
        
        # Add system prompt
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        else:
            messages.append(SystemMessage(content=self._get_default_system_prompt()))
        
        # Add context if available
        if context:
            messages.append(SystemMessage(content=f"السياق المتاح:\n{context}"))
        
        # Add conversation history
        if conversation_history:
            for msg in conversation_history:
                if msg["role"] == "user":
                    messages.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    messages.append(AIMessage(content=msg["content"]))
        
        # Add current user message
        messages.append(HumanMessage(content=user_message))
        return messages


class GeminiLLMService(ILLMService):
    """Service for generating text using Gemini API."""
    
    def __init__(self, api_key: str = None, model_name: str = "gemini-pro"):
        settings = get_settings()
        self.api_key = api_key or settings.gemini_api_key
        self.model_name = model_name
        self._llm = None
    
    @property
    def llm(self) -> ChatGoogleGenerativeAI:
        if self._llm is None:
            if not self.api_key:
                raise ValueError("GEMINI_API_KEY is not set in environment.")
            self._llm = ChatGoogleGenerativeAI(
                model=self.model_name,
                google_api_key=self.api_key,
                temperature=0.7,
                convert_system_message_to_human=True
            )
        return self._llm
    
    def validate_connectivity(self) -> bool:
        logger.info("Validating Gemini API connectivity")
        try:
            self.llm.invoke([HumanMessage(content="hi")])
            return True
        except Exception as e:
            logger.error(f"Gemini API validation failed: {e}")
            raise e
    
    def generate_response(self, user_message: str, context: Optional[str] = None, 
                          conversation_history: Optional[List[dict]] = None, 
                          system_prompt: Optional[str] = None) -> str:
        messages = self._prepare_messages(user_message, context, conversation_history, system_prompt)
        logger.info(f"Generating Gemini response for message (length: {len(user_message)})")
        response = self.llm.invoke(messages)
        return response.content


class CohereLLMService(ILLMService):
    """Service for generating text using Cohere API."""
    
    def __init__(self, api_key: str = None, model_name: str = "command-a-03-2025"):
        settings = get_settings()
        self.api_key = api_key or settings.cohere_api_key
        self.model_name = model_name
        self._llm = None
    
    @property
    def llm(self) -> ChatCohere:
        if self._llm is None:
            if not self.api_key:
                raise ValueError("COHERE_API_KEY is not set in environment.")
            self._llm = ChatCohere(
                model=self.model_name,
                cohere_api_key=self.api_key,
                temperature=0.7
            )
        return self._llm
    
    def validate_connectivity(self) -> bool:
        logger.info("Validating Cohere API connectivity")
        try:
            self.llm.invoke([HumanMessage(content="hi")])
            return True
        except Exception as e:
            logger.error(f"Cohere API validation failed: {e}")
            raise e
    
    def generate_response(self, user_message: str, context: Optional[str] = None, 
                          conversation_history: Optional[List[dict]] = None, 
                          system_prompt: Optional[str] = None) -> str:
        messages = self._prepare_messages(user_message, context, conversation_history, system_prompt)
        logger.info(f"Generating Cohere response for message (length: {len(user_message)})")
        response = self.llm.invoke(messages)
        return response.content


@lru_cache()
def get_llm_service() -> ILLMService:
    """Factory function to get the configured LLM service."""
    settings = get_settings()
    generator_type = settings.generator_type.lower()
    
    if generator_type == "cohere":
        logger.info("Initializing Cohere LLM Service")
        return CohereLLMService()
    else:
        logger.info("Initializing Gemini LLM Service")
        return GeminiLLMService()

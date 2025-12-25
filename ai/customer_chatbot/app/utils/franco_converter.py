"""
LLM-based Franco Arabic to English converter.
Uses Cohere's smaller/faster model for cost-effective conversion.
"""
import os
from typing import Optional

from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Cohere client singleton
_cohere_client = None


def get_cohere_client():
    """
    Get Cohere client for lightweight LLM tasks.
    Uses a smaller model for cost/speed optimization.
    """
    global _cohere_client
    if _cohere_client is None:
        try:
            import cohere
            api_key = os.getenv("COHERE_API_KEY", "")
            if not api_key:
                logger.warning("COHERE_API_KEY not set - Franco conversion will use fallback")
                return None
            _cohere_client = cohere.Client(api_key)
        except ImportError:
            logger.warning("cohere package not installed - Franco conversion will use fallback")
            return None
    return _cohere_client


def convert_franco_to_english(arabic_text: str) -> str:
    """
    Use Cohere's smaller model to convert Arabic phonetic text (Franco) to English.
    
    This is used when users write English names phonetically using Arabic letters.
    Example:
    - Input: "هاواباي" 
    - Output: "hawaby"
    
    Uses a lightweight model for cost/speed optimization.
    Falls back to basic transliteration if Cohere is unavailable.
    """
    if not arabic_text:
        return ""
    
    client = get_cohere_client()
    
    if client is None:
        # Fallback: basic transliteration
        return _basic_transliterate(arabic_text)
    
    try:
        prompt = f"""Convert this Arabic phonetic name to English letters.

Arabic name: {arabic_text}

Rules:
1. This is a real estate project or area name written phonetically in Arabic
2. Return ONLY the English spelling, nothing else
3. Use lowercase letters
4. No explanations, just the name

English name:"""

        response = client.chat(
            message=prompt,
            model="command-r7b-12-2024",
            temperature=0.1,
            preamble=""
        )
        
        # Clean response - take first word only
        if response.text:
            english_name = response.text.strip().lower().split()[0]
            logger.info(f"Franco conversion (Cohere): '{arabic_text}' → '{english_name}'")
            return english_name
        
        return _basic_transliterate(arabic_text)
        
    except Exception as e:
        logger.error(f"Franco conversion failed: {e}")
        return _basic_transliterate(arabic_text)


def _basic_transliterate(arabic_text: str) -> str:
    """
    Basic Arabic to Latin character mapping fallback.
    Used when Cohere API is unavailable.
    """
    # Basic phonetic mapping for common characters
    mapping = {
        'ا': 'a', 'أ': 'a', 'إ': 'e', 'آ': 'a',
        'ب': 'b', 'ت': 't', 'ث': 'th',
        'ج': 'g', 'ح': 'h', 'خ': 'kh',
        'د': 'd', 'ذ': 'z', 'ر': 'r', 'ز': 'z',
        'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd',
        'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh',
        'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l',
        'م': 'm', 'ن': 'n', 'ه': 'h', 'ة': 'a',
        'و': 'w', 'ي': 'y', 'ى': 'a',
        'ء': '', 'ئ': 'y', 'ؤ': 'w',
    }
    
    result = []
    for char in arabic_text:
        if char in mapping:
            result.append(mapping[char])
        elif char.isascii():
            result.append(char.lower())
        elif char.isspace():
            result.append(' ')
    
    return ''.join(result).strip()


def is_cohere_available() -> bool:
    """Check if Cohere API is configured and available."""
    return get_cohere_client() is not None

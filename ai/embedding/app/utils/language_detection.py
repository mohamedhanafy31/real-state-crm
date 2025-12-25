"""
Language Detection Utility
Detects whether text is primarily Arabic or English for dual-vector embedding search.
"""

def detect_language(text: str) -> str:
    """
    Detect if text is Arabic or English.
    
    Args:
        text: Input text to analyze
        
    Returns:
        'ar' for Arabic, 'en' for English
        
    Examples:
        >>> detect_language("التجمع الخامس")
        'ar'
        >>> detect_language("Tagamoo")
        'en'
        >>> detect_language("villa في North Coast")
        'en'  # Mixed text defaults to English if <30% Arabic
    """
    if not text or not text.strip():
        return 'en'
    
    # Count Arabic Unicode characters (U+0600 to U+06FF range)
    arabic_chars = sum(1 for c in text if '\u0600' <= c <= '\u06FF')
    total_chars = len(text.strip())
    
    # If more than 30% of characters are Arabic, treat as Arabic query
    arabic_ratio = arabic_chars / total_chars if total_chars > 0 else 0
    
    return 'ar' if arabic_ratio > 0.3 else 'en'


def is_arabic(text: str) -> bool:
    """
    Check if text is primarily Arabic.
    
    Args:
        text: Input text
        
    Returns:
        True if Arabic, False otherwise
    """
    return detect_language(text) == 'ar'

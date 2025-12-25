"""
Arabic text normalization utilities.
Uses camel-tools for comprehensive Arabic NLP support.
"""
import re
from typing import Literal

try:
    from camel_tools.utils.normalize import (
        normalize_unicode,
        normalize_alef_maksura_ar,
        normalize_alef_ar,
        normalize_teh_marbuta_ar,
    )
    from camel_tools.utils.dediac import dediac_ar
    CAMEL_TOOLS_AVAILABLE = True
except ImportError:
    CAMEL_TOOLS_AVAILABLE = False


def normalize_arabic(text: str) -> str:
    """
    Full Arabic text normalization pipeline.
    Apply BEFORE fuzzy matching, DB queries, and embeddings.
    
    Steps:
    1. Unicode normalization (NFKC)
    2. Remove diacritics/tashkeel
    3. Normalize Alef variants (أ إ آ ا → ا)
    4. Normalize Alef Maksura (ى → ي)
    5. Normalize Teh Marbuta (ة → ه)
    6. Remove elongation/kashida (ـ)
    7. Strip extra whitespace
    """
    if not text:
        return ""
    
    if CAMEL_TOOLS_AVAILABLE:
        # Step 1: Unicode normalization
        text = normalize_unicode(text)
        
        # Step 2: Remove diacritics
        text = dediac_ar(text)
        
        # Step 3-5: Letter normalization
        text = normalize_alef_ar(text)
        text = normalize_alef_maksura_ar(text)
        text = normalize_teh_marbuta_ar(text)
    else:
        # Fallback normalization without camel-tools
        import unicodedata
        text = unicodedata.normalize('NFKC', text)
        
        # Remove common diacritics (basic fallback)
        diacritics = 'ًٌٍَُِّْٰۖۗۘۙۚۛۜ'
        for d in diacritics:
            text = text.replace(d, '')
        
        # Normalize alef variants
        alef_variants = 'أإآٱ'
        for v in alef_variants:
            text = text.replace(v, 'ا')
        
        # Normalize alef maksura
        text = text.replace('ى', 'ي')
        
        # Normalize teh marbuta
        text = text.replace('ة', 'ه')
    
    # Step 6: Remove elongation (kashida/tatweel)
    text = text.replace('ـ', '')
    
    # Step 7: Clean whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text


def detect_language(text: str) -> Literal["arabic", "english", "mixed"]:
    """
    Detect if text is Arabic, English, or mixed.
    
    Returns: "arabic" | "english" | "mixed"
    """
    if not text:
        return "english"
    
    arabic_chars = sum(1 for c in text if '\u0600' <= c <= '\u06FF')
    english_chars = sum(1 for c in text if c.isascii() and c.isalpha())
    
    if arabic_chars > 0 and english_chars == 0:
        return "arabic"
    elif english_chars > 0 and arabic_chars == 0:
        return "english"
    return "mixed"


def is_arabic_phonetic(text: str) -> bool:
    """
    Check if text appears to be Arabic phonetic writing of an English name.
    (e.g., "هاواباي" for "Hawaby")
    
    Heuristics:
    - Pure Arabic script
    - Short word (likely a name)
    - Not a common Arabic word
    """
    if detect_language(text) != "arabic":
        return False
    
    # Short Arabic word, likely a transliterated name
    normalized = normalize_arabic(text)
    words = normalized.split()
    
    # Single word, 10 chars or less = likely a transliterated name
    if len(words) == 1 and len(normalized) <= 10:
        return True
    
    return False


def clean_for_matching(text: str) -> str:
    """
    Clean and normalize text for fuzzy matching.
    Applies Arabic normalization and lowercasing.
    """
    text = normalize_arabic(text)
    return text.lower().strip()

"""
Dynamic name matching service for bilingual (Arabic/English) entity matching.
Matches user input against real database values - no hardcoded word lists.
"""
from dataclasses import dataclass, field
from typing import List, Optional, Literal

from rapidfuzz import fuzz

from app.config import get_settings
from app.core.logging_config import get_logger
from app.utils.arabic_utils import normalize_arabic, detect_language, is_arabic_phonetic, clean_for_matching
from app.utils.franco_converter import convert_franco_to_english
from app.services.backend_api import get_backend_api_service

logger = get_logger(__name__)


@dataclass
class MatchResult:
    """Result of name matching operation."""
    matched: bool
    value: Optional[str] = None          # Corrected/normalized value
    id: Optional[int] = None             # DB ID if matched
    confidence: float = 0.0
    language_detected: str = "unknown"   # "arabic" | "english" | "mixed"
    alternatives: List[str] = field(default_factory=list)  # Suggestions if not matched
    area_filtered: bool = False          # True if alternatives filtered by area


class NameMatcherService:
    """
    Dynamic name matching service.
    
    ALL matching is against real DB values - no hardcoded word lists.
    
    Matching Flow:
    1. Normalize Arabic input
    2. If Arabic phonetic → LLM converts to English
    3. Try exact match against DB
    4. Try fuzzy match against DB
    5. Return suggestions from DB
    """
    
    def __init__(self):
        settings = get_settings()
        # Configurable thresholds (can be tuned based on market testing)
        self.EXACT_THRESHOLD = settings.fuzzy_exact_threshold
        self.SUGGEST_THRESHOLD = settings.fuzzy_suggest_threshold
        
        self.backend = get_backend_api_service()
        
        # Cache for DB values (refreshed on each session start)
        self._areas_cache: Optional[List[dict]] = None
        self._projects_cache: Optional[List[dict]] = None
        self._unit_types_cache: Optional[List[str]] = None
    
    def refresh_cache(self):
        """Force refresh of cached DB values."""
        self._areas_cache = None
        self._projects_cache = None
        self._unit_types_cache = None
    
    def match_area(self, user_input: str) -> MatchResult:
        """Match user input to area names from DB."""
        # Fetch areas if not cached
        if self._areas_cache is None:
            self._areas_cache = self.backend.get_all_areas()
        
        return self._match_entity(
            user_input=user_input,
            entities=self._areas_cache,
            name_key='name',
            id_key='areaId'
        )
    
    def match_project(self, user_input: str, area_id: int = None) -> MatchResult:
        """
        Match user input to project names from DB.
        
        If area_id is provided, alternatives are filtered to that area.
        """
        # Fetch projects if not cached
        if self._projects_cache is None:
            self._projects_cache = self.backend.get_projects()
        
        result = self._match_entity(
            user_input=user_input,
            entities=self._projects_cache,
            name_key='name',
            id_key='projectId'
        )
        
        # Filter alternatives by area if specified
        if area_id and result.alternatives:
            area_projects = self.get_projects_for_area(area_id)
            area_project_names = {p['name'] for p in area_projects}
            filtered = [alt for alt in result.alternatives if alt in area_project_names]
            if filtered:
                result.alternatives = filtered
                result.area_filtered = True
        
        return result
    
    def match_unit_type(self, user_input: str) -> MatchResult:
        """
        Match user input to unit types from DB.
        
        Gets distinct unit types from units table - NO hardcoded list.
        """
        # Fetch unit types if not cached
        if self._unit_types_cache is None:
            self._unit_types_cache = self.backend.get_unit_types()
        
        # Convert list of strings to entity format
        entities = [{'unitType': ut} for ut in self._unit_types_cache]
        
        return self._match_entity(
            user_input=user_input,
            entities=entities,
            name_key='unitType',
            id_key=None
        )
    
    def get_projects_for_area(self, area_id: int) -> List[dict]:
        """Get all projects filtered by area - for listing to customer."""
        if self._projects_cache is None:
            self._projects_cache = self.backend.get_projects()
        
        return [p for p in self._projects_cache if p.get('area', {}).get('areaId') == area_id]
    
    def _match_entity(
        self,
        user_input: str,
        entities: List[dict],
        name_key: str,
        id_key: Optional[str]
    ) -> MatchResult:
        """Generic entity matching with dynamic DB lookup."""
        if not user_input or not entities:
            return MatchResult(
                matched=False,
                alternatives=[e.get(name_key) for e in entities[:10] if e.get(name_key)]
            )
        
        detected_lang = detect_language(user_input)
        
        # Normalize input
        input_normalized = clean_for_matching(user_input)
        
        # If Arabic phonetic, use LLM to convert to English
        input_english = None
        if is_arabic_phonetic(user_input):
            input_english = convert_franco_to_english(user_input)
            logger.info(f"Franco conversion: '{user_input}' → '{input_english}'")
        
        # Step 1: Exact match
        for entity in entities:
            name = entity.get(name_key, "")
            if not name:
                continue
                
            name_lower = name.lower()
            name_normalized = clean_for_matching(name)
            
            # Direct match
            if name_lower == user_input.lower() or name_normalized == input_normalized:
                return MatchResult(
                    matched=True,
                    value=name,
                    id=entity.get(id_key) if id_key else None,
                    confidence=1.0,
                    language_detected=detected_lang
                )
            
            # Match against LLM-converted English
            if input_english and name_lower == input_english.lower():
                return MatchResult(
                    matched=True,
                    value=name,
                    id=entity.get(id_key) if id_key else None,
                    confidence=0.95,
                    language_detected=detected_lang
                )
        
        # Step 2: Fuzzy match
        scored_matches = []
        for entity in entities:
            name = entity.get(name_key, "")
            if not name:
                continue
                
            name_lower = name.lower()
            name_normalized = clean_for_matching(name)
            
            # Score against original and normalized
            score1 = fuzz.ratio(input_normalized, name_normalized) / 100
            score2 = fuzz.partial_ratio(input_normalized, name_normalized) / 100
            
            # Also score against LLM-converted English
            if input_english:
                score3 = fuzz.ratio(input_english.lower(), name_lower) / 100
                score = max(score1, score2, score3)
            else:
                score = max(score1, score2)
            
            scored_matches.append((entity, name, score))
        
        scored_matches.sort(key=lambda x: x[2], reverse=True)
        
        if scored_matches:
            top_entity, top_name, top_score = scored_matches[0]
            
            if top_score >= self.EXACT_THRESHOLD:
                return MatchResult(
                    matched=True,
                    value=top_name,
                    id=top_entity.get(id_key) if id_key else None,
                    confidence=top_score,
                    language_detected=detected_lang
                )
            elif top_score >= self.SUGGEST_THRESHOLD:
                return MatchResult(
                    matched=False,
                    value=top_name,
                    confidence=top_score,
                    language_detected=detected_lang,
                    alternatives=[m[1] for m in scored_matches[:5]]
                )
        
        # No match - return all options
        return MatchResult(
            matched=False,
            language_detected=detected_lang,
            alternatives=[e.get(name_key) for e in entities[:10] if e.get(name_key)]
        )


# Singleton instance
_name_matcher_instance: Optional[NameMatcherService] = None


def get_name_matcher_service() -> NameMatcherService:
    """Get or create name matcher service instance."""
    global _name_matcher_instance
    if _name_matcher_instance is None:
        _name_matcher_instance = NameMatcherService()
    return _name_matcher_instance

"""
Semantic Matcher Service using Embeddings.
Provides entity matching (areas, projects, unit types) using cosine similarity.
"""

from typing import Dict, List, Optional
from functools import lru_cache

from app.core.embeddings import get_embedding_service
from app.services.backend_api import get_backend_api_service
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class SemanticMatcher:
    """Match user queries to DB entities using semantic embeddings."""
    
    def __init__(self):
        self.embedding_service = get_embedding_service()
        self.backend_api = get_backend_api_service()
        self._area_cache = None
        self._project_cache = None
        self._unit_type_cache = None
    
    def _get_areas(self) -> List[Dict]:
        """Get cached areas from backend."""
        if self._area_cache is None:
            self._area_cache = self.backend_api.get_areas()
        return self._area_cache
    
    def _get_projects(self) -> List[Dict]:
        """Get cached projects from backend."""
        if self._project_cache is None:
            self._project_cache = self.backend_api.get_projects()
        return self._project_cache
    
    def _get_unit_types(self) -> List[str]:
        """Get unit types (hardcoded for now)."""
        if self._unit_type_cache is None:
            self._unit_type_cache = [
                "Apartment شقة",
                "Villa فيلا",
                "Duplex دوبلكس",
                "Studio استوديو",
                "Penthouse بنتهاوس",
                "Townhouse تاون هاوس"
            ]
        return self._unit_type_cache
    
    def match_area(self, query: str, threshold: float = 0.5) -> Dict:
        """Find most relevant area using embedding similarity.
        
        Args:
            query: User query text
            threshold: Minimum similarity score (0-1)
            
        Returns:
            Dict with matched=True/False, value, id, score
        """
        try:
            areas = self._get_areas()
            if not areas:
                return {"matched": False}
            
            # Build bilingual area texts
            area_texts = [f"{a['name']} {a.get('name_ar', a['name'])}" for a in areas]
            
            # Compute similarity
            scores = self.embedding_service.compute_similarity(query, area_texts)
            best_idx = scores.index(max(scores))
            best_score = scores[best_idx]
            
            logger.info(f"Area matching: '{query}' → '{areas[best_idx]['name']}' (score: {best_score:.3f})")
            
            if best_score >= threshold:
                return {
                    "matched": True,
                    "value": areas[best_idx]['name'],
                    "id": areas[best_idx].get('area_id') or areas[best_idx].get('areaId'),  # Handle both formats
                    "score": best_score,
                    "alternatives": []
                }
            
            return {"matched": False, "score": best_score}
            
        except Exception as e:
            logger.error(f"Error in area matching: {e}")
            return {"matched": False}
    
    def match_project(self, query: str, area_id: Optional[int] = None, threshold: float = 0.5) -> Dict:
        """Find most relevant project using embedding similarity.
        
        Args:
            query: User query text
            area_id: Optional area filter
            threshold: Minimum similarity score
            
        Returns:
            Dict with matched=True/False, value, id, score
        """
        try:
            projects = self._get_projects()
            
            # Filter by area if provided
            if area_id:
                projects = [p for p in projects if p.get('area', {}).get('area_id') == area_id]
            
            if not projects:
                return {"matched": False}
            
            # Build project texts
            project_texts = [f"{p['name']}" for p in projects]
            
            # Compute similarity
            scores = self.embedding_service.compute_similarity(query, project_texts)
            best_idx = scores.index(max(scores))
            best_score = scores[best_idx]
            
            logger.info(f"Project matching: '{query}' → '{projects[best_idx]['name']}' (score: {best_score:.3f})")
            
            if best_score >= threshold:
                return {
                    "matched": True,
                    "value": projects[best_idx]['name'],
                    "id": projects[best_idx].get('project_id') or projects[best_idx].get('projectId'),  # Handle both formats
                    "score": best_score,
                    "alternatives": []
                }
            
            return {"matched": False, "score": best_score}
            
        except Exception as e:
            logger.error(f"Error in project matching: {e}")
            return {"matched": False}
    
    def match_unit_type(self, query: str, threshold: float = 0.4) -> Dict:
        """Find most relevant unit type using embedding similarity.
        
        Args:
            query: User query text
            threshold: Minimum similarity score
            
        Returns:
            Dict with matched=True/False, value (English), score
        """
        try:
            unit_types = self._get_unit_types()
            
            # Compute similarity
            scores = self.embedding_service.compute_similarity(query, unit_types)
            best_idx = scores.index(max(scores))
            best_score = scores[best_idx]
            
            # Extract English name (first word)
            english_name = unit_types[best_idx].split()[0]
            
            logger.info(f"Unit type matching: '{query}' → '{english_name}' (score: {best_score:.3f})")
            
            if best_score >= threshold:
                return {
                    "matched": True,
                    "value": english_name,
                    "score": best_score
                }
            
            return {"matched": False, "score": best_score}
            
        except Exception as e:
            logger.error(f"Error in unit type matching: {e}")
            return {"matched": False}


@lru_cache()
def get_semantic_matcher() -> SemanticMatcher:
    """Get cached semantic matcher instance."""
    return SemanticMatcher()

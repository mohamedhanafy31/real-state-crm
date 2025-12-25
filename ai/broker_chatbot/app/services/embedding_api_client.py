"""
Embedding API Client for Broker Chatbot.
Uses the embedding microservice for embedding operations.
"""

from typing import List, Dict, Optional
import httpx

from app.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class EmbeddingAPIClient:
    """Client for embedding microservice."""
    
    def __init__(self):
        """Initialize the embedding API client."""
        self.settings = get_settings()
        self.base_url = self.settings.embedding_service_url
        self._client = httpx.Client(timeout=10.0)
        logger.info(f"Embedding API client initialized with URL: {self.base_url}")
    
    def _check_service_available(self) -> bool:
        """Check if embedding service is available.
        
        Returns:
            True if service is ready.
        """
        try:
            response = self._client.get(f"{self.base_url}/ready")
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Embedding service unavailable: {e}")
            return False
    
    def embed_text(self, text: str) -> Optional[List[float]]:
        """Embed text using remote service.
        
        Args:
            text: Input text to embed.
            
        Returns:
            Embedding vector or None on error.
        """
        try:
            response = self._client.post(
                f"{self.base_url}/embed/text",
                json={"text": text}
            )
            if response.status_code == 200:
                return response.json()["embedding"]
            else:
                logger.warning(f"Embedding API error: {response.status_code}")
                return None
        except Exception as e:
            logger.warning(f"Embedding API call failed: {e}")
            return None
    
    def embed_texts(self, texts: List[str]) -> Optional[List[List[float]]]:
        """Batch embed texts using remote service.
        
        Args:
            texts: List of texts to embed.
            
        Returns:
            List of embedding vectors or None on error.
        """
        try:
            response = self._client.post(
                f"{self.base_url}/embed/batch",
                json={"texts": texts}
            )
            if response.status_code == 200:
                return response.json()["embeddings"]
            else:
                logger.warning(f"Batch embedding API error: {response.status_code}")
                return None
        except Exception as e:
            logger.warning(f"Batch embedding API call failed: {e}")
            return None
    
    def search_area(
        self,
        query: str,
        threshold: float = 0.45,
        top_k: int = 5
    ) -> Dict:
        """Search for area using embedding service.
        
        Args:
            query: Search query.
            threshold: Similarity threshold.
            top_k: Number of results.
            
        Returns:
            Search results with matched area and alternatives.
        """
        try:
            response = self._client.get(
                f"{self.base_url}/search/area",
                params={"q": query, "threshold": threshold, "top_k": top_k}
            )
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.warning(f"Area search API call failed: {e}")
        return {"matched": False, "alternatives": []}
    
    def search_project(
        self,
        query: str,
        area_id: Optional[int] = None,
        threshold: float = 0.45,
        top_k: int = 5
    ) -> Dict:
        """Search for project using embedding service.
        
        Args:
            query: Search query.
            area_id: Optional area filter.
            threshold: Similarity threshold.
            top_k: Number of results.
            
        Returns:
            Search results with matched project and alternatives.
        """
        try:
            params = {"q": query, "threshold": threshold, "top_k": top_k}
            if area_id:
                params["area_id"] = area_id
            response = self._client.get(
                f"{self.base_url}/search/project",
                params=params
            )
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.warning(f"Project search API call failed: {e}")
        return {"matched": False, "alternatives": []}
    
    def search_unit_type(
        self,
        query: str,
        threshold: float = 0.4,
        top_k: int = 3
    ) -> Dict:
        """Search for unit type using embedding service.
        
        Args:
            query: Search query.
            threshold: Similarity threshold.
            top_k: Number of results.
            
        Returns:
            Search results.
        """
        try:
            response = self._client.get(
                f"{self.base_url}/search/unit-type",
                params={"q": query, "threshold": threshold, "top_k": top_k}
            )
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.warning(f"Unit type search API call failed: {e}")
        return {"matched": False}
    
    def close(self):
        """Close HTTP client."""
        self._client.close()


# Singleton instance
_embedding_client: Optional[EmbeddingAPIClient] = None


def get_embedding_api_client() -> EmbeddingAPIClient:
    """Get cached embedding API client instance.
    
    Returns:
        EmbeddingAPIClient instance.
    """
    global _embedding_client
    if _embedding_client is None:
        _embedding_client = EmbeddingAPIClient()
    return _embedding_client

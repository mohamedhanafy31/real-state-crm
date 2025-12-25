"""
Embedding API Client for Customer Chatbot.
Uses the embedding microservice for embedding operations with fallback to local model.
"""

from typing import List, Dict, Optional
import httpx
import logging

from app.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class EmbeddingAPIClient:
    """Client for embedding microservice with local fallback."""
    
    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.embedding_service_url
        self._local_model = None  # Lazy-loaded fallback
        self._use_remote = True
        self._client = httpx.Client(timeout=10.0)
    
    def _check_service_available(self) -> bool:
        """Check if embedding service is available."""
        try:
            response = self._client.get(f"{self.base_url}/ready")
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Embedding service unavailable: {e}")
            return False
    
    def _get_local_model(self):
        """Get local embedding model as fallback."""
        if self._local_model is None:
            logger.info("Loading local embedding model as fallback...")
            from sentence_transformers import SentenceTransformer
            self._local_model = SentenceTransformer(self.settings.embedding_model_name)
            logger.info("Local embedding model loaded")
        return self._local_model
    
    def embed_text(self, text: str) -> List[float]:
        """Embed text using remote service or local fallback.
        
        Args:
            text: Input text to embed.
            
        Returns:
            Embedding vector.
        """
        if self._use_remote:
            try:
                response = self._client.post(
                    f"{self.base_url}/embed/text",
                    json={"text": text}
                )
                if response.status_code == 200:
                    return response.json()["embedding"]
                else:
                    logger.warning(f"Embedding API error: {response.status_code}")
            except Exception as e:
                logger.warning(f"Embedding API call failed: {e}")
                self._use_remote = False
                logger.info("Falling back to local model")
        
        # Local fallback
        model = self._get_local_model()
        embedding = model.encode([text], normalize_embeddings=True)[0]
        return embedding.tolist()
    
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Batch embed texts using remote service or local fallback."""
        if self._use_remote:
            try:
                response = self._client.post(
                    f"{self.base_url}/embed/batch",
                    json={"texts": texts}
                )
                if response.status_code == 200:
                    return response.json()["embeddings"]
            except Exception as e:
                logger.warning(f"Batch embedding API call failed: {e}")
                self._use_remote = False
        
        # Local fallback
        model = self._get_local_model()
        embeddings = model.encode(texts, normalize_embeddings=True)
        return embeddings.tolist()
    
    def search_area(self, query: str, threshold: float = 0.45, top_k: int = 5) -> Dict:
        """Search for area using embedding service."""
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
    
    def search_project(self, query: str, area_id: Optional[int] = None, 
                       threshold: float = 0.45, top_k: int = 5) -> Dict:
        """Search for project using embedding service."""
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
    
    def search_unit_type(self, query: str, threshold: float = 0.4, top_k: int = 3) -> Dict:
        """Search for unit type using embedding service."""
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
    """Get cached embedding API client instance."""
    global _embedding_client
    if _embedding_client is None:
        _embedding_client = EmbeddingAPIClient()
    return _embedding_client

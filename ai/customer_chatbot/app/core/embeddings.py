"""
Embedding service using Muffakir_Embedding_V2 model.
Provides text-to-vector conversion for semantic search and RAG.
"""

from typing import List
from functools import lru_cache
from sentence_transformers import SentenceTransformer
import torch

from app.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class EmbeddingService:
    """Service for generating text embeddings using Muffakir model."""
    
    def __init__(self, model_name: str = None):
        """Initialize the embedding model.
        
        Args:
            model_name: HuggingFace model name. Defaults to config value.
        """
        settings = get_settings()
        self.model_name = model_name or settings.embedding_model_name
        self._model = None
    
    @property
    def model(self) -> SentenceTransformer:
        """Lazy-load the embedding model."""
        if self._model is None:
            logger.info(f"Loading embedding model: {self.model_name}")
            self._model = SentenceTransformer(self.model_name)
            logger.info("Embedding model loaded successfully")
        return self._model
    
    def initialize(self):
        """Pre-load the model to memory."""
        logger.info("Initializing embedding service")
        _ = self.model
        logger.info("Embedding service initialized")
    
    def embed_text(self, text: str) -> List[float]:
        """Convert a single text to embedding vector.
        
        Args:
            text: Input text to embed.
            
        Returns:
            List of floats representing the embedding vector.
        """
        logger.debug(f"Embedding text (length: {len(text)} chars)")
        embedding = self.model.encode(
            [text],
            convert_to_tensor=True,
            normalize_embeddings=True
        )
        logger.debug(f"Generated embedding vector (dim: {len(embedding[0])})")
        return embedding[0].tolist()
    
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Convert multiple texts to embedding vectors.
        
        Args:
            texts: List of input texts to embed.
            
        Returns:
            List of embedding vectors.
        """
        embeddings = self.model.encode(
            texts,
            convert_to_tensor=True,
            normalize_embeddings=True
        )
        return embeddings.tolist()
    
    def compute_similarity(self, query: str, passages: List[str]) -> List[float]:
        """Compute cosine similarity between query and passages.
        
        Args:
            query: Query text.
            passages: List of passage texts to compare.
            
        Returns:
            List of similarity scores.
        """
        query_embedding = self.model.encode(
            [query],
            convert_to_tensor=True,
            normalize_embeddings=True
        )
        passage_embeddings = self.model.encode(
            passages,
            convert_to_tensor=True,
            normalize_embeddings=True
        )
        
        cosine_scores = torch.matmul(query_embedding, passage_embeddings.T)
        return cosine_scores[0].tolist()


@lru_cache()
def get_embedding_service() -> EmbeddingService:
    """Get cached embedding service instance."""
    return EmbeddingService()

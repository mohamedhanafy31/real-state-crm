"""
Embed API Routes.
Endpoints for text embedding operations.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging

from app.core.embeddings import get_embedding_service

logger = logging.getLogger(__name__)
router = APIRouter()


class EmbedTextRequest(BaseModel):
    """Request for single text embedding."""
    text: str


class EmbedTextResponse(BaseModel):
    """Response with embedding vector."""
    embedding: List[float]
    dimension: int


class EmbedBatchRequest(BaseModel):
    """Request for batch text embedding."""
    texts: List[str]


class EmbedBatchResponse(BaseModel):
    """Response with multiple embedding vectors."""
    embeddings: List[List[float]]
    count: int
    dimension: int


@router.post("/text", response_model=EmbedTextResponse)
async def embed_text(request: EmbedTextRequest):
    """
    Convert single text to embedding vector.
    
    Args:
        request: Text to embed
        
    Returns:
        Embedding vector with dimension
    """
    try:
        embedding_service = get_embedding_service()
        
        if not embedding_service.is_ready:
            raise HTTPException(status_code=503, detail="Model not ready")
        
        embedding = embedding_service.embed_text(request.text)
        
        return EmbedTextResponse(
            embedding=embedding,
            dimension=len(embedding)
        )
    except Exception as e:
        logger.error(f"Error embedding text: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch", response_model=EmbedBatchResponse)
async def embed_batch(request: EmbedBatchRequest):
    """
    Convert multiple texts to embedding vectors.
    
    Args:
        request: List of texts to embed
        
    Returns:
        List of embedding vectors
    """
    try:
        embedding_service = get_embedding_service()
        
        if not embedding_service.is_ready:
            raise HTTPException(status_code=503, detail="Model not ready")
        
        if len(request.texts) > 100:
            raise HTTPException(status_code=400, detail="Maximum 100 texts per batch")
        
        embeddings = embedding_service.embed_texts(request.texts)
        
        return EmbedBatchResponse(
            embeddings=embeddings,
            count=len(embeddings),
            dimension=len(embeddings[0]) if embeddings else 0
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error batch embedding: {e}")
        raise HTTPException(status_code=500, detail=str(e))

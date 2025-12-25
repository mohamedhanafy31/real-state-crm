"""
Search API Routes.
Endpoints for semantic similarity search using pgvector.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
import logging

from app.core.embeddings import get_embedding_service
from app.core.database import get_database
from app.utils.language_detection import detect_language

logger = logging.getLogger(__name__)
router = APIRouter()


class SearchMatch(BaseModel):
    """A single search match."""
    value: str
    id: Optional[int] = None
    score: float


class SearchResponse(BaseModel):
    """Search response with top K matches."""
    matched: bool
    value: Optional[str] = None
    id: Optional[int] = None
    score: Optional[float] = None
    alternatives: List[SearchMatch]


@router.get("/area", response_model=SearchResponse)
async def search_area(
    q: str = Query(..., description="Query text to search"),
    top_k: int = Query(5, ge=1, le=20, description="Number of top matches"),
    threshold: float = Query(0.45, ge=0.0, le=1.0, description="Minimum similarity score")
):
    """
    Search for similar areas using semantic similarity.
    
    Args:
        q: Query text (can be Arabic or English)
        top_k: Number of top matches to return
        threshold: Minimum similarity score for a match
        
    Returns:
        Top matches with similarity scores
    """
    try:
        embedding_service = get_embedding_service()
        db = get_database()
        
        # Detect query language and generate embedding
        query_lang = detect_language(q)
        query_embedding = embedding_service.embed_text(q)
        
        # Search using language-specific vector
        results = db.search_areas_by_language(query_embedding, query_lang, top_k=top_k)
        
        if not results:
            return SearchResponse(matched=False, alternatives=[])
        
        # Format alternatives
        alternatives = [
            SearchMatch(
                value=r['name'],
                id=r['area_id'],
                score=float(r['similarity'])
            )
            for r in results
        ]
        
        # Check if best match meets threshold
        best = alternatives[0]
        
        if best.score >= threshold:
            return SearchResponse(
                matched=True,
                value=best.value,
                id=best.id,
                score=best.score,
                alternatives=alternatives[1:] if len(alternatives) > 1 else []
            )
        
        return SearchResponse(
            matched=False,
            score=best.score,
            alternatives=alternatives
        )
        
    except Exception as e:
        logger.error(f"Error searching areas: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/project", response_model=SearchResponse)
async def search_project(
    q: str = Query(..., description="Query text to search"),
    area_id: Optional[int] = Query(None, description="Filter by area ID"),
    top_k: int = Query(5, ge=1, le=20, description="Number of top matches"),
    threshold: float = Query(0.45, ge=0.0, le=1.0, description="Minimum similarity score")
):
    """
    Search for similar projects using semantic similarity.
    
    Args:
        q: Query text
        area_id: Optional area filter
        top_k: Number of top matches
        threshold: Minimum similarity score
        
    Returns:
        Top matches with similarity scores
    """
    try:
        embedding_service = get_embedding_service()
        db = get_database()
        
        # Detect query language and generate embedding
        query_lang = detect_language(q)
        query_embedding = embedding_service.embed_text(q)
        
        # Search using language-specific vector
        results = db.search_projects_by_language(query_embedding, query_lang, area_id=area_id, top_k=top_k)
        
        if not results:
            return SearchResponse(matched=False, alternatives=[])
        
        # Format alternatives
        alternatives = [
            SearchMatch(
                value=r['name'],
                id=r['project_id'],
                score=float(r['similarity'])
            )
            for r in results
        ]
        
        best = alternatives[0]
        
        if best.score >= threshold:
            return SearchResponse(
                matched=True,
                value=best.value,
                id=best.id,
                score=best.score,
                alternatives=alternatives[1:] if len(alternatives) > 1 else []
            )
        
        return SearchResponse(
            matched=False,
            score=best.score,
            alternatives=alternatives
        )
        
    except Exception as e:
        logger.error(f"Error searching projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/unit-type", response_model=SearchResponse)
async def search_unit_type(
    q: str = Query(..., description="Query text to search"),
    top_k: int = Query(3, ge=1, le=10, description="Number of top matches"),
    threshold: float = Query(0.4, ge=0.0, le=1.0, description="Minimum similarity score")
):
    """
    Search for similar unit types using semantic similarity.
    
    Args:
        q: Query text (e.g., "شقة", "villa", "duplex")
        top_k: Number of top matches
        threshold: Minimum similarity score
        
    Returns:
        Top matches with similarity scores
    """
    try:
        embedding_service = get_embedding_service()
        db = get_database()
        
        # Detect query language and generate embedding
        query_lang = detect_language(q)
        query_embedding = embedding_service.embed_text(q)
        
        # Search using language-specific vector
        results = db.search_unit_types_by_language(query_embedding, query_lang, top_k=top_k)
        
        if not results:
            return SearchResponse(matched=False, alternatives=[])
        
        # Format alternatives
        alternatives = [
            SearchMatch(
                value=r['name'],
                score=float(r['similarity'])
            )
            for r in results
        ]
        
        best = alternatives[0]
        
        if best.score >= threshold:
            return SearchResponse(
                matched=True,
                value=best.value,
                score=best.score,
                alternatives=alternatives[1:] if len(alternatives) > 1 else []
            )
        
        return SearchResponse(
            matched=False,
            score=best.score,
            alternatives=alternatives
        )
        
    except Exception as e:
        logger.error(f"Error searching unit types: {e}")
        raise HTTPException(status_code=500, detail=str(e))

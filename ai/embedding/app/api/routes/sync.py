"""
Sync API Routes.
Endpoints for syncing embeddings on CRUD operations.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

from app.core.embeddings import get_embedding_service
from app.core.database import get_database

logger = logging.getLogger(__name__)
router = APIRouter()


class SyncAreaRequest(BaseModel):
    """Request to sync area embedding."""
    area_id: str
    name: str
    name_ar: Optional[str] = None


class SyncProjectRequest(BaseModel):
    """Request to sync project embedding."""
    project_id: str
    name: str
    name_ar: Optional[str] = None
    area_id: Optional[str] = None

class SyncUnitTypeRequest(BaseModel):
    """Request to sync unit type embedding."""
    name: str
    name_ar: Optional[str] = None


class SyncResponse(BaseModel):
    """Response for sync operations."""
    success: bool
    message: str


class DeleteResponse(BaseModel):
    """Response for delete operations."""
    success: bool
    message: str


@router.post("/area", response_model=SyncResponse)
async def sync_area(request: SyncAreaRequest):
    """
    Sync area embedding (create or update).
    Called by backend on area CRUD operations.
    
    Args:
        request: Area data with ID and name
        
    Returns:
        Success status
    """
    try:
        embedding_service = get_embedding_service()
        db = get_database()
        
        # Generate separate embeddings for English and Arabic
        embedding_en = embedding_service.embed_text(request.name)
        embedding_ar = embedding_service.embed_text(request.name_ar) if request.name_ar else embedding_en
        
        # Upsert to database with dual vectors
        success = db.upsert_area_embedding(
            area_id=request.area_id,
            name=request.name,
            embedding_en=embedding_en,
            embedding_ar=embedding_ar,
            name_ar=request.name_ar
        )
        
        if success:
            logger.info(f"Synced area embedding: {request.name} (ID: {request.area_id})")
            return SyncResponse(success=True, message=f"Area '{request.name}' synced")
        else:
            raise HTTPException(status_code=500, detail="Failed to sync area embedding")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing area: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/project", response_model=SyncResponse)
async def sync_project(request: SyncProjectRequest):
    """
    Sync project embedding (create or update).
    Called by backend on project CRUD operations.
    
    Args:
        request: Project data with ID and name
        
    Returns:
        Success status
    """
    try:
        embedding_service = get_embedding_service()
        db = get_database()
        
        # Generate separate embeddings for English and Arabic
        embedding_en = embedding_service.embed_text(request.name)
        embedding_ar = embedding_service.embed_text(request.name_ar) if request.name_ar else embedding_en
        
        # Upsert to database with dual vectors
        success = db.upsert_project_embedding(
            project_id=request.project_id,
            name=request.name,
            embedding_en=embedding_en,
            embedding_ar=embedding_ar,
            area_id=request.area_id,
            name_ar=request.name_ar
        )
        
        if success:
            logger.info(f"Synced project embedding: {request.name} (ID: {request.project_id})")
            return SyncResponse(success=True, message=f"Project '{request.name}' synced")
        else:
            raise HTTPException(status_code=500, detail="Failed to sync project embedding")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/unit-type", response_model=SyncResponse)
async def sync_unit_type(request: SyncUnitTypeRequest):
    """
    Sync unit type embedding.
    
    Args:
        request: Unit type data
        
    Returns:
        Success status
    """
    try:
        embedding_service = get_embedding_service()
        db = get_database()
        
        # Generate separate embeddings for English and Arabic
        embedding_en = embedding_service.embed_text(request.name)
        embedding_ar = embedding_service.embed_text(request.name_ar) if request.name_ar else embedding_en
        
        # Upsert to database with dual vectors
        success = db.upsert_unit_type_embedding(
            name=request.name,
            embedding_en=embedding_en,
            embedding_ar=embedding_ar,
            name_ar=request.name_ar
        )
        
        if success:
            return SyncResponse(success=True, message=f"Unit type '{request.name}' synced")
        else:
            raise HTTPException(status_code=500, detail="Failed to sync unit type embedding")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing unit type: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/area/{area_id}", response_model=DeleteResponse)
async def delete_area(area_id: str):
    """
    Delete area embedding.
    Called by backend on area delete.
    
    Args:
        area_id: ID of area to delete
        
    Returns:
        Success status
    """
    try:
        db = get_database()
        success = db.delete_area_embedding(area_id)
        
        if success:
            logger.info(f"Deleted area embedding: ID {area_id}")
            return DeleteResponse(success=True, message=f"Area {area_id} deleted")
        else:
            raise HTTPException(status_code=500, detail="Failed to delete area embedding")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting area: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/project/{project_id}", response_model=DeleteResponse)
async def delete_project(project_id: str):
    """
    Delete project embedding.
    Called by backend on project delete.
    
    Args:
        project_id: ID of project to delete
        
    Returns:
        Success status
    """
    try:
        db = get_database()
        success = db.delete_project_embedding(project_id)
        
        if success:
            logger.info(f"Deleted project embedding: ID {project_id}")
            return DeleteResponse(success=True, message=f"Project {project_id} deleted")
        else:
            raise HTTPException(status_code=500, detail="Failed to delete project embedding")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

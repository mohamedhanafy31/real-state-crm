"""
Fast Semantic Matcher using pgvector for similarity search.
10-100x faster than in-memory matching.
Now uses embedding microservice API with local fallback.
"""

from typing import Dict, List, Optional
from functools import lru_cache
import psycopg2
from psycopg2.extras import RealDictCursor

from app.services.embedding_api_client import get_embedding_api_client
from app.services.backend_api import get_backend_api_service
from app.core.logging_config import get_logger
from app.config import get_settings

logger = get_logger(__name__)


class FastSemanticMatcher:
    """Match user queries to DB entities using pgvector similarity search."""
    
    def __init__(self):
        self.embedding_client = get_embedding_api_client()
        self.backend_api = get_backend_api_service()
        self.settings = get_settings()
        self._conn = None
    
    @property
    def conn(self):
        """Lazy database connection."""
        if self._conn is None or self._conn.closed:
            self._conn = psycopg2.connect(self.settings.database_url)
        return self._conn
    
    def _ensure_embeddings_populated(self):
        """Populate embeddings tables if empty."""
        try:
            with self.conn.cursor() as cur:
                # Check if areas_embeddings is empty
                cur.execute("SELECT COUNT(*) FROM areas_embeddings")
                count = cur.fetchone()[0]
                
                if count == 0:
                    logger.info("Populating areas_embeddings table...")
                    self._populate_area_embeddings()
                
                # Check if projects_embeddings is empty
                cur.execute("SELECT COUNT(*) FROM projects_embeddings")
                count = cur.fetchone()[0]
                
                if count == 0:
                    logger.info("Populating projects_embeddings table...")
                    self._populate_project_embeddings()
                
                # Check if unit_types_embeddings needs embeddings
                cur.execute("SELECT COUNT(*) FROM unit_types_embeddings WHERE embedding IS NULL")
                count = cur.fetchone()[0]
                
                if count > 0:
                    logger.info("Populating unit_types_embeddings...")
                    self._populate_unit_type_embeddings()
                    
        except Exception as e:
            logger.error(f"Error ensuring embeddings populated: {e}")
    
    def _populate_area_embeddings(self):
        """Fetch areas from backend and compute embeddings."""
        areas = self.backend_api.get_areas()
        
        with self.conn.cursor() as cur:
            for area in areas:
                area_id = area.get('areaId') or area.get('area_id')
                name = area['name']
                name_ar = area.get('name_ar', name)
                
                # Compute embedding for bilingual text
                text = f"{name} {name_ar}"
                embedding = self.embedding_client.embed_text(text)
                
                # Insert into database
                cur.execute("""
                    INSERT INTO areas_embeddings (area_id, name, name_ar, embedding)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (area_id) DO UPDATE 
                    SET name = EXCLUDED.name, 
                        name_ar = EXCLUDED.name_ar,
                        embedding = EXCLUDED.embedding,
                        updated_at = CURRENT_TIMESTAMP
                """, (area_id, name, name_ar, embedding))
            
            self.conn.commit()
            logger.info(f"Populated {len(areas)} area embeddings")
    
    def _populate_project_embeddings(self):
        """Fetch projects from backend and compute embeddings."""
        projects = self.backend_api.get_projects()
        
        with self.conn.cursor() as cur:
            for project in projects:
                project_id = project.get('projectId') or project.get('project_id')
                name = project['name']
                area_id = project.get('area', {}).get('areaId') or project.get('area', {}).get('area_id')
                
                # Compute embedding
                embedding = self.embedding_client.embed_text(name)
                
                # Insert into database
                cur.execute("""
                    INSERT INTO projects_embeddings (project_id, name, area_id, embedding)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (project_id) DO UPDATE 
                    SET name = EXCLUDED.name,
                        area_id = EXCLUDED.area_id,
                        embedding = EXCLUDED.embedding,
                        updated_at = CURRENT_TIMESTAMP
                """, (project_id, name, area_id, embedding))
            
            self.conn.commit()
            logger.info(f"Populated {len(projects)} project embeddings")
    
    def _populate_unit_type_embeddings(self):
        """Compute embeddings for unit types."""
        with self.conn.cursor() as cur:
            cur.execute("SELECT unit_type_id, name, name_ar FROM unit_types_embeddings")
            unit_types = cur.fetchall()
            
            for unit_type_id, name, name_ar in unit_types:
                # Compute embedding for bilingual text
                text = f"{name} {name_ar}"
                embedding = self.embedding_client.embed_text(text)
                
                cur.execute("""
                    UPDATE unit_types_embeddings 
                    SET embedding = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE unit_type_id = %s
                """, (embedding, unit_type_id))
            
            self.conn.commit()
            logger.info(f"Populated {len(unit_types)} unit type embeddings")
    
    def match_area(self, query: str, top_k: int = 5, threshold: float = 0.45) -> Dict:
        """Find top K most relevant areas using pgvector similarity.
        
        Args:
            query: User query text
            top_k: Number of top matches to return
            threshold: Minimum similarity score
            
        Returns:
            Dict with matched=True/False, value, id, score, alternatives (top K)
        """
        try:
            self._ensure_embeddings_populated()
            
            # Compute query embedding
            query_embedding = self.embedding_client.embed_text(query)
            
            # pgvector cosine similarity search
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        area_id,
                        name,
                        name_ar,
                        1 - (embedding <=> %s::vector) AS similarity
                    FROM areas_embeddings
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                """, (query_embedding, query_embedding, top_k))
                
                results = cur.fetchall()
            
            if not results:
                return {"matched": False, "alternatives": []}
            
            # Format results
            alternatives = [
                {
                    "value": r['name'],
                    "id": r['area_id'],
                    "score": float(r['similarity'])
                }
                for r in results
            ]
            
            best = alternatives[0]
            logger.info(f"Area matching: '{query}' → '{best['value']}' (score: {best['score']:.3f})")
            
            if best['score'] >= threshold:
                return {
                    "matched": True,
                    "value": best['value'],
                    "id": best['id'],
                    "score": best['score'],
                    "alternatives": alternatives[1:]  # Exclude top match
                }
            
            return {"matched": False, "score": best['score'], "alternatives": alternatives}
            
        except Exception as e:
            logger.error(f"Error in pgvector area matching: {e}")
            return {"matched": False, "alternatives": []}
    
    def match_project(self, query: str, area_id: Optional[int] = None, top_k: int = 5, threshold: float = 0.45) -> Dict:
        """Find top K most relevant projects using pgvector similarity.
        
        Args:
            query: User query text
            area_id: Optional area filter
            top_k: Number of top matches to return
            threshold: Minimum similarity score
            
        Returns:
            Dict with matched=True/False, value, id, score, alternatives
        """
        try:
            self._ensure_embeddings_populated()
            
            # Compute query embedding
            query_embedding = self.embedding_client.embed_text(query)
            
            # pgvector cosine similarity search with optional area filter
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                if area_id:
                    cur.execute("""
                        SELECT 
                            project_id,
                            name,
                            area_id,
                            1 - (embedding <=> %s::vector) AS similarity
                        FROM projects_embeddings
                        WHERE area_id = %s
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s
                    """, (query_embedding, area_id, query_embedding, top_k))
                else:
                    cur.execute("""
                        SELECT 
                            project_id,
                            name,
                            area_id,
                            1 - (embedding <=> %s::vector) AS similarity
                        FROM projects_embeddings
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s
                    """, (query_embedding, query_embedding, top_k))
                
                results = cur.fetchall()
            
            if not results:
                return {"matched": False, "alternatives": []}
            
            # Format results
            alternatives = [
                {
                    "value": r['name'],
                    "id": r['project_id'],
                    "score": float(r['similarity'])
                }
                for r in results
            ]
            
            best = alternatives[0]
            logger.info(f"Project matching: '{query}' → '{best['value']}' (score: {best['score']:.3f})")
            
            if best['score'] >= threshold:
                return {
                    "matched": True,
                    "value": best['value'],
                    "id": best['id'],
                    "score": best['score'],
                    "alternatives": alternatives[1:]
                }
            
            return {"matched": False, "score": best['score'], "alternatives": alternatives}
            
        except Exception as e:
            logger.error(f"Error in pgvector project matching: {e}")
            return {"matched": False, "alternatives": []}
    
    def match_unit_type(self, query: str, top_k: int = 3, threshold: float = 0.4) -> Dict:
        """Find most relevant unit type using pgvector similarity.
        
        Args:
            query: User query text
            top_k: Number of top matches to return
            threshold: Minimum similarity score
            
        Returns:
            Dict with matched=True/False, value (English), score
        """
        try:
            self._ensure_embeddings_populated()
            
            # Compute query embedding
            query_embedding = self.embedding_client.embed_text(query)
            
            # pgvector cosine similarity search
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        name,
                        1 - (embedding <=> %s::vector) AS similarity
                    FROM unit_types_embeddings
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                """, (query_embedding, query_embedding, top_k))
                
                results = cur.fetchall()
            
            if not results:
                return {"matched": False}
            
            best = results[0]
            logger.info(f"Unit type matching: '{query}' → '{best['name']}' (score: {best['similarity']:.3f})")
            
            if best['similarity'] >= threshold:
                return {
                    "matched": True,
                    "value": best['name'],
                    "score": float(best['similarity'])
                }
            
            return {"matched": False, "score": float(best['similarity'])}
            
        except Exception as e:
            logger.error(f"Error in pgvector unit type matching: {e}")
            return {"matched": False}


@lru_cache()
def get_fast_semantic_matcher() -> FastSemanticMatcher:
    """Get cached fast semantic matcher instance."""
    return FastSemanticMatcher()

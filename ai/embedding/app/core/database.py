"""
Database service for pgvector operations.
Handles embedding storage and similarity search.
"""

from typing import List, Dict, Optional, Any
from functools import lru_cache
import psycopg2
from psycopg2.extras import RealDictCursor
from pgvector.psycopg2 import register_vector
import logging

from app.config import get_settings

logger = logging.getLogger(__name__)


class DatabaseService:
    """Service for pgvector database operations."""
    
    def __init__(self):
        self.settings = get_settings()
        self._conn = None
    
    @property
    def conn(self):
        """Get database connection (lazy, auto-reconnect)."""
        if self._conn is None or self._conn.closed:
            logger.info("Connecting to database...")
            self._conn = psycopg2.connect(
                host=self.settings.database_host,
                port=self.settings.database_port,
                user=self.settings.database_user,
                password=self.settings.database_password,
                database=self.settings.database_name
            )
            register_vector(self._conn)
            logger.info("Database connection established")
        return self._conn
    
    def ensure_tables_exist(self):
        """Create embedding tables if they don't exist."""
        with self.conn.cursor() as cur:
            # Areas embeddings
            cur.execute("""
                CREATE TABLE IF NOT EXISTS areas_embeddings (
                    area_id INTEGER PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    name_ar VARCHAR(255),
                    embedding vector(768),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Projects embeddings
            cur.execute("""
                CREATE TABLE IF NOT EXISTS projects_embeddings (
                    project_id INTEGER PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    area_id INTEGER,
                    embedding vector(768),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Unit types embeddings
            cur.execute("""
                CREATE TABLE IF NOT EXISTS unit_types_embeddings (
                    unit_type_id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    name_ar VARCHAR(100),
                    embedding vector(768),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            self.conn.commit()
        logger.info("Database tables verified/created")
    
    # ==================== Area Operations ====================
    
    def upsert_area_embedding(
        self, 
        area_id: str, 
        name: str, 
        embedding_en: List[float],
        embedding_ar: List[float],
        name_ar: Optional[str] = None
    ) -> bool:
        """Insert or update area embedding with dual vectors."""
        try:
            with self.conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO areas_embeddings (area_id, name, name_ar, embedding_en, embedding_ar, updated_at)
                    VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (area_id) DO UPDATE SET
                        name = EXCLUDED.name,
                        name_ar = EXCLUDED.name_ar,
                        embedding_en = EXCLUDED.embedding_en,
                        embedding_ar = EXCLUDED.embedding_ar,
                        updated_at = CURRENT_TIMESTAMP
                """, (area_id, name, name_ar, embedding_en, embedding_ar))
                self.conn.commit()
            logger.info(f"Upserted area dual embeddings: {name} (ID: {area_id})")
            return True
        except Exception as e:
            logger.error(f"Failed to upsert area embedding: {e}")
            self.conn.rollback()
            return False
    
    def delete_area_embedding(self, area_id: str) -> bool:
        """Delete area embedding."""
        try:
            with self.conn.cursor() as cur:
                cur.execute("DELETE FROM areas_embeddings WHERE area_id = %s", (area_id,))
                self.conn.commit()
            logger.info(f"Deleted area embedding: ID {area_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete area embedding: {e}")
            self.conn.rollback()
            return False
    
    def search_areas(
        self, 
        query_embedding: List[float], 
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Search for similar areas using pgvector."""
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
        
        return [dict(r) for r in results]
    
    def search_areas_by_language(
        self, 
        query_embedding: List[float],
        language: str,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Search for similar areas using language-specific vector.
        
        Args:
            query_embedding: Query embedding vector
            language: 'en' for English, 'ar' for Arabic
            top_k: Number of results to return
        """
        embedding_column = 'embedding_en' if language == 'en' else 'embedding_ar'
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = f"""
                SELECT 
                    area_id,
                    name,
                    name_ar,
                    1 - ({embedding_column} <=> %s::vector) AS similarity
                FROM areas_embeddings
                WHERE {embedding_column} IS NOT NULL
                ORDER BY {embedding_column} <=> %s::vector
                LIMIT %s
            """
            cur.execute(query, (query_embedding, query_embedding, top_k))
            
            results = cur.fetchall()
        
        return [dict(r) for r in results]
    
    # ==================== Project Operations ====================
    
    def upsert_project_embedding(
        self, 
        project_id: str, 
        name: str, 
        embedding_en: List[float],
        embedding_ar: List[float],
        area_id: Optional[str] = None,
        name_ar: Optional[str] = None
    ) -> bool:
        """Insert or update project embedding with dual vectors."""
        try:
            with self.conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO projects_embeddings (project_id, name, area_id, embedding_en, embedding_ar, updated_at)
                    VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (project_id) DO UPDATE SET
                        name = EXCLUDED.name,
                        area_id = EXCLUDED.area_id,
                        embedding_en = EXCLUDED.embedding_en,
                        embedding_ar = EXCLUDED.embedding_ar,
                        updated_at = CURRENT_TIMESTAMP
                """, (project_id, name, area_id, embedding_en, embedding_ar))
                self.conn.commit()
            logger.info(f"Upserted project dual embeddings: {name} (ID: {project_id})")
            return True
        except Exception as e:
            logger.error(f"Failed to upsert project embedding: {e}")
            self.conn.rollback()
            return False
    
    def delete_project_embedding(self, project_id: str) -> bool:
        """Delete project embedding."""
        try:
            with self.conn.cursor() as cur:
                cur.execute("DELETE FROM projects_embeddings WHERE project_id = %s", (project_id,))
                self.conn.commit()
            logger.info(f"Deleted project embedding: ID {project_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete project embedding: {e}")
            self.conn.rollback()
            return False
    
    def search_projects(
        self, 
        query_embedding: List[float], 
        area_id: Optional[str] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Search for similar projects using pgvector."""
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
        
        return [dict(r) for r in results]

    def search_projects_by_language(
        self, 
        query_embedding: List[float],
        language: str,
        area_id: Optional[str] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Search for similar projects using language-specific vector.
        
        Args:
            query_embedding: Query embedding vector
            language: 'en' for English, 'ar' for Arabic
            area_id: Optional area filter
            top_k: Number of results to return
        """
        embedding_column = 'embedding_en' if language == 'en' else 'embedding_ar'
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            if area_id:
                query = f"""
                    SELECT 
                        project_id,
                        name,
                        area_id,
                        1 - ({embedding_column} <=> %s::vector) AS similarity
                    FROM projects_embeddings
                    WHERE area_id = %s AND {embedding_column} IS NOT NULL
                    ORDER BY {embedding_column} <=> %s::vector
                    LIMIT %s
                """
                cur.execute(query, (query_embedding, area_id, query_embedding, top_k))
            else:
                query = f"""
                    SELECT 
                        project_id,
                        name,
                        area_id,
                        1 - ({embedding_column} <=> %s::vector) AS similarity
                    FROM projects_embeddings
                    WHERE {embedding_column} IS NOT NULL
                    ORDER BY {embedding_column} <=> %s::vector
                    LIMIT %s
                """
                cur.execute(query, (query_embedding, query_embedding, top_k))
            
            results = cur.fetchall()
        
        return [dict(r) for r in results]
    
    # ==================== Unit Type Operations ====================
    
    def upsert_unit_type_embedding(
        self, 
        name: str, 
        embedding_en: List[float],
        embedding_ar: List[float],
        name_ar: Optional[str] = None
    ) -> bool:
        """Insert or update unit type embedding with dual vectors."""
        try:
            with self.conn.cursor() as cur:
                # Check if exists by name
                cur.execute("SELECT unit_type_id FROM unit_types_embeddings WHERE name = %s", (name,))
                existing = cur.fetchone()
                
                if existing:
                    cur.execute("""
                        UPDATE unit_types_embeddings
                        SET name_ar = %s, embedding_en = %s, embedding_ar = %s
                        WHERE name = %s
                    """, (name_ar, embedding_en, embedding_ar, name))
                else:
                    cur.execute("""
                        INSERT INTO unit_types_embeddings (name, name_ar, embedding_en, embedding_ar)
                        VALUES (%s, %s, %s, %s)
                    """, (name, name_ar, embedding_en, embedding_ar))
                
                self.conn.commit()
            logger.info(f"Upserted unit type dual embeddings: {name}")
            return True
        except Exception as e:
            logger.error(f"Failed to upsert unit type embedding: {e}")
            self.conn.rollback()
            return False
    
    def search_unit_types(
        self, 
        query_embedding: List[float], 
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """Search for similar unit types using pgvector."""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    name,
                    name_ar,
                    1 - (embedding <=> %s::vector) AS similarity
                FROM unit_types_embeddings
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """, (query_embedding, query_embedding, top_k))
            
            results = cur.fetchall()
        
        return [dict(r) for r in results]

    def search_unit_types_by_language(
        self, 
        query_embedding: List[float],
        language: str,
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """Search for similar unit types using language-specific vector.
        
        Args:
            query_embedding: Query embedding vector
            language: 'en' for English, 'ar' for Arabic
            top_k: Number of results to return
        """
        embedding_column = 'embedding_en' if language == 'en' else 'embedding_ar'
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = f"""
                SELECT 
                    name,
                    name_ar,
                    1 - ({embedding_column} <=> %s::vector) AS similarity
                FROM unit_types_embeddings
                WHERE {embedding_column} IS NOT NULL
                ORDER BY {embedding_column} <=> %s::vector
                LIMIT %s
            """
            cur.execute(query, (query_embedding, query_embedding, top_k))
            
            results = cur.fetchall()
        
        return [dict(r) for r in results]
    
    def close(self):
        """Close database connection."""
        if self._conn and not self._conn.closed:
            self._conn.close()
            logger.info("Database connection closed")


_db_instance = None


def get_database() -> DatabaseService:
    """Get cached database service instance."""
    global _db_instance
    if _db_instance is None:
        _db_instance = DatabaseService()
    return _db_instance


def initialize_database():
    """Initialize database and create tables."""
    db = get_database()
    db.ensure_tables_exist()

"""
Vector store service using pgvector for semantic memory.
Handles storage and retrieval of conversation embeddings.
"""

from typing import List, Optional, Tuple
import json
import psycopg2
from psycopg2.extras import execute_values
from pgvector.psycopg2 import register_vector

from app.config import get_settings
from app.core.embeddings import get_embedding_service
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class VectorStoreService:
    """Service for vector storage and retrieval using pgvector."""
    
    def __init__(self):
        """Initialize the vector store service."""
        self.settings = get_settings()
        self._connection = None
        self._initialized = False
    
    def _get_connection(self):
        """Get database connection."""
        if self._connection is None or self._connection.closed:
            logger.debug(f"Connecting to database at {self.settings.database_host}:{self.settings.database_port}")
            self._connection = psycopg2.connect(
                host=self.settings.database_host,
                port=self.settings.database_port,
                user=self.settings.database_user,
                password=self.settings.database_password,
                database=self.settings.database_name
            )
            register_vector(self._connection)
            logger.debug("Database connection established")
        return self._connection
    
    def initialize(self):
        """Initialize pgvector extension and create tables if needed."""
        if self._initialized:
            return
            
        conn = self._get_connection()
        with conn.cursor() as cur:
            logger.info("Initializing pgvector and database tables")
            # Enable pgvector extension
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
            
            # Create conversation embeddings table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS conversation_embeddings (
                    id SERIAL PRIMARY KEY,
                    phone_number VARCHAR(50) NOT NULL,
                    message_type VARCHAR(20) NOT NULL,
                    message_text TEXT NOT NULL,
                    embedding vector(1024),
                    metadata JSONB DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            
            # Create index for similarity search
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_conversation_embeddings_vector 
                ON conversation_embeddings 
                USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 100)
            """)
            
            # Create index for phone number lookup
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_conversation_embeddings_phone 
                ON conversation_embeddings (phone_number)
            """)
            
            conn.commit()
        
        self._initialized = True
    
    def store_message(
        self,
        phone_number: str,
        message_type: str,
        message_text: str,
        metadata: Optional[dict] = None
    ) -> int:
        """Store a message with its embedding.
        
        Args:
            phone_number: Customer phone number.
            message_type: 'user' or 'assistant'.
            message_text: The message content.
            metadata: Optional additional metadata.
            
        Returns:
            ID of the stored message.
        """
        self.initialize()
        
        embedding_service = get_embedding_service()
        embedding = embedding_service.embed_text(message_text)
        
        logger.info(f"Storing {message_type} message for {phone_number}")
        
        conn = self._get_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO conversation_embeddings 
                (phone_number, message_type, message_text, embedding, metadata)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """,
                (phone_number, message_type, message_text, embedding, json.dumps(metadata or {}))
            )
            message_id = cur.fetchone()[0]
            conn.commit()
        
        logger.debug(f"Message stored successfully with ID: {message_id}")
        return message_id
    
    def search_similar(
        self,
        query: str,
        phone_number: Optional[str] = None,
        limit: int = 5
    ) -> List[Tuple[str, str, float]]:
        """Search for similar messages.
        
        Args:
            query: Query text to search for.
            phone_number: Optional filter by phone number.
            limit: Maximum number of results.
            
        Returns:
            List of (message_type, message_text, similarity_score) tuples.
        """
        self.initialize()
        
        embedding_service = get_embedding_service()
        query_embedding = embedding_service.embed_text(query)
        
        conn = self._get_connection()
        with conn.cursor() as cur:
            if phone_number:
                cur.execute(
                    """
                    SELECT message_type, message_text, 
                           1 - (embedding <=> %s::vector) as similarity
                    FROM conversation_embeddings
                    WHERE phone_number = %s
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                    """,
                    (query_embedding, phone_number, query_embedding, limit)
                )
            else:
                cur.execute(
                    """
                    SELECT message_type, message_text, 
                           1 - (embedding <=> %s::vector) as similarity
                    FROM conversation_embeddings
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                    """,
                    (query_embedding, query_embedding, limit)
                )
            
            results = cur.fetchall()
        
        return results
    
    def get_conversation_history(
        self,
        phone_number: str,
        limit: int = 10
    ) -> List[dict]:
        """Get recent conversation history for a phone number.
        
        Args:
            phone_number: Customer phone number.
            limit: Maximum number of messages.
            
        Returns:
            List of message dictionaries.
        """
        self.initialize()
        
        conn = self._get_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT message_type, message_text, created_at, metadata
                FROM conversation_embeddings
                WHERE phone_number = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (phone_number, limit)
            )
            
            rows = cur.fetchall()
        
        # Reverse to get chronological order
        messages = [
            {
                "role": row[0],
                "content": row[1],
                "created_at": row[2].isoformat() if row[2] else None,
                "metadata": row[3]
            }
            for row in reversed(rows)
        ]
        
        return messages
    
    def get_customer_session(self, phone_number: str) -> Optional[dict]:
        """Retrieve persistent session for a customer.
        
        Args:
            phone_number: Customer phone number.
            
        Returns:
            Session data dictionary or None if not found.
        """
        self.initialize()
        
        conn = self._get_connection()
        with conn.cursor() as cur:
            # Try to get extended fields first (new schema)
            try:
                cur.execute(
                    """
                    SELECT extracted_requirements, last_intent, is_complete,
                           confirmed, awaiting_confirmation, confirmation_attempt
                    FROM customer_sessions
                    WHERE phone_number = %s
                    """,
                    (phone_number,)
                )
                row = cur.fetchone()
                
                if row:
                    logger.info(f"Retrieved session for {phone_number} (extended schema)")
                    return {
                        "extracted_requirements": row[0],
                        "last_intent": row[1],
                        "is_complete": row[2],
                        "confirmed": row[3] if row[3] is not None else False,
                        "awaiting_confirmation": row[4] if row[4] is not None else False,
                        "confirmation_attempt": row[5] if row[5] is not None else 0
                    }
            except Exception as e:
                # Fallback to old schema if columns don't exist
                logger.debug(f"Extended columns not found, using basic schema: {e}")
                cur.execute(
                    """
                    SELECT extracted_requirements, last_intent, is_complete
                    FROM customer_sessions
                    WHERE phone_number = %s
                    """,
                    (phone_number,)
                )
                row = cur.fetchone()
                
                if row:
                    logger.info(f"Retrieved session for {phone_number} (basic schema)")
                    return {
                        "extracted_requirements": row[0],
                        "last_intent": row[1],
                        "is_complete": row[2],
                        "confirmed": False,
                        "awaiting_confirmation": False,
                        "confirmation_attempt": 0
                    }
        
        logger.debug(f"No existing session found for {phone_number}")
        return None
    
    def save_customer_session(
        self,
        phone_number: str,
        extracted_requirements: dict,
        last_intent: str,
        is_complete: bool,
        confirmed: bool = False,
        awaiting_confirmation: bool = False,
        confirmation_attempt: int = 0
    ):
        """Save or update customer session.
        
        Args:
            phone_number: Customer phone number.
            extracted_requirements: Dictionary of extracted customer requirements.
            last_intent: Last detected intent.
            is_complete: Whether requirements are complete.
            confirmed: Whether user has confirmed requirements.
            awaiting_confirmation: Whether bot is waiting for confirmation.
            confirmation_attempt: Number of confirmation attempts.
        """
        self.initialize()
        
        conn = self._get_connection()
        with conn.cursor() as cur:
            # Try extended schema first
            try:
                cur.execute(
                    """
                    INSERT INTO customer_sessions 
                    (phone_number, extracted_requirements, last_intent, is_complete,
                     confirmed, awaiting_confirmation, confirmation_attempt, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (phone_number) 
                    DO UPDATE SET 
                        extracted_requirements = EXCLUDED.extracted_requirements,
                        last_intent = EXCLUDED.last_intent,
                        is_complete = EXCLUDED.is_complete,
                        confirmed = EXCLUDED.confirmed,
                        awaiting_confirmation = EXCLUDED.awaiting_confirmation,
                        confirmation_attempt = EXCLUDED.confirmation_attempt,
                        updated_at = NOW()
                    """,
                    (phone_number, json.dumps(extracted_requirements), last_intent, is_complete,
                     confirmed, awaiting_confirmation, confirmation_attempt)
                )
                conn.commit()
                logger.info(f"Saved session for {phone_number} (complete: {is_complete}, confirmed: {confirmed})")
            except Exception as e:
                # Fallback to basic schema
                logger.warning(f"Extended schema save failed, using basic: {e}")
                conn.rollback()
                cur.execute(
                    """
                    INSERT INTO customer_sessions 
                    (phone_number, extracted_requirements, last_intent, is_complete, updated_at)
                    VALUES (%s, %s, %s, %s, NOW())
                    ON CONFLICT (phone_number) 
                    DO UPDATE SET 
                        extracted_requirements = EXCLUDED.extracted_requirements,
                        last_intent = EXCLUDED.last_intent,
                        is_complete = EXCLUDED.is_complete,
                        updated_at = NOW()
                    """,
                    (phone_number, json.dumps(extracted_requirements), last_intent, is_complete)
                )
                conn.commit()
                logger.info(f"Saved session for {phone_number} (basic schema, complete: {is_complete})")
    
    def close(self):
        """Close the database connection."""
        if self._connection and not self._connection.closed:
            self._connection.close()


_vector_store_instance = None


def get_vector_store() -> VectorStoreService:
    """Get or create vector store service instance."""
    global _vector_store_instance
    if _vector_store_instance is None:
        _vector_store_instance = VectorStoreService()
    return _vector_store_instance

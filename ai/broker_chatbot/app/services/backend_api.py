"""
Backend API service for Broker Chatbot.
Handles communication with the NestJS backend for request and conversation data.
"""

from typing import List, Dict, Optional
import httpx

from app.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class BrokerBackendAPIService:
    """Service for communicating with the Real Estate CRM backend."""
    
    def __init__(self, base_url: str = None):
        """Initialize the backend API service.
        
        Args:
            base_url: Base URL of the backend API.
        """
        settings = get_settings()
        self.base_url = base_url or settings.backend_api_url
        self.client = httpx.Client(timeout=30.0)
        logger.info(f"Backend API service initialized with base URL: {self.base_url}")
    
    def get_request_with_conversations(
        self,
        request_id: int,
        broker_id: int
    ) -> Optional[Dict]:
        """Get request details with all conversations.
        
        Args:
            request_id: ID of the request.
            broker_id: ID of the broker (for access verification).
            
        Returns:
            Request data with conversations, or None if not found/unauthorized.
        """
        try:
            response = self.client.get(
                f"{self.base_url}/chatbot/broker/requests/{request_id}",
                params={"broker_id": broker_id}
            )
            
            if response.status_code == 404:
                logger.warning(f"Request {request_id} not found")
                return None
            elif response.status_code == 403:
                logger.warning(f"Broker {broker_id} not authorized for request {request_id}")
                return None
            
            response.raise_for_status()
            data = response.json()
            logger.info(f"Retrieved request {request_id} with {len(data.get('conversations', []))} conversations")
            return data
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error getting request: {e}")
            return None
        except Exception as e:
            logger.error(f"Error getting request with conversations: {e}")
            return None
    
    def get_request_conversations(
        self,
        request_id: int
    ) -> List[Dict]:
        """Get all conversations for a request.
        
        Args:
            request_id: ID of the request.
            
        Returns:
            List of conversation messages.
        """
        try:
            response = self.client.get(
                f"{self.base_url}/chatbot/broker/requests/{request_id}/conversations"
            )
            response.raise_for_status()
            conversations = response.json()
            logger.info(f"Retrieved {len(conversations)} conversations for request {request_id}")
            return conversations
            
        except Exception as e:
            logger.error(f"Error getting conversations: {e}")
            return []
    
    def verify_broker_access(
        self,
        broker_id: int,
        request_id: int
    ) -> bool:
        """Verify that broker has access to this request.
        
        Args:
            broker_id: ID of the broker.
            request_id: ID of the request.
            
        Returns:
            True if broker is assigned to this request.
        """
        try:
            # Try to get the request - will return 403 if not authorized
            response = self.client.get(
                f"{self.base_url}/chatbot/broker/requests/{request_id}",
                params={"broker_id": broker_id}
            )
            return response.status_code == 200
            
        except Exception as e:
            logger.error(f"Error verifying broker access: {e}")
            return False
    
    def get_broker_assigned_requests(
        self,
        broker_id: int
    ) -> List[Dict]:
        """Get all requests assigned to a broker.
        
        Args:
            broker_id: ID of the broker.
            
        Returns:
            List of assigned requests.
        """
        try:
            response = self.client.get(
                f"{self.base_url}/requests",
                params={"broker_id": broker_id, "status": "active"}
            )
            response.raise_for_status()
            requests = response.json()
            logger.info(f"Retrieved {len(requests)} assigned requests for broker {broker_id}")
            return requests
            
        except Exception as e:
            logger.error(f"Error getting broker requests: {e}")
            return []
    
    def get_request_details(
        self,
        request_id: int
    ) -> Optional[Dict]:
        """Get basic request details.
        
        Args:
            request_id: ID of the request.
            
        Returns:
            Request data or None.
        """
        try:
            response = self.client.get(f"{self.base_url}/requests/{request_id}")
            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            logger.error(f"Error getting request details: {e}")
            return None
    
    def close(self):
        """Close the HTTP client."""
        self.client.close()


# Singleton instance
_backend_api_instance: Optional[BrokerBackendAPIService] = None


def get_backend_api_service() -> BrokerBackendAPIService:
    """Get or create backend API service instance.
    
    Returns:
        BrokerBackendAPIService instance.
    """
    global _backend_api_instance
    if _backend_api_instance is None:
        _backend_api_instance = BrokerBackendAPIService()
    return _backend_api_instance

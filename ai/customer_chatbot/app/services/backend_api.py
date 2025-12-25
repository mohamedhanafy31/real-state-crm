"""
Backend API service for communicating with the NestJS backend.
Handles customer management, unit search, and request creation.
"""

from typing import List, Dict, Optional
import httpx
from app.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class BackendAPIService:
    """Service for communicating with the Real Estate CRM backend."""
    
    def __init__(self, base_url: str = None):
        """Initialize the backend API service.
        
        Args:
            base_url: Base URL of the backend API. Defaults to config value.
        """
        settings = get_settings()
        self.base_url = base_url or settings.backend_api_url
        self.client = httpx.Client(timeout=30.0)
        logger.info(f"Backend API service initialized with base URL: {self.base_url}")
    
    def get_or_create_customer(self, phone: str, name: Optional[str] = None) -> int:
        """Get existing customer by phone or create new one.
        
        Args:
            phone: Customer phone number.
            name: Customer name (optional).
            
        Returns:
            Customer ID.
        """
        try:
            # Use public chatbot endpoint
            response = self.client.post(
                f"{self.base_url}/chatbot/customers",
                json={"phone": phone, "name": name}
            )
            response.raise_for_status()
            customer = response.json()
            logger.info(f"Customer retrieved/created: ID={customer.get('customerId')}")
            return customer.get("customerId")
        
        except httpx.HTTPStatusError as e:
            logger.error(f"Error in get_or_create_customer: {e}")
            raise
    
    def search_units(
        self,
        area_id: int = None,  # NEW: Use ID instead of name
        project_id: int = None,  # NEW: Use ID instead of name
        area_name: str = None,  # DEPRECATED: Keep for backwards compatibility
        project_name: str = None,  # DEPRECATED: Keep for backwards compatibility
        unit_type: str = None,
        budget_max: float = None,
        budget_min: float = None,  # NEW
        size_min: float = None,
        bedrooms: int = None,
        description: str = None,
        sort_by: str = 'price',  # NEW: 'price' or 'size'
        sort_order: str = 'ASC',  # NEW: 'ASC' or 'DESC'
        limit: int = 10,  # NEW: Result limit
        status: str = 'available'  # NEW: Filter by status
    ) -> List[Dict]:
        """Search for available units based on filters.
        
        Args:
            area_id: Area ID (preferred over area_name).
            project_id: Project ID (preferred over project_name).
            area_name: Area/location name (deprecated, use area_id).
            project_name: Project name (deprecated, use project_id).
            unit_type: Type of unit (شقة, فيلا, etc.).
            budget_max: Maximum budget.
            budget_min: Minimum budget.
            size_min: Minimum size in sqm.
            bedrooms: Number of bedrooms.
            description: Description keywords.
            sort_by: Field to sort by ('price' or 'size').
            sort_order: Sort direction ('ASC' or 'DESC').
            limit: Maximum number of results.
            status: Unit status filter (default: 'available').
            
        Returns:
            List of matching units with project and area details.
        """
        try:
            params = {}
            
            # PRIORITY: Use IDs if provided
            if area_id is not None:
                params['area_id'] = area_id
            elif area_name:
                params['area'] = area_name  # Fallback
                
            if project_id is not None:
                params['project_id'] = project_id
            elif project_name:
                params['project'] = project_name  # Fallback
            
            if unit_type:
                params['unit_type'] = unit_type
            if budget_max:
                params['budget_max'] = budget_max
            if budget_min:
                params['budget_min'] = budget_min
            if size_min:
                params['size_min'] = size_min
            if bedrooms:
                params['bedrooms'] = bedrooms
            if description:
                params['description'] = description
            
            # New parameters
            if sort_by:
                params['sort_by'] = sort_by
            if sort_order:
                params['sort_order'] = sort_order
            if limit:
                params['limit'] = limit
            if status:
                params['status'] = status
            
            logger.info(f"Searching units with params: {params}")
            
            response = self.client.get(
                f"{self.base_url}/chatbot/units/search",
                params=params
            )
            response.raise_for_status()
            
            units = response.json()
            logger.info(f"Found {len(units)} matching units")
            return units
            
        except Exception as e:
            logger.error(f"Error searching units: {e}")
            # Return empty list on error to allow graceful degradation
            return []
    
    def create_request(
        self,
        customer_id: int,
        area_id: int,
        requirements: dict
    ) -> int:
        """Create a new customer request in the CRM.
        
        Args:
            customer_id: ID of the customer.
            area_id: ID of the area.
            requirements: Dictionary of customer requirements.
            
        Returns:
            Request ID.
        """
        try:
            payload = {
                "customerId": customer_id,
                "areaId": area_id,
                "unitType": requirements.get("unit_type"),
                "budgetMin": requirements.get("budget_min"),
                "budgetMax": requirements.get("budget_max"),
                "sizeMin": requirements.get("size_min"),
                "sizeMax": requirements.get("size_max"),
                "bedrooms": requirements.get("bedrooms"),
                "bathrooms": requirements.get("bathrooms"),
                "notes": requirements.get("extra_info") or "Created via Chatbot"
            }
            
            logger.info(f"Creating request for customer {customer_id} in area {area_id} with requirements: {requirements}")
            
            response = self.client.post(
                f"{self.base_url}/chatbot/requests",
                json=payload
            )
            response.raise_for_status()
            
            request_data = response.json()
            request_id = request_data.get('requestId')  # Match backend response
            logger.info(f"Created request {request_id}")
            return request_id
            
        except Exception as e:
            logger.error(f"Error creating request: {e}")
            raise
    
    def get_areas(self) -> List[Dict]:
        """Get all available areas.
        
        Returns:
            List of area dictionaries with id and name.
        """
        try:
            response = self.client.get(f"{self.base_url}/areas")
            response.raise_for_status()
            
            areas = response.json()
            logger.info(f"Retrieved {len(areas)} areas")
            return areas
            
        except Exception as e:
            logger.error(f"Error fetching areas: {e}")
            return []
    
    def get_area_id_by_name(self, area_name: str) -> Optional[int]:
        """Get area ID by area name.
        
        Args:
            area_name: Name of the area.
            
        Returns:
            Area ID or None if not found.
        """
        areas = self.get_areas()
        for area in areas:
            if area['name'].strip().lower() == area_name.strip().lower():
                return area['areaId']
        
        logger.warning(f"Area '{area_name}' not found")
        return None
    
    def get_projects(self, area_name: str = None) -> List[Dict]:
        """Get all available projects, optionally filtered by area.
        
        Args:
            area_name: Name of the area to filter by.
            
        Returns:
            List of project dictionaries.
        """
        try:
            params = {}
            if area_name:
                params['area'] = area_name
                
            response = self.client.get(
                f"{self.base_url}/chatbot/projects",
                params=params
            )
            response.raise_for_status()
            
            projects = response.json()
            logger.info(f"Retrieved {len(projects)} projects (Area: {area_name})")
            return projects
            
        except Exception as e:
            logger.error(f"Error fetching projects: {e}")
            return []
    
    # ========== New Chatbot Endpoints ==========
    
    def get_all_areas(self) -> List[Dict]:
        """Get all areas via chatbot endpoint."""
        try:
            response = self.client.get(f"{self.base_url}/chatbot/areas")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching all areas: {e}")
            return []
    
    def fuzzy_search_area(self, query: str) -> Dict:
        """Fuzzy search for area by name.
        
        Returns:
            Dict with 'area' (matched area or null) and 'suggestions' (list of alternatives)
        """
        try:
            response = self.client.get(
                f"{self.base_url}/chatbot/areas/search",
                params={"q": query}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fuzzy searching area: {e}")
            return {"area": None, "suggestions": []}
    
    def fuzzy_search_project(self, query: str, area_id: int = None) -> List[Dict]:
        """Fuzzy search for project by name.
        
        Args:
            query: Search query
            area_id: Optional area ID to filter by
            
        Returns:
            List of matching projects
        """
        try:
            params = {"q": query}
            if area_id:
                params["area_id"] = area_id
                
            response = self.client.get(
                f"{self.base_url}/chatbot/projects/search",
                params=params
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fuzzy searching project: {e}")
            return []
    
    def get_unit_types(self) -> List[str]:
        """Get distinct unit types from database."""
        try:
            response = self.client.get(f"{self.base_url}/chatbot/units/types")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching unit types: {e}")
            return []
    
    def get_price_range(
        self,
        area_id: int = None,  # Use ID instead of name
        project_id: int = None,  # NEW: Support project filtering
        unit_type: str = None
    ) -> Dict:
        """Get price range for units matching filters.
        
        Args:
            area_id: Area ID to filter by
            project_id: Project ID to filter by
            unit_type: Unit type to filter by
        
        Returns:
            Dict with 'min', 'max', 'avg', 'count'
        """
        try:
            params = {}
            if area_id is not None:
                params["area_id"] = area_id
            if project_id is not None:
                params["project_id"] = project_id
            if unit_type:
                params["unit_type"] = unit_type
                
            response = self.client.get(
                f"{self.base_url}/chatbot/units/price-range",
                params=params
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching price range: {e}")
            return {"min": None, "max": None, "count": 0}
    
    def compare_projects(self, project_names: List[str]) -> List[Dict]:
        """Compare multiple projects.
        
        Returns:
            List of project comparison data
        """
        try:
            response = self.client.post(
                f"{self.base_url}/chatbot/projects/compare",
                json={"projects": project_names}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error comparing projects: {e}")
            return []
    
    def close(self):
        """Close the HTTP client."""
        self.client.close()


# Singleton instance
_backend_api_instance = None


def get_backend_api_service() -> BackendAPIService:
    """Get or create backend API service instance.
    
    Returns:
        BackendAPIService instance.
    """
    global _backend_api_instance
    if _backend_api_instance is None:
        _backend_api_instance = BackendAPIService()
    return _backend_api_instance

"""
Backend API client for communicating with the CRM backend.
"""

import httpx
import logging
from typing import Dict, Any, Optional, List

from app.config import settings

logger = logging.getLogger(__name__)


class BackendClient:
    """HTTP client for CRM backend API."""
    
    def __init__(self):
        self.base_url = settings.BACKEND_URL.rstrip('/')
        self.timeout = settings.BACKEND_TIMEOUT
        
    async def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to backend."""
        import time
        import json
        
        url = f"{self.base_url}{endpoint}"
        
        # Log outgoing request
        logger.info(f"🌐 BACKEND API → {method} {endpoint}")
        if data:
            # Truncate large conversation context for logging
            log_data = data.copy() if data else {}
            if 'conversationContext' in log_data and len(str(log_data.get('conversationContext', []))) > 300:
                log_data['conversationContext'] = f"[{len(log_data['conversationContext'])} items]"
            logger.info(f"   📤 Payload: {json.dumps(log_data, ensure_ascii=False, default=str)[:500]}")
        if params:
            logger.info(f"   📋 Params: {params}")
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            start_time = time.time()
            try:
                if method == "GET":
                    response = await client.get(url, params=params)
                elif method == "POST":
                    response = await client.post(url, json=data)
                elif method == "PATCH":
                    response = await client.patch(url, json=data)
                else:
                    raise ValueError(f"Unsupported method: {method}")
                
                duration_ms = (time.time() - start_time) * 1000
                
                response.raise_for_status()
                result = response.json()
                
                # Log response
                log_result = result.copy() if isinstance(result, dict) else result
                if isinstance(log_result, dict):
                    for key in ['conversationContext', 'conversation_context']:
                        if key in log_result and len(str(log_result.get(key, []))) > 300:
                            log_result[key] = f"[{len(log_result[key])} items]"
                
                logger.info(f"   ✅ Response: {response.status_code} in {duration_ms:.0f}ms")
                logger.info(f"   📥 Data: {json.dumps(log_result, ensure_ascii=False, default=str)[:500]}")
                
                return result
                
            except httpx.HTTPStatusError as e:
                duration_ms = (time.time() - start_time) * 1000
                logger.error(f"   ❌ HTTP Error: {e.response.status_code} in {duration_ms:.0f}ms")
                logger.error(f"   📥 Error body: {e.response.text[:500]}")
                raise
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                logger.error(f"   ❌ Request Error after {duration_ms:.0f}ms: {e}")
                raise
                
    # ========== Application Endpoints ==========
    
    async def get_application_status(self, application_id: str) -> Dict[str, Any]:
        """Get application status."""
        return await self._request("GET", f"/applications/{application_id}/status")
        
    # ========== Interview Session Endpoints ==========
    
    async def start_interview(self, application_id: str) -> Dict[str, Any]:
        """Start or resume interview session."""
        return await self._request("POST", "/chatbot/interview/start", {
            "applicationId": application_id
        })
        
    async def get_interview_session(self, session_id: str) -> Dict[str, Any]:
        """Get interview session state."""
        return await self._request("GET", f"/chatbot/interview/{session_id}")
        
    async def submit_response(self, session_id: str, response_text: str) -> Dict[str, Any]:
        """Submit applicant response."""
        return await self._request("POST", "/chatbot/interview/respond", {
            "sessionId": session_id,
            "responseText": response_text
        })
        
    async def complete_interview(
        self,
        session_id: str,
        total_score: float,
        red_flags: List[str]
    ) -> Dict[str, Any]:
        """Complete interview with final score."""
        return await self._request("POST", "/chatbot/interview/complete", {
            "sessionId": session_id,
            "totalScore": total_score,
            "redFlags": red_flags
        })
        
    async def update_session_progress(
        self,
        session_id: str,
        current_phase: Optional[int] = None,
        phase_question_index: Optional[int] = None,
        phase_scores: Optional[Dict[str, float]] = None,
        red_flags: Optional[List[str]] = None,
        conversation_context: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """Update session progress (called after each question)."""
        data = {"sessionId": session_id}
        if current_phase is not None:
            data["currentPhase"] = current_phase
        if phase_question_index is not None:
            data["phaseQuestionIndex"] = phase_question_index
        if phase_scores is not None:
            data["phaseScores"] = phase_scores
        if red_flags is not None:
            data["redFlags"] = red_flags
        if conversation_context is not None:
            data["conversationContext"] = conversation_context
            
        # Note: This endpoint needs to be added to the backend
        return await self._request("PATCH", f"/chatbot/interview/{session_id}/progress", data)


# Singleton instance
_backend_client: Optional[BackendClient] = None


def get_backend_client() -> BackendClient:
    """Get or create backend client singleton."""
    global _backend_client
    if _backend_client is None:
        _backend_client = BackendClient()
    return _backend_client

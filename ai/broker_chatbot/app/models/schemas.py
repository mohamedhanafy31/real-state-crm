"""
Pydantic request/response schemas for Broker Chatbot API.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# ========== Request Models ==========

class BrokerChatRequest(BaseModel):
    """Request body for broker chat endpoint."""
    
    broker_id: int = Field(..., description="ID of the broker making the request")
    request_id: int = Field(..., description="ID of the client request to analyze")
    message: str = Field(..., description="Broker's question or command", min_length=1)
    
    class Config:
        json_schema_extra = {
            "example": {
                "broker_id": 1,
                "request_id": 123,
                "message": "حللي العميل ده وقولي ازاي اتعامل معاه"
            }
        }


# ========== Response Models ==========

class ClientAnalysisResponse(BaseModel):
    """Client personality analysis details."""
    
    personality_type: Optional[str] = Field(None, description="Client personality type")
    communication_style: Optional[str] = Field(None, description="Client communication style")
    decision_speed: Optional[str] = Field(None, description="Client decision speed")
    budget_realism: Optional[str] = Field(None, description="Budget expectations realism")
    seriousness_level: Optional[str] = Field(None, description="Level of seriousness")
    risk_level: Optional[str] = Field(None, description="Risk level (low/medium/high)")
    risk_indicators: List[str] = Field(default_factory=list, description="List of risk indicators")
    summary: Optional[str] = Field(None, description="Human-readable summary")


class StrategyResponse(BaseModel):
    """Broker strategy recommendations."""
    
    communication_tone: Optional[str] = Field(None, description="Recommended tone")
    opening_message: Optional[str] = Field(None, description="Suggested opening message")
    key_points: List[str] = Field(default_factory=list, description="Key points to emphasize")
    warnings: List[str] = Field(default_factory=list, description="Topics to be careful about")
    negotiation_tips: List[str] = Field(default_factory=list, description="Negotiation advice")
    summary: Optional[str] = Field(None, description="Strategy summary")


class RequestDataResponse(BaseModel):
    """Request details from CRM."""
    
    request_id: int
    customer_name: Optional[str] = None
    area_name: Optional[str] = None
    unit_type: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    status: Optional[str] = None


class BrokerChatResponse(BaseModel):
    """Response from broker chat endpoint."""
    
    success: bool = Field(..., description="Whether the request was successful")
    response: str = Field(..., description="Main response text for the broker")
    client_analysis: Optional[ClientAnalysisResponse] = Field(
        None, description="Client personality analysis"
    )
    strategy: Optional[StrategyResponse] = Field(
        None, description="Strategy recommendations"
    )
    request_data: Optional[RequestDataResponse] = Field(
        None, description="Request details"
    )
    error: Optional[str] = Field(None, description="Error message if any")
    timestamp: str = Field(
        default_factory=lambda: datetime.now().isoformat(),
        description="Response timestamp"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "response": "📊 تحليل الطلب رقم 123\n\n🧑 تحليل العميل:\n• نوع الشخصية: حساس للميزانية\n• مستوى الجدية: متوسط",
                "client_analysis": {
                    "personality_type": "حساس للميزانية",
                    "seriousness_level": "متوسط",
                    "risk_level": "منخفض"
                },
                "strategy": {
                    "communication_tone": "مهنية",
                    "summary": "ركز على الخيارات ضمن الميزانية"
                },
                "timestamp": "2024-12-25T12:00:00"
            }
        }


# ========== Health Check Models ==========

class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "healthy"
    service: str = "broker-chatbot"


class ReadyResponse(BaseModel):
    """Readiness check response."""
    status: str = "ready"
    llm: str = "connected"
    backend: str = "connected"
    embedding: str = "connected"


# ========== Error Models ==========

class ErrorResponse(BaseModel):
    """Error response model."""
    
    success: bool = False
    error: str
    detail: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

"""
Pydantic schemas for API request/response models.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime


# ========== Request Schemas ==========

class StartInterviewRequest(BaseModel):
    """Request to start or resume an interview."""
    application_id: str = Field(..., alias="applicationId", description="Application ID to start interview for")
    
    model_config = {"populate_by_name": True}


class SessionState(BaseModel):
    """Session state from backend."""
    sessionId: str = Field(..., alias="sessionId")
    currentPhase: int = 1
    phaseQuestionIndex: int = 0
    conversationContext: List[Dict[str, Any]] = []
    phase1Score: float = 0
    phase2Score: float = 0
    phase3Score: float = 0
    phase4Score: float = 0
    phase5Score: float = 0
    phase6Score: float = 0
    redFlags: List[str] = []
    
    model_config = {"populate_by_name": True}


class SubmitResponseRequest(BaseModel):
    """Request to submit applicant's response (from backend service)."""
    session_state: SessionState = Field(..., alias="session_state", description="Session state from backend")
    response_text: str = Field(..., alias="response_text", min_length=1, description="Applicant's response text")
    
    model_config = {"populate_by_name": True}
    
    @property
    def session_id(self) -> str:
        """Get session ID from session_state."""
        return self.session_state.sessionId


class CompleteInterviewRequest(BaseModel):
    """Request to complete interview (internal use)."""
    session_id: str
    phase_scores: Dict[str, float]
    red_flags: List[str] = []


# ========== Response Schemas ==========

class InterviewMessageResponse(BaseModel):
    """Response containing an interview message/question."""
    session_id: str
    message: str = Field(..., description="AI interviewer's message/question")
    phase: int = Field(..., ge=1, le=6, description="Current phase number")
    phase_name: str
    question_index: int
    total_questions: int
    phase_complete: bool = False
    interview_complete: bool = False


class ResponseEvaluation(BaseModel):
    """Evaluation of applicant's response."""
    score: float = Field(..., ge=0, le=10)
    notes: Optional[str] = None
    detected_red_flags: List[str] = []


class ProcessResponseResult(BaseModel):
    """Result of processing an applicant's response."""
    session_id: str
    message: Optional[str] = Field(None, description="Next question or final message")
    evaluation: ResponseEvaluation
    phase: int
    phase_name: str
    phase_complete: bool
    phase_score: Optional[float] = None
    next_phase: Optional[int] = None
    interview_complete: bool = False
    final_result: Optional[str] = None
    final_score: Optional[float] = None


class UpdatedState(BaseModel):
    """Updated session state to return to backend."""
    currentPhase: int
    phaseQuestionIndex: int
    conversationContext: List[Dict[str, Any]]
    phase1Score: float = 0
    phase2Score: float = 0
    phase3Score: float = 0
    phase4Score: float = 0
    phase5Score: float = 0
    phase6Score: float = 0
    totalScore: Optional[float] = None
    redFlags: List[str] = []


class BackendProcessResponseResult(BaseModel):
    """Response format expected by the NestJS backend."""
    message: str = Field(..., description="Next question or final message")
    is_complete: bool = Field(False, description="Whether interview is complete")
    updated_state: UpdatedState = Field(..., description="Updated session state")
    evaluation: Optional[ResponseEvaluation] = None


class InterviewSessionState(BaseModel):
    """Current state of an interview session."""
    session_id: str
    application_id: str
    current_phase: int
    phase_question_index: int
    is_complete: bool
    phase_scores: Dict[str, float] = {}
    total_score: Optional[float] = None
    final_result: Optional[str] = None
    red_flags: List[str] = []
    conversation_context: List[Dict[str, Any]] = []
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ScoreBreakdown(BaseModel):
    """Detailed score breakdown."""
    phase_scores: Dict[str, float]
    max_possible: int
    raw_score: float
    red_flags_count: int
    red_flags: List[str]
    penalty_applied: int
    adjusted_score: float
    pass_threshold: float
    result: str


class HealthCheck(BaseModel):
    """Health check response."""
    status: str = "healthy"
    timestamp: str
    version: str = "1.0.0"
    cohere_connected: bool = False


# ========== Error Schemas ==========

class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    detail: Optional[str] = None
    status_code: int = 500

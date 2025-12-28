"""
Interview API routes.
"""

from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any
import logging

from app.models.schemas import (
    StartInterviewRequest,
    SubmitResponseRequest,
    InterviewMessageResponse,
    ProcessResponseResult,
    InterviewSessionState,
    ScoreBreakdown,
    ResponseEvaluation,
    BackendProcessResponseResult,
    UpdatedState
)
from app.services.interview_service import get_interview_service
from app.services.backend_client import get_backend_client
from app.services.scoring_service import get_scoring_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interview", tags=["interview"])


@router.post("/start", response_model=InterviewMessageResponse)
async def start_interview(request: StartInterviewRequest):
    """
    Start or resume an interview session.
    
    This endpoint:
    1. Calls backend to start/get session
    2. Generates the first question
    3. Returns interview state with first message
    """
    logger.info("=" * 60)
    logger.info(f"🎬 START INTERVIEW | application_id={request.application_id}")
    logger.info("=" * 60)
    
    try:
        backend = get_backend_client()
        interview = get_interview_service()
        
        # Step 1: Start session in backend
        logger.info("📡 Step 1: Calling backend to start/get session...")
        session_data = await backend.start_interview(request.application_id)
        logger.info(f"   ✅ Backend response: session_id={session_data.get('sessionId')}, phase={session_data.get('currentPhase')}")
        logger.debug(f"   Full session data: {session_data}")
        
        # Step 2: Generate first question
        logger.info("🤖 Step 2: Generating first interview question...")
        result = await interview.start_interview(session_data)
        logger.info(f"   ✅ Question generated: phase={result['phase']}, phase_name={result['phase_name']}")
        logger.info(f"   📝 Message preview: {result['message'][:100]}...")
        
        # Step 3: Build response
        response = InterviewMessageResponse(
            session_id=session_data.get("sessionId"),
            message=result["message"],
            phase=result["phase"],
            phase_name=result["phase_name"],
            question_index=result["question_index"],
            total_questions=result["total_questions"],
            phase_complete=False,
            interview_complete=False
        )
        
        logger.info(f"✅ START INTERVIEW COMPLETE | session_id={response.session_id}")
        logger.info("=" * 60)
        
        return response
        
    except Exception as e:
        logger.error(f"❌ START INTERVIEW FAILED: {e}")
        logger.exception("Full traceback:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/respond", response_model=BackendProcessResponseResult)
async def submit_response(request: SubmitResponseRequest):
    """
    Submit applicant's response and get next question or result.
    
    This endpoint:
    1. Uses session state passed from backend
    2. Evaluates the response using LLM
    3. Determines next question or phase transition
    4. Returns response in format expected by NestJS backend
    """
    session_id = request.session_id
    session_state = request.session_state
    
    logger.info("=" * 60)
    logger.info(f"📝 SUBMIT RESPONSE | session_id={session_id}")
    logger.info(f"   📜 Applicant response: {request.response_text[:200]}{'...' if len(request.response_text) > 200 else ''}")
    logger.info(f"   📋 Session state: phase={session_state.currentPhase}, question_index={session_state.phaseQuestionIndex}")
    logger.info("=" * 60)
    
    try:
        interview = get_interview_service()
        scoring = get_scoring_service()
        
        # Convert Pydantic model to dict for service
        session_data = {
            "sessionId": session_state.sessionId,
            "currentPhase": session_state.currentPhase,
            "phaseQuestionIndex": session_state.phaseQuestionIndex,
            "conversationContext": session_state.conversationContext,
            "phase1Score": session_state.phase1Score,
            "phase2Score": session_state.phase2Score,
            "phase3Score": session_state.phase3Score,
            "phase4Score": session_state.phase4Score,
            "phase5Score": session_state.phase5Score,
            "phase6Score": session_state.phase6Score,
            "redFlags": session_state.redFlags,
        }
        
        # Step 1: Process response with LLM evaluation
        logger.info("🤖 Step 1: Processing response with LLM evaluation...")
        result = await interview.process_response(session_data, request.response_text)
        logger.info(f"   ✅ Evaluation complete:")
        logger.info(f"      - Score: {result.get('score', 'N/A')}/10")
        logger.info(f"      - Phase complete: {result.get('phase_complete')}")
        logger.info(f"      - Red flags detected: {result.get('detected_red_flags', [])}")
        
        is_complete = result.get("interview_complete", False)
        if is_complete:
            logger.info(f"      - 🎉 INTERVIEW COMPLETE!")
        
        # Step 2: Build updated state for backend
        logger.info("📦 Step 2: Building response for backend...")
        
        # Determine next phase and question index
        next_phase = result.get("next_phase", session_state.currentPhase)
        next_question_index = result.get("next_question_index", session_state.phaseQuestionIndex + 1)
        
        if result.get("phase_complete") and not is_complete:
            next_phase = result.get("next_phase", session_state.currentPhase + 1)
            next_question_index = 0
        
        # Get updated conversation context
        conversation_context = result.get("conversation_context", session_state.conversationContext)
        
        # Calculate total score if complete
        total_score = None
        if is_complete:
            phase_scores = {
                f"phase{i}": session_data.get(f"phase{i}Score", 0)
                for i in range(1, 7)
            }
            all_red_flags = session_data.get("redFlags", []) + result.get("detected_red_flags", [])
            breakdown = scoring.generate_score_breakdown(phase_scores, all_red_flags)
            total_score = breakdown["adjusted_score"]
            logger.info(f"   📊 Final score: {total_score}")
        
        # Build response in format backend expects
        response = BackendProcessResponseResult(
            message=result.get("message", ""),
            is_complete=is_complete,
            updated_state=UpdatedState(
                currentPhase=next_phase,
                phaseQuestionIndex=next_question_index,
                conversationContext=conversation_context,
                phase1Score=session_state.phase1Score + (result.get("score", 0) if session_state.currentPhase == 1 else 0),
                phase2Score=session_state.phase2Score + (result.get("score", 0) if session_state.currentPhase == 2 else 0),
                phase3Score=session_state.phase3Score + (result.get("score", 0) if session_state.currentPhase == 3 else 0),
                phase4Score=session_state.phase4Score + (result.get("score", 0) if session_state.currentPhase == 4 else 0),
                phase5Score=session_state.phase5Score + (result.get("score", 0) if session_state.currentPhase == 5 else 0),
                phase6Score=session_state.phase6Score + (result.get("score", 0) if session_state.currentPhase == 6 else 0),
                totalScore=total_score,
                redFlags=session_state.redFlags + result.get("detected_red_flags", [])
            ),
            evaluation=ResponseEvaluation(
                score=result.get("score", 5),
                notes=result.get("evaluation", {}).get("notes"),
                detected_red_flags=result.get("detected_red_flags", [])
            )
        )
        
        logger.info(f"   📝 Next message: {response.message[:100]}..." if response.message else "   📝 No message")
        logger.info(f"✅ SUBMIT RESPONSE COMPLETE | is_complete={is_complete}")
        logger.info("=" * 60)
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ SUBMIT RESPONSE FAILED: {e}")
        logger.exception("Full traceback:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{session_id}", response_model=InterviewSessionState)
async def get_session_state(session_id: str):
    """Get current interview session state."""
    try:
        backend = get_backend_client()
        session_data = await backend.get_interview_session(session_id)
        
        return InterviewSessionState(
            session_id=session_id,
            application_id=session_data.get("applicationId"),
            current_phase=session_data.get("currentPhase", 1),
            phase_question_index=session_data.get("phaseQuestionIndex", 0),
            is_complete=session_data.get("isComplete", False),
            phase_scores={
                f"phase{i}": session_data.get(f"phase{i}Score", 0)
                for i in range(1, 7)
            },
            total_score=session_data.get("totalScore"),
            final_result=session_data.get("finalResult"),
            red_flags=session_data.get("redFlags", []),
            conversation_context=session_data.get("conversationContext", [])
        )
        
    except Exception as e:
        logger.error(f"Error getting session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

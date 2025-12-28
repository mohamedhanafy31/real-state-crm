"""
Scoring service for interview evaluation.
"""

import logging
from typing import Dict, List, Any, Tuple

from app.config import settings
from app.models.interview_phases import INTERVIEW_PHASES, get_total_max_score

logger = logging.getLogger(__name__)


class ScoringService:
    """Service for scoring interview responses and determining final results."""
    
    def __init__(self):
        self.pass_threshold = settings.PASS_SCORE_THRESHOLD
        self.red_flag_penalty = settings.RED_FLAG_PENALTY
        
    def calculate_phase_score(
        self,
        phase_number: int,
        question_scores: List[float],
        max_score: int
    ) -> float:
        """
        Calculate score for a single phase.
        
        Args:
            phase_number: The phase number (1-6)
            question_scores: List of scores (0-10) for each question
            max_score: Maximum possible score for this phase
            
        Returns:
            Weighted score for the phase
        """
        if not question_scores:
            return 0.0
            
        # Average of question scores (each 0-10)
        avg_score = sum(question_scores) / len(question_scores)
        
        # Scale to phase max score
        phase_score = (avg_score / 10) * max_score
        
        logger.debug(f"Phase {phase_number}: avg={avg_score:.1f}/10, final={phase_score:.1f}/{max_score}")
        
        return round(phase_score, 1)
        
    def calculate_total_score(self, phase_scores: Dict[str, float]) -> float:
        """
        Calculate total raw score from all phase scores.
        
        Args:
            phase_scores: Dict with keys like 'phase1', 'phase2', etc.
            
        Returns:
            Total score (0-100)
        """
        total = sum(phase_scores.values())
        return round(total, 1)
        
    def apply_red_flag_penalty(
        self,
        raw_score: float,
        red_flags: List[str]
    ) -> Tuple[float, int]:
        """
        Apply penalty for detected red flags.
        
        Args:
            raw_score: Raw total score
            red_flags: List of detected red flag identifiers
            
        Returns:
            Tuple of (adjusted_score, penalty_applied)
        """
        penalty = len(red_flags) * self.red_flag_penalty
        adjusted_score = max(0, raw_score - penalty)
        
        logger.info(
            f"Score adjustment: raw={raw_score}, "
            f"red_flags={len(red_flags)}, penalty={penalty}, "
            f"adjusted={adjusted_score}"
        )
        
        return round(adjusted_score, 1), int(penalty)
        
    def determine_result(self, adjusted_score: float) -> str:
        """
        Determine final result based on adjusted score.
        
        Args:
            adjusted_score: Score after red flag penalty
            
        Returns:
            'approved' or 'rejected'
        """
        if adjusted_score >= self.pass_threshold:
            return 'approved'
        return 'rejected'
        
    def generate_score_breakdown(
        self,
        phase_scores: Dict[str, float],
        red_flags: List[str]
    ) -> Dict[str, Any]:
        """
        Generate detailed score breakdown.
        
        Returns:
            Complete score breakdown with all components
        """
        raw_score = self.calculate_total_score(phase_scores)
        adjusted_score, penalty = self.apply_red_flag_penalty(raw_score, red_flags)
        result = self.determine_result(adjusted_score)
        
        return {
            "phase_scores": phase_scores,
            "max_possible": get_total_max_score(),
            "raw_score": raw_score,
            "red_flags_count": len(red_flags),
            "red_flags": red_flags,
            "penalty_applied": penalty,
            "adjusted_score": adjusted_score,
            "pass_threshold": self.pass_threshold,
            "result": result
        }


# Standard red flag identifiers
AUTOMATIC_RED_FLAGS = [
    "extremely_generic_responses",
    "avoiding_numbers",
    "no_mistakes_claimed",
    "incorrect_terminology",
    "inconsistent_timeline",
    "unrealistic_commission_rates",
    "overly_academic_answers",
    "marketing_language",
    "blame_shifting",
    "overconfidence"
]


def normalize_red_flag(flag: str) -> str:
    """Normalize red flag text to standard identifier."""
    # Convert to lowercase and replace spaces with underscores
    normalized = flag.lower().strip().replace(" ", "_")
    
    # Map common variations to standard flags
    mappings = {
        "generic_answers": "extremely_generic_responses",
        "vague_answers": "extremely_generic_responses",
        "avoiding_specifics": "extremely_generic_responses",
        "no_numbers": "avoiding_numbers",
        "hesitation_with_numbers": "avoiding_numbers",
        "never_lost": "no_mistakes_claimed",
        "no_losses": "no_mistakes_claimed",
        "wrong_terminology": "incorrect_terminology",
        "confused_terms": "incorrect_terminology",
        "timeline_inconsistency": "inconsistent_timeline",
        "unrealistic_rates": "unrealistic_commission_rates",
        "textbook_answer": "overly_academic_answers",
    }
    
    return mappings.get(normalized, normalized)


# Singleton instance
_scoring_service = None


def get_scoring_service() -> ScoringService:
    """Get or create scoring service singleton."""
    global _scoring_service
    if _scoring_service is None:
        _scoring_service = ScoringService()
    return _scoring_service

"""
AI Broker Interviewer - Comprehensive Test Suite
Contains 20 test cases covering all major components and scenarios.

Test Categories:
1. Phase Configuration Tests (#1-4)
2. Scoring Service Tests (#5-10)
3. Interview Flow Tests (#11-15)
4. Edge Cases & Error Handling (#16-18)
5. Integration Tests (#19-20)
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any

# Import modules to test
from app.models.interview_phases import (
    INTERVIEW_PHASES,
    get_phase,
    get_total_max_score,
    get_phase_names
)
from app.services.scoring_service import (
    ScoringService,
    normalize_red_flag,
    AUTOMATIC_RED_FLAGS
)


# ========================================================================
# CATEGORY 1: Phase Configuration Tests (4 tests)
# ========================================================================

class TestPhaseConfiguration:
    """Tests for interview phase definitions and configuration."""
    
    # Test #1: Verify all 6 phases exist with correct structure
    def test_all_phases_exist(self):
        """All 6 interview phases should be defined with required fields."""
        assert len(INTERVIEW_PHASES) == 6
        
        required_fields = ["name", "name_ar", "max_score", "questions", "success_criteria", "red_flags"]
        
        for phase_num in range(1, 7):
            phase = INTERVIEW_PHASES[phase_num]
            for field in required_fields:
                assert field in phase, f"Phase {phase_num} missing field: {field}"
    
    # Test #2: Verify total score equals 100
    def test_total_max_score_is_100(self):
        """Total maximum score across all phases should be 100."""
        total = get_total_max_score()
        assert total == 100, f"Expected 100, got {total}"
    
    # Test #3: Verify phase score distribution
    def test_phase_score_distribution(self):
        """Verify expected score distribution per phase."""
        expected_scores = {
            1: 5,    # Ice-Breaking (reduced)
            2: 30,   # Real-World Experience
            3: 20,   # Professional Terminology
            4: 25,   # Scenario-Based
            5: 15,   # Numbers
            6: 5     # Credibility (reduced)
        }
        
        for phase_num, expected_score in expected_scores.items():
            phase = get_phase(phase_num)
            assert phase["max_score"] == expected_score, \
                f"Phase {phase_num}: expected {expected_score}, got {phase['max_score']}"
    
    # Test #4: Verify random selection phases have correct settings
    def test_random_select_phases(self):
        """Phases with random_select should have enough questions."""
        for phase_num, phase in INTERVIEW_PHASES.items():
            if "random_select" in phase:
                select_count = phase["random_select"]
                question_count = len(phase["questions"])
                assert select_count <= question_count, \
                    f"Phase {phase_num}: random_select={select_count} but only {question_count} questions"


# ========================================================================
# CATEGORY 2: Scoring Service Tests (6 tests)
# ========================================================================

class TestScoringService:
    """Tests for scoring calculations and result determination."""
    
    @pytest.fixture
    def scoring_service(self):
        """Create a scoring service with default settings."""
        with patch('app.services.scoring_service.settings') as mock_settings:
            mock_settings.PASS_SCORE_THRESHOLD = 75.0  # 75 out of 100
            mock_settings.RED_FLAG_PENALTY = 2.0
            return ScoringService()
    
    # Test #5: Test perfect phase score calculation
    def test_perfect_phase_score(self, scoring_service):
        """Perfect answers (10/10) should give max phase score."""
        # Phase 1 has max_score = 5 (after fix)
        score = scoring_service.calculate_phase_score(
            phase_number=1,
            question_scores=[10, 10, 10],  # Perfect answers
            max_score=5
        )
        assert score == 5.0, f"Expected 5.0, got {score}"
    
    # Test #6: Test zero phase score calculation
    def test_zero_phase_score(self, scoring_service):
        """Zero answers should give zero phase score."""
        score = scoring_service.calculate_phase_score(
            phase_number=1,
            question_scores=[0, 0, 0],  # All zeros
            max_score=10
        )
        assert score == 0.0
    
    # Test #7: Test average phase score calculation
    def test_average_phase_score(self, scoring_service):
        """Average answers (5/10) should give half of max phase score."""
        score = scoring_service.calculate_phase_score(
            phase_number=2,  # Phase 2 has max_score = 30
            question_scores=[5, 5, 5],
            max_score=30
        )
        assert score == 15.0, f"Expected 15.0, got {score}"
    
    # Test #8: Test pass threshold - exactly 75
    def test_pass_threshold_exactly_75(self, scoring_service):
        """Score of exactly 75 should pass."""
        result = scoring_service.determine_result(75.0)
        assert result == "approved"
    
    # Test #9: Test fail threshold - below 75
    def test_fail_threshold_below_75(self, scoring_service):
        """Score below 75 should fail."""
        result = scoring_service.determine_result(74.9)
        assert result == "rejected"
    
    # Test #10: Test red flag penalty calculation
    def test_red_flag_penalty(self, scoring_service):
        """Each red flag should deduct 2 points."""
        # Score of 80 with 3 red flags = 80 - 6 = 74
        adjusted_score, penalty = scoring_service.apply_red_flag_penalty(
            raw_score=80.0,
            red_flags=["flag1", "flag2", "flag3"]
        )
        assert penalty == 6
        assert adjusted_score == 74.0


# ========================================================================
# CATEGORY 3: Red Flag Normalization Tests (4 tests)
# ========================================================================

class TestRedFlagNormalization:
    """Tests for red flag text normalization."""
    
    # Test #11: Test exact flag names pass through
    def test_exact_flag_name(self):
        """Exact standard flag names should pass through unchanged."""
        result = normalize_red_flag("extremely_generic_responses")
        assert result == "extremely_generic_responses"
    
    # Test #12: Test mapping of common variations
    def test_flag_variation_mapping(self):
        """Common variations should map to standard identifiers."""
        test_cases = [
            ("generic_answers", "extremely_generic_responses"),
            ("vague_answers", "extremely_generic_responses"),
            ("no_numbers", "avoiding_numbers"),
            ("never_lost", "no_mistakes_claimed"),
            ("wrong_terminology", "incorrect_terminology"),
        ]
        
        for input_flag, expected in test_cases:
            result = normalize_red_flag(input_flag)
            assert result == expected, f"Input '{input_flag}': expected '{expected}', got '{result}'"
    
    # Test #13: Test case insensitivity
    def test_case_insensitivity(self):
        """Flag normalization should be case insensitive."""
        result = normalize_red_flag("GENERIC_ANSWERS")
        assert result == "extremely_generic_responses"
    
    # Test #14: Test space to underscore conversion
    def test_space_to_underscore(self):
        """Spaces should be converted to underscores."""
        result = normalize_red_flag("generic answers")
        assert result == "extremely_generic_responses"


# ========================================================================
# CATEGORY 4: Score Breakdown Tests (3 tests)
# ========================================================================

class TestScoreBreakdown:
    """Tests for full score breakdown generation."""
    
    @pytest.fixture
    def scoring_service(self):
        with patch('app.services.scoring_service.settings') as mock_settings:
            mock_settings.PASS_SCORE_THRESHOLD = 75.0
            mock_settings.RED_FLAG_PENALTY = 2.0
            return ScoringService()
    
    # Test #15: Test successful candidate score breakdown
    def test_approved_score_breakdown(self, scoring_service):
        """Successful candidate should have result='approved'."""
        phase_scores = {
            "phase1": 8.0,
            "phase2": 24.0,
            "phase3": 16.0,
            "phase4": 20.0,
            "phase5": 12.0,
            "phase6": 8.0
        }  # Total: 88
        
        breakdown = scoring_service.generate_score_breakdown(phase_scores, red_flags=[])
        
        assert breakdown["raw_score"] == 88.0
        assert breakdown["adjusted_score"] == 88.0
        assert breakdown["result"] == "approved"
        assert breakdown["max_possible"] == 100
    
    # Test #16: Test borderline candidate with red flags
    def test_borderline_with_red_flags(self, scoring_service):
        """Borderline candidate failing due to red flags."""
        phase_scores = {
            "phase1": 7.0,
            "phase2": 21.0,
            "phase3": 14.0,
            "phase4": 18.0,
            "phase5": 10.0,
            "phase6": 7.0
        }  # Total: 77
        
        red_flags = ["generic_answers", "avoiding_numbers"]  # -4 points
        
        breakdown = scoring_service.generate_score_breakdown(phase_scores, red_flags)
        
        assert breakdown["raw_score"] == 77.0
        assert breakdown["penalty_applied"] == 4
        assert breakdown["adjusted_score"] == 73.0
        assert breakdown["result"] == "rejected"
    
    # Test #17: Test clear failure scenario
    def test_clear_failure_score_breakdown(self, scoring_service):
        """Clearly failing candidate."""
        phase_scores = {
            "phase1": 3.0,
            "phase2": 15.0,
            "phase3": 10.0,
            "phase4": 12.0,
            "phase5": 7.0,
            "phase6": 3.0
        }  # Total: 50
        
        breakdown = scoring_service.generate_score_breakdown(phase_scores, red_flags=[])
        
        assert breakdown["raw_score"] == 50.0
        assert breakdown["result"] == "rejected"


# ========================================================================
# CATEGORY 5: Edge Cases (3 tests)
# ========================================================================

class TestEdgeCases:
    """Edge cases and error handling tests."""
    
    # Test #18: Test invalid phase number
    def test_invalid_phase_number(self):
        """Accessing invalid phase should raise ValueError."""
        with pytest.raises(ValueError) as exc_info:
            get_phase(7)  # Only 1-6 are valid
        
        assert "Invalid phase number" in str(exc_info.value)
    
    # Test #19: Test empty question scores
    def test_empty_question_scores(self):
        """Empty question scores should return 0."""
        with patch('app.services.scoring_service.settings') as mock_settings:
            mock_settings.PASS_SCORE_THRESHOLD = 75.0
            mock_settings.RED_FLAG_PENALTY = 2.0
            
            scoring = ScoringService()
            score = scoring.calculate_phase_score(1, [], 10)
            assert score == 0.0
    
    # Test #20: Test score floor at zero
    def test_score_floor_at_zero(self):
        """Score should never go below 0 after penalties."""
        with patch('app.services.scoring_service.settings') as mock_settings:
            mock_settings.PASS_SCORE_THRESHOLD = 75.0
            mock_settings.RED_FLAG_PENALTY = 2.0
            
            scoring = ScoringService()
            
            # 10 red flags on a score of 15 = 15 - 20 = should be 0, not -5
            adjusted_score, penalty = scoring.apply_red_flag_penalty(
                raw_score=15.0,
                red_flags=["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10"]
            )
            
            assert adjusted_score == 0.0, f"Score should not go below 0, got {adjusted_score}"


# ========================================================================
# Run Configuration
# ========================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

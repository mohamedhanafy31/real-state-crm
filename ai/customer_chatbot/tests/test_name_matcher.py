import unittest
from unittest.mock import MagicMock, patch
import sys
import os

# Add app to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.name_matcher import NameMatcherService, MatchResult
from app.utils.arabic_utils import normalize_arabic, is_arabic_phonetic
from app.utils.franco_converter import convert_franco_to_english

class TestArabicUtils(unittest.TestCase):
    def test_normalize_arabic(self):
        # Alef variants
        self.assertEqual(normalize_arabic("أحمد"), "احمد")
        self.assertEqual(normalize_arabic("إيمان"), "ايمان")
        self.assertEqual(normalize_arabic("آمال"), "امال")
        
        # Teh Marbuta
        self.assertEqual(normalize_arabic("مدينة"), "مدينه")
        
        # Alef Maksura
        self.assertEqual(normalize_arabic("منى"), "مني")
        
        # Diacritics
        self.assertEqual(normalize_arabic("مُحَمَّد"), "محمد")
        
        # Elongation (Tatweel)
        self.assertEqual(normalize_arabic("مـــصـــر"), "مصر")

    def test_is_arabic_phonetic(self):
        # Likely phonetic (short, single word)
        self.assertTrue(is_arabic_phonetic("هاواباي"))
        self.assertTrue(is_arabic_phonetic("كايرو"))
        
        # Not phonetic (multi-word or common)
        # Note: Ideally we'd check against a dictionary, but the heuristic is simple for now
        self.assertFalse(is_arabic_phonetic("القاهرة الجديدة")) # Multiple words
        self.assertFalse(is_arabic_phonetic("Hello")) # English


class TestNameMatcher(unittest.TestCase):
    def setUp(self):
        # Mock Backend API
        self.mock_backend = MagicMock()
        
        # Mock Settings
        self.mock_settings = MagicMock()
        self.mock_settings.fuzzy_exact_threshold = 0.85
        self.mock_settings.fuzzy_suggest_threshold = 0.60
        
        with patch('app.services.name_matcher.get_backend_api_service', return_value=self.mock_backend), \
             patch('app.services.name_matcher.get_settings', return_value=self.mock_settings):
            self.matcher = NameMatcherService()

    def test_match_area_exact(self):
        # Setup mock data
        self.matcher._areas_cache = [
            {'areaId': 1, 'name': 'New Cairo'},
            {'areaId': 2, 'name': 'Sheikh Zayed'}
        ]
        
        # Test Exact English match
        result = self.matcher.match_area("New Cairo")
        self.assertTrue(result.matched)
        self.assertEqual(result.value, "New Cairo")
        self.assertEqual(result.id, 1)

    def test_match_area_fuzzy(self):
        self.matcher._areas_cache = [
            {'areaId': 1, 'name': 'New Cairo'}
        ]
        
        # Test fuzzy match ("Ciro" instead of "Cairo")
        result = self.matcher.match_area("New Ciro")
        self.assertTrue(result.matched)
        self.assertEqual(result.value, "New Cairo")

    def test_match_project_filtered_by_area(self):
        # All projects
        self.matcher._projects_cache = [
            {'projectId': 1, 'name': 'Hyde Park', 'area': {'areaId': 1, 'name': 'New Cairo'}},
            {'projectId': 2, 'name': 'Zed Towers', 'area': {'areaId': 2, 'name': 'Sheikh Zayed'}}
        ]
        
        # User asks for "Zed" but filters by "New Cairo" (ID 1)
        # Should NOT match Zed Towers if strict, but let's see logic.
        # The logic validates the project name first. 
        # Then filters alternatives.
        # But wait, match_project doesn't enforce area match on the *primary* match if name score is high,
        # unless we explicitly check area_id in the returned project.
        # Let's check logic in NameMatcherService.match_project:
        # It finds a match in _projects_cache. 
        # It doesn't check if that match belongs to the area_id passed in match_project args immediately for *exclusion*,
        # BUT it filters *alternatives*.
        # Let's verify this behavior.
        
        result = self.matcher.match_project("Zed Towers", area_id=1) 
        # Zed Towers is in Sheikh Zayed (ID 2).
        # Depending on requirements, we might want to warn user match is outside area.
        # Current implementation just matches name.
        self.assertTrue(result.matched)
        self.assertEqual(result.value, "Zed Towers")

    @patch('app.services.name_matcher.convert_franco_to_english')
    def test_match_franco_arabic(self, mock_converter):
        # Setup mock
        mock_converter.return_value = "hyde park"
        self.matcher._projects_cache = [
            {'projectId': 1, 'name': 'Hyde Park'}
        ]
        
        # User types "هايد بارك" or "هايدبارك" (normalized)
        # If input is phonetic "هايدبارك"
        with patch('app.services.name_matcher.is_arabic_phonetic', return_value=True):
            result = self.matcher.match_project("هايدبارك")
            
            self.assertTrue(result.matched)
            self.assertEqual(result.value, "Hyde Park")

if __name__ == '__main__':
    unittest.main()

#!/usr/bin/env python3
"""
Comprehensive unit tests for intent refinement logic.

Tests the refine_intent function with 20+ test cases covering:
- Pure single-word confirmations
- Multi-word Arabic confirmations
- Mixed Arabic/English confirmations
- Data + confirmation combinations
- Rejection scenarios
- Cancel scenarios
- Edge cases from production logs

This is a standalone test that copies the refine_intent logic
to avoid import dependencies on database modules.
"""

import sys


def refine_intent(raw_intent: str, state: dict) -> str:
    """Local copy of refine_intent for testing purposes.
    
    Must match the logic in app/graph/nodes.py
    """
    msg = state.get("user_message", "").lower()
    
    # Confirmation phase rules
    in_confirmation_phase = state.get("awaiting_confirmation") or (state.get("is_complete") and not state.get("confirmed"))

    if in_confirmation_phase:
        confirm_words = ["تمام", "ok", "اه", "نعم", "صح", "ماشي", "اكيد", "موافق", "تأكيد", "اوك", "tmam", "aywa", "👍", "مظبوط", "كدة", "كده", "اوكي", "حاضر"]
        cancel_words = ["خلاص", "مش عايز", "الغي", "إلغاء", "ابدأ من جديد", "cancel"]
        reject_words = ["غلط", "عدل", "غير", "لأ", "لأه", "no"]
        
        # Priority 1: Check cancel first
        if any(w in msg for w in cancel_words):
            return "cancel"

        # Check if message is DATA (name/phone) vs pure confirmation
        is_reject = any(w in msg for w in reject_words)
        if not is_reject:
            msg_words = state.get("user_message", "").split()
            has_confirm_word = any(w.lower() in confirm_words for w in msg_words)
            
            # FIXED: If message has confirm word AND is short (<=5 words), it's confirmation
            if has_confirm_word and len(msg_words) <= 5:
                if raw_intent not in ["inquiry", "new_search"]:
                    return "confirm"
            
            # If message is long (>5 words) AND has non-confirm content, might be data
            elif len(msg_words) > 5:
                non_confirm_words = [w for w in msg_words if w.lower() not in confirm_words]
                if len(non_confirm_words) >= 3:
                    return "update_requirements"
        
        if raw_intent in ["follow_up", "unknown", "greeting"]:
            if any(w in msg for w in confirm_words):
                return "confirm"
    
    return raw_intent


# ============================================================================
# TEST CASES: Pure Single-Word Confirmations
# ============================================================================

def test_confirm_tamam():
    """تمام - single word confirmation"""
    state = {"user_message": "تمام", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    assert refine_intent("confirm", state) == "confirm"
    assert refine_intent("unknown", state) == "confirm"

def test_confirm_ok():
    """ok - English confirmation"""
    state = {"user_message": "ok", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    assert refine_intent("unknown", state) == "confirm"

def test_confirm_aywa():
    """اه - Arabic yes"""
    state = {"user_message": "اه", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    assert refine_intent("greeting", state) == "confirm"

def test_confirm_naam():
    """نعم - Formal Arabic yes"""
    state = {"user_message": "نعم", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    assert refine_intent("follow_up", state) == "confirm"

def test_confirm_mashi():
    """ماشي - Arabic okay"""
    state = {"user_message": "ماشي", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    assert refine_intent("unknown", state) == "confirm"

def test_confirm_emoji():
    """👍 - Thumbs up emoji"""
    state = {"user_message": "👍", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    assert refine_intent("unknown", state) == "confirm"


# ============================================================================
# TEST CASES: Multi-Word Arabic Confirmations (THE BUG CASES)
# ============================================================================

def test_confirm_ah_tamam_keda_mazbout():
    """اه تمام كدة مظبوط - This was the actual bug from logs!"""
    state = {"user_message": "اه تمام كدة مظبوط", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("confirm", state)
    assert result == "confirm", f"Expected 'confirm' but got '{result}'"

def test_confirm_tamam_keda():
    """تمام كده - 2 word confirmation"""
    state = {"user_message": "تمام كده", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    assert refine_intent("unknown", state) == "confirm"

def test_confirm_ah_keda_tamam():
    """اه كده تمام - 3 word confirmation"""
    state = {"user_message": "اه كده تمام", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    assert refine_intent("unknown", state) == "confirm"

def test_confirm_akeed_mazbout():
    """اكيد مظبوط - 2 word confirmation"""
    state = {"user_message": "اكيد مظبوط", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    assert refine_intent("update_requirements", state) == "confirm"

def test_confirm_5_words():
    """5 word confirmation should still work"""
    state = {"user_message": "اه تمام كده صح مظبوط", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    assert refine_intent("unknown", state) == "confirm"


# ============================================================================
# TEST CASES: Mixed Arabic/English
# ============================================================================

def test_confirm_ok_tamam():
    """ok تمام - Mixed"""
    state = {"user_message": "ok تمام", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    assert refine_intent("unknown", state) == "confirm"

def test_confirm_yes_mazbout():
    """yes مظبوط - Mixed"""
    state = {"user_message": "yes مظبوط", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    assert refine_intent("greeting", state) == "confirm"


# ============================================================================
# TEST CASES: Data + Confirmation (should be update_requirements)
# ============================================================================

def test_data_name_phone_confirm():
    """Long message with name/phone should be update_requirements"""
    state = {"user_message": "اسمي محمد احمد علي ورقم تليفوني 01012345678 تمام كده", 
             "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("confirm", state)
    assert result == "update_requirements", f"Expected 'update_requirements' but got '{result}'"

def test_data_name_only():
    """Name with confirmation (6 words)"""
    state = {"user_message": "اسمي محمد احمد وده رقمي تمام", 
             "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("confirm", state)
    assert result == "update_requirements"

def test_data_phone_number():
    """Phone number with confirmation (long)"""
    state = {"user_message": "رقم تليفوني هو 01234567890 تمام كده", 
             "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("confirm", state)
    assert result == "update_requirements"


# ============================================================================
# TEST CASES: Rejection Scenarios
# ============================================================================

def test_reject_ghalat():
    """غلط - Wrong/Incorrect"""
    state = {"user_message": "غلط", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("edit", state)
    assert result != "confirm", "Should not confirm when rejecting"

def test_reject_la():
    """لأ - No"""
    state = {"user_message": "لأ", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("edit", state)
    assert result != "confirm"

def test_reject_no_english():
    """no - English rejection"""
    state = {"user_message": "no", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("edit", state)
    assert result != "confirm"


# ============================================================================
# TEST CASES: Cancel Scenarios
# ============================================================================

def test_cancel_khalas():
    """خلاص - Cancel"""
    state = {"user_message": "خلاص", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    assert refine_intent("confirm", state) == "cancel"

def test_cancel_mesh_ayez():
    """مش عايز - Don't want"""
    state = {"user_message": "مش عايز", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    assert refine_intent("confirm", state) == "cancel"

def test_cancel_english():
    """cancel - English cancel"""
    state = {"user_message": "cancel", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    assert refine_intent("confirm", state) == "cancel"


# ============================================================================
# TEST CASES: Edge Cases
# ============================================================================

def test_not_in_confirmation_phase():
    """Outside confirmation phase should not override"""
    state = {"user_message": "تمام شكرا", "is_complete": False, "confirmed": False, "awaiting_confirmation": False}
    result = refine_intent("unknown", state)
    assert result == "unknown"

def test_inquiry_not_overridden():
    """Inquiry intent should not be overridden to confirm"""
    state = {"user_message": "تمام", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("inquiry", state)
    assert result == "inquiry", "inquiry should not be overridden"

def test_new_search_not_overridden():
    """new_search intent should not be overridden to confirm"""
    state = {"user_message": "اه تمام", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("new_search", state)
    assert result == "new_search", "new_search should not be overridden"

def test_already_confirmed():
    """When already confirmed, should not re-confirm"""
    state = {"user_message": "تمام", "is_complete": True, "confirmed": True, "awaiting_confirmation": False}
    result = refine_intent("unknown", state)
    assert result == "unknown", "Should not confirm if already confirmed"


# ============================================================================
# COMPLEX & HARD TEST CASES (20 additional edge cases)
# ============================================================================

# --- Franco-Arabic (Arabizi) Cases ---

def test_franco_tmam():
    """tmam - Franco Arabic confirmation"""
    state = {"user_message": "tmam", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    assert refine_intent("unknown", state) == "confirm"

def test_franco_aywa():
    """aywa - Franco Arabic yes"""
    state = {"user_message": "aywa", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    assert refine_intent("unknown", state) == "confirm"

def test_franco_mixed_tmam_keda():
    """tmam keda - Franco + Arabic"""
    state = {"user_message": "tmam كده", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    assert refine_intent("follow_up", state) == "confirm"


# --- Typos and Variations ---

def test_confirm_with_typo_tamaam():
    """تمااام - Extended vowel (common in chat)"""
    state = {"user_message": "تمااام", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    # This won't match exactly - should fall through to raw_intent
    result = refine_intent("confirm", state)
    # LLM detected confirm, no reject words, so should stay confirm
    assert result == "confirm"

def test_confirm_okayyy():
    """okayyyy - Extended spelling"""
    state = {"user_message": "okayyyy", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("confirm", state)
    assert result == "confirm"  # LLM said confirm, no override needed


# --- Special Characters and Punctuation ---

def test_confirm_with_exclamation():
    """تمام! - With exclamation"""
    state = {"user_message": "تمام!", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    # Word includes punctuation, might not match. But LLM said confirm
    result = refine_intent("confirm", state)
    assert result == "confirm"

def test_confirm_with_question_mark():
    """تمام؟ - With Arabic question mark (ambiguous)"""
    state = {"user_message": "تمام؟", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("unknown", state)
    # Has confirm word even with punctuation attached
    assert result == "confirm"

def test_confirm_multiple_emojis():
    """👍👍👍 - Multiple emojis"""
    state = {"user_message": "👍👍👍", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("unknown", state)
    assert result == "confirm"


# --- Boundary Cases (exactly at thresholds) ---

def test_exactly_5_words_with_confirm():
    """Exactly 5 words with confirm word - should be confirm"""
    state = {"user_message": "اه صح كده تمام بالظبط", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("unknown", state)
    assert result == "confirm", "5 words should be treated as confirmation"

def test_exactly_6_words_boundary():
    """Exactly 6 words - crosses threshold but only 2 non-confirm words"""
    state = {"user_message": "اه تمام كده مظبوط صح ok", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("confirm", state)
    # 6 words, but most are confirm words. non_confirm_words < 3, stays as LLM intent
    assert result == "confirm"

def test_exactly_6_words_with_data():
    """6 words with substantial non-confirm content"""
    state = {"user_message": "اسمي محمد علي تمام كده الحمدلله", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("confirm", state)
    # 6 words, 4 non-confirm words >= 3 threshold
    assert result == "update_requirements"


# --- Ambiguous Messages ---

def test_ambiguous_thanks_confirm():
    """شكرا تمام - Thanks + confirm (should be confirm)"""
    state = {"user_message": "شكرا تمام", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("unknown", state)
    assert result == "confirm"  # Has confirm word, short message

def test_ambiguous_inshallah_confirm():
    """ان شاء الله تمام - Inshallah + confirm (3 words)"""
    state = {"user_message": "ان شاء الله تمام", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("unknown", state)
    assert result == "confirm"  # 4 words with confirm word

def test_ambiguous_habibi_tamam():
    """حبيبي تمام - Term of endearment + confirm"""
    state = {"user_message": "حبيبي تمام", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("unknown", state) 
    assert result == "confirm"

def test_ambiguous_rejection_with_thanks():
    """لأ شكرا - No + thanks (polite rejection)"""
    state = {"user_message": "لأ شكرا", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("edit", state)
    assert result != "confirm", "Polite rejection should not confirm"


# --- Mixed Intent Signals ---

def test_mixed_confirm_and_question():
    """تمام بس ممكن اسأل سؤال - Confirm but with question (5 words)"""
    state = {"user_message": "تمام بس ممكن اسأل سؤال", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("inquiry", state)
    # LLM detected inquiry, should NOT be overridden
    assert result == "inquiry"

def test_mixed_confirm_edit():
    """تمام بس غير المنطقة - Confirm but with edit request"""
    state = {"user_message": "تمام بس غير المنطقة", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("edit", state)
    # Has reject word غير - should not confirm
    assert result != "confirm"


# --- Real Production Edge Cases ---

def test_production_case_just_done():
    """خلاص تمام - Cancel word takes priority over confirm"""
    state = {"user_message": "خلاص تمام", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("confirm", state)
    assert result == "cancel", "Cancel word should take priority"

def test_production_case_start_over():
    """ابدأ من جديد - Start over (cancel)"""
    state = {"user_message": "ابدأ من جديد", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("confirm", state)
    assert result == "cancel"

def test_production_case_complex_address():
    """Long address with confirmation"""
    state = {"user_message": "عنواني شارع التحرير عمارة رقم 15 شقة 4 تمام كده", 
             "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("confirm", state)
    # 9 words, many non-confirm words -> should be update_requirements
    assert result == "update_requirements"

def test_production_case_email():
    """Email with confirmation (needs 6+ words)"""
    state = {"user_message": "ايميلي الشخصي هو mohamed@gmail.com تمام كده", 
             "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("confirm", state)
    # 6 words with data
    assert result == "update_requirements"


# --- State Combinations ---

def test_complete_but_no_awaiting():
    """is_complete=True but awaiting_confirmation=False (edge)"""
    state = {"user_message": "تمام", "is_complete": True, "confirmed": False, "awaiting_confirmation": False}
    result = refine_intent("unknown", state)
    # in_confirmation_phase = True (is_complete and not confirmed)
    assert result == "confirm"

def test_not_complete_and_awaiting():
    """is_complete=False but awaiting_confirmation=True"""
    state = {"user_message": "تمام", "is_complete": False, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("unknown", state)
    # in_confirmation_phase = True (awaiting_confirmation)
    assert result == "confirm"

def test_empty_message():
    """Empty message should not crash"""
    state = {"user_message": "", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("unknown", state)
    assert result == "unknown"  # No words, no override

def test_whitespace_only():
    """Whitespace only message"""
    state = {"user_message": "   ", "is_complete": True, "confirmed": False, "awaiting_confirmation": True}
    result = refine_intent("unknown", state)
    assert result == "unknown"


# ============================================================================
# TEST RUNNER
# ============================================================================

def run_tests():
    """Run all tests and report results."""
    tests = [
        # Pure single-word confirmations (6)
        test_confirm_tamam,
        test_confirm_ok,
        test_confirm_aywa,
        test_confirm_naam,
        test_confirm_mashi,
        test_confirm_emoji,
        
        # Multi-word Arabic confirmations - THE BUG CASES (5)
        test_confirm_ah_tamam_keda_mazbout,
        test_confirm_tamam_keda,
        test_confirm_ah_keda_tamam,
        test_confirm_akeed_mazbout,
        test_confirm_5_words,
        
        # Mixed Arabic/English (2)
        test_confirm_ok_tamam,
        test_confirm_yes_mazbout,
        
        # Data + Confirmation (3)
        test_data_name_phone_confirm,
        test_data_name_only,
        test_data_phone_number,
        
        # Rejection (3)
        test_reject_ghalat,
        test_reject_la,
        test_reject_no_english,
        
        # Cancel (3)
        test_cancel_khalas,
        test_cancel_mesh_ayez,
        test_cancel_english,
        
        # Edge cases (4)
        test_not_in_confirmation_phase,
        test_inquiry_not_overridden,
        test_new_search_not_overridden,
        test_already_confirmed,
        
        # ============ COMPLEX & HARD TEST CASES (20) ============
        
        # Franco-Arabic (3)
        test_franco_tmam,
        test_franco_aywa,
        test_franco_mixed_tmam_keda,
        
        # Typos and Variations (2)
        test_confirm_with_typo_tamaam,
        test_confirm_okayyy,
        
        # Special Characters (3)
        test_confirm_with_exclamation,
        test_confirm_with_question_mark,
        test_confirm_multiple_emojis,
        
        # Boundary Cases (3)
        test_exactly_5_words_with_confirm,
        test_exactly_6_words_boundary,
        test_exactly_6_words_with_data,
        
        # Ambiguous Messages (4)
        test_ambiguous_thanks_confirm,
        test_ambiguous_inshallah_confirm,
        test_ambiguous_habibi_tamam,
        test_ambiguous_rejection_with_thanks,
        
        # Mixed Intent Signals (2)
        test_mixed_confirm_and_question,
        test_mixed_confirm_edit,
        
        # Production Edge Cases (4)
        test_production_case_just_done,
        test_production_case_start_over,
        test_production_case_complex_address,
        test_production_case_email,
        
        # State Combinations (4)
        test_complete_but_no_awaiting,
        test_not_complete_and_awaiting,
        test_empty_message,
        test_whitespace_only,
    ]
    
    passed = 0
    failed = 0
    
    print("=" * 60)
    print("🧪 Customer Chatbot Intent Refinement Tests")
    print("=" * 60)
    
    for test in tests:
        try:
            test()
            print(f"✅ PASS: {test.__name__}")
            passed += 1
        except AssertionError as e:
            print(f"❌ FAIL: {test.__name__} - {e}")
            failed += 1
        except Exception as e:
            print(f"💥 ERROR: {test.__name__} - {e}")
            failed += 1
    
    print("=" * 60)
    print(f"📊 Results: {passed} passed, {failed} failed out of {len(tests)} tests")
    print("=" * 60)
    
    return failed == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)

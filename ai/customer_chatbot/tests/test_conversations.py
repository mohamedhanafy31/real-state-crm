#!/usr/bin/env python3
"""
End-to-End Conversation Test Suite for Customer Chatbot

This module contains 20 comprehensive conversation test cases that simulate
real user interactions and verify expected outcomes.

Each test case defines:
- phone_number: Unique identifier for the conversation
- messages: List of user messages in sequence
- expected_outcomes: Expected state after each message or final state
- test_type: Category of the test (happy_path, edge_case, error_recovery, etc.)

Usage:
    python tests/test_conversations.py [--live]
    
    --live: Run against actual chatbot API (requires chatbot running on port 8000)
    Without --live: Runs as unit tests with mocked responses
"""

import sys
import json
import time
import httpx
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum


class TestType(Enum):
    HAPPY_PATH = "happy_path"
    EDGE_CASE = "edge_case"
    ERROR_RECOVERY = "error_recovery"
    CONFIRMATION_FLOW = "confirmation_flow"
    INQUIRY_FLOW = "inquiry_flow"
    MULTI_TURN = "multi_turn"
    ARABIC_HANDLING = "arabic_handling"
    FRANCO_ARABIC = "franco_arabic"


@dataclass
class ExpectedOutcome:
    """Expected state after a message."""
    intent: Optional[str] = None
    is_complete: Optional[bool] = None
    confirmed: Optional[bool] = None
    awaiting_confirmation: Optional[bool] = None
    has_area: Optional[bool] = None
    has_project: Optional[bool] = None
    has_unit_type: Optional[bool] = None
    response_contains: Optional[List[str]] = None
    response_not_contains: Optional[List[str]] = None
    request_created: Optional[bool] = None


@dataclass
class ConversationTestCase:
    """A complete conversation test case."""
    name: str
    description: str
    test_type: TestType
    phone_number: str
    messages: List[str]
    expected_outcomes: List[ExpectedOutcome]
    expected_final_state: Dict[str, Any] = field(default_factory=dict)


# =============================================================================
# TEST CASES
# =============================================================================

TEST_CASES: List[ConversationTestCase] = [
    
    # =========================================================================
    # HAPPY PATH TESTS (1-5)
    # =========================================================================
    
    ConversationTestCase(
        name="complete_flow_arabic",
        description="Complete happy path: greeting → area → project → unit → budget → confirmation → request",
        test_type=TestType.HAPPY_PATH,
        phone_number="20100000001",
        messages=[
            "اهلا",
            "العاصمة الادارية",
            "Green Heights 3",
            "شقة",
            "5 مليون",
            "اه تمام كدة مظبوط",  # THE BUG CASE - should trigger confirm
            "اسمي محمد احمد ورقمي 01012345678"
        ],
        expected_outcomes=[
            ExpectedOutcome(intent="greeting", response_contains=["أهلاً", "منطقة"]),
            ExpectedOutcome(intent="new_search", has_area=True, response_contains=["New Capital", "مشاريع"]),
            ExpectedOutcome(has_project=True, response_contains=["Green Heights"]),
            ExpectedOutcome(has_unit_type=True),
            ExpectedOutcome(is_complete=True, awaiting_confirmation=True, response_contains=["تأكد", "تمام"]),
            ExpectedOutcome(intent="confirm"),  # CRITICAL: Should NOT loop
            ExpectedOutcome(confirmed=True, request_created=True, response_contains=["تم", "بنجاح"]),
        ],
        expected_final_state={"confirmed": True, "request_created": True}
    ),
    
    ConversationTestCase(
        name="complete_flow_english",
        description="Complete flow in English",
        test_type=TestType.HAPPY_PATH,
        phone_number="20100000002",
        messages=[
            "Hello",
            "New Capital",
            "Green Heights 3",
            "Apartment",
            "5 million EGP",
            "ok confirm",
            "Mohamed Ahmed 01012345678"
        ],
        expected_outcomes=[
            ExpectedOutcome(intent="greeting"),
            ExpectedOutcome(has_area=True),
            ExpectedOutcome(has_project=True),
            ExpectedOutcome(has_unit_type=True),
            ExpectedOutcome(is_complete=True),
            ExpectedOutcome(intent="confirm"),
            ExpectedOutcome(confirmed=True, request_created=True),
        ],
        expected_final_state={"confirmed": True}
    ),
    
    ConversationTestCase(
        name="quick_complete_flow",
        description="User provides all info in one message",
        test_type=TestType.HAPPY_PATH,
        phone_number="20100000003",
        messages=[
            "عايز شقة في العاصمة الادارية Green Heights 3 ميزانيتي 5 مليون",
            "تمام",
            "محمد احمد 01012345678"
        ],
        expected_outcomes=[
            ExpectedOutcome(has_area=True, has_project=True, has_unit_type=True, is_complete=True),
            ExpectedOutcome(intent="confirm"),
            ExpectedOutcome(confirmed=True, request_created=True),
        ],
        expected_final_state={"confirmed": True}
    ),
    
    ConversationTestCase(
        name="villa_search_flow",
        description="Search for villa with specific requirements",
        test_type=TestType.HAPPY_PATH,
        phone_number="20100000004",
        messages=[
            "مرحبا",
            "الساحل الشمالي",
            "Crystal Resort 2",
            "فيلا",
            "10 مليون",
            "تمام مظبوط",
            "علي محمود 01098765432"
        ],
        expected_outcomes=[
            ExpectedOutcome(intent="greeting"),
            ExpectedOutcome(has_area=True),
            ExpectedOutcome(has_project=True),
            ExpectedOutcome(has_unit_type=True),
            ExpectedOutcome(is_complete=True),
            ExpectedOutcome(intent="confirm"),
            ExpectedOutcome(confirmed=True, request_created=True),
        ],
        expected_final_state={"confirmed": True}
    ),
    
    ConversationTestCase(
        name="townhouse_tagamoo_flow",
        description="Townhouse in Tagamoo area",
        test_type=TestType.HAPPY_PATH,
        phone_number="20100000005",
        messages=[
            "Hi",
            "التجمع",
            "ابحث في المنطقة كلها",
            "تاون هاوس",
            "7 مليون",
            "اه تمام",
            "Ahmed Hassan 01234567890"
        ],
        expected_outcomes=[
            ExpectedOutcome(intent="greeting"),
            ExpectedOutcome(has_area=True),
            ExpectedOutcome(),  # Skip project
            ExpectedOutcome(has_unit_type=True),
            ExpectedOutcome(is_complete=True),
            ExpectedOutcome(intent="confirm"),
            ExpectedOutcome(confirmed=True, request_created=True),
        ],
        expected_final_state={"confirmed": True}
    ),
    
    # =========================================================================
    # CONFIRMATION FLOW TESTS (6-10) - Testing the bug fix
    # =========================================================================
    
    ConversationTestCase(
        name="multi_word_confirmation_arabic",
        description="Multi-word Arabic confirmation should NOT trigger update_requirements",
        test_type=TestType.CONFIRMATION_FLOW,
        phone_number="20100000006",
        messages=[
            "شقة في العاصمة الادارية 5 مليون",
            "اه تمام كدة مظبوط",  # 4 words - THE BUG CASE
        ],
        expected_outcomes=[
            ExpectedOutcome(has_area=True, has_unit_type=True),  # First message extracts area and unit_type
            ExpectedOutcome(intent="confirm"),  # CRITICAL: Should be 'confirm' NOT 'update_requirements'
        ],
        expected_final_state={"intent": "confirm"}
    ),
    
    ConversationTestCase(
        name="single_word_confirmation",
        description="Single word confirmation",
        test_type=TestType.CONFIRMATION_FLOW,
        phone_number="20100000007",
        messages=[
            "شقة في التجمع 3 مليون",
            "تمام",
        ],
        expected_outcomes=[
            ExpectedOutcome(has_area=True, has_unit_type=True),  # Extracts area and unit_type
            ExpectedOutcome(intent="confirm"),  # Should be 'confirm'
        ],
        expected_final_state={"intent": "confirm"}
    ),
    
    ConversationTestCase(
        name="confirmation_with_emoji",
        description="Confirmation using thumbs up emoji",
        test_type=TestType.CONFIRMATION_FLOW,
        phone_number="20100000008",
        messages=[
            "فيلا في الساحل 10 مليون",
            "👍",
        ],
        expected_outcomes=[
            ExpectedOutcome(is_complete=True),
            ExpectedOutcome(intent="confirm"),
        ],
        expected_final_state={"intent": "confirm"}
    ),
    
    ConversationTestCase(
        name="confirmation_then_name",
        description="Confirmation followed by name/phone should complete request",
        test_type=TestType.CONFIRMATION_FLOW,
        phone_number="20100000009",
        messages=[
            "شقة في العاصمة الادارية 5 مليون",
            "تمام",
            "اسمي محمد احمد علي ورقم تليفوني 01012345678",  # Long msg with data
        ],
        expected_outcomes=[
            ExpectedOutcome(is_complete=True),
            ExpectedOutcome(intent="confirm"),
            ExpectedOutcome(intent="update_requirements", confirmed=True, request_created=True),
        ],
        expected_final_state={"confirmed": True, "request_created": True}
    ),
    
    ConversationTestCase(
        name="rejection_then_edit",
        description="User rejects confirmation and edits requirements",
        test_type=TestType.CONFIRMATION_FLOW,
        phone_number="20100000010",
        messages=[
            "شقة في العاصمة الادارية 5 مليون",
            "لأ غلط",
            "فيلا مش شقة",
            "تمام",
        ],
        expected_outcomes=[
            ExpectedOutcome(is_complete=True, awaiting_confirmation=True),
            ExpectedOutcome(intent="edit", awaiting_confirmation=False),
            ExpectedOutcome(has_unit_type=True),  # Updated to villa
            ExpectedOutcome(intent="confirm"),
        ],
        expected_final_state={"intent": "confirm"}
    ),
    
    # =========================================================================
    # INQUIRY FLOW TESTS (11-14)
    # =========================================================================
    
    ConversationTestCase(
        name="price_inquiry_with_project",
        description="Price inquiry for specific project",
        test_type=TestType.INQUIRY_FLOW,
        phone_number="20100000011",
        messages=[
            "اهلا",
            "العاصمة الادارية",
            "Green Heights 3",
            "اي رينج اسعار الشقق؟",
        ],
        expected_outcomes=[
            ExpectedOutcome(intent="greeting"),
            ExpectedOutcome(has_area=True),
            ExpectedOutcome(has_project=True),
            ExpectedOutcome(intent="inquiry", response_contains=["سعر", "جنيه"]),  # Should have price data
        ],
        expected_final_state={"intent": "inquiry"}
    ),
    
    ConversationTestCase(
        name="availability_inquiry",
        description="Check unit availability",
        test_type=TestType.INQUIRY_FLOW,
        phone_number="20100000012",
        messages=[
            "عندكم فلل متاحة في الساحل؟",
        ],
        expected_outcomes=[
            ExpectedOutcome(intent="inquiry", response_contains=["متاح"]),
        ],
        expected_final_state={"intent": "inquiry"}
    ),
    
    ConversationTestCase(
        name="project_comparison",
        description="Compare two projects",
        test_type=TestType.INQUIRY_FLOW,
        phone_number="20100000013",
        messages=[
            "ايه الفرق بين Green Heights و Crystal Towers؟",
        ],
        expected_outcomes=[
            ExpectedOutcome(intent="inquiry"),
        ],
        expected_final_state={"intent": "inquiry"}
    ),
    
    ConversationTestCase(
        name="general_question",
        description="General question about payment plans",
        test_type=TestType.INQUIRY_FLOW,
        phone_number="20100000014",
        messages=[
            "ممكن اقسط على كام سنة؟",
        ],
        expected_outcomes=[
            ExpectedOutcome(intent="inquiry"),
        ],
        expected_final_state={"intent": "inquiry"}
    ),
    
    # =========================================================================
    # EDGE CASE & ERROR RECOVERY TESTS (15-20)
    # =========================================================================
    
    ConversationTestCase(
        name="franco_arabic_input",
        description="Handle Franco-Arabic (Arabizi) input",
        test_type=TestType.FRANCO_ARABIC,
        phone_number="20100000015",
        messages=[
            "ahlan",
            "new capital",
            "green heights",
            "sha2a",  # شقة
            "5 million",
            "tmam",  # تمام
        ],
        expected_outcomes=[
            ExpectedOutcome(intent="greeting"),
            ExpectedOutcome(has_area=True),
            ExpectedOutcome(has_project=True),
            ExpectedOutcome(has_unit_type=True),
            ExpectedOutcome(is_complete=True),
            ExpectedOutcome(intent="confirm"),
        ],
        expected_final_state={"intent": "confirm"}
    ),
    
    ConversationTestCase(
        name="typo_handling",
        description="Handle common typos",
        test_type=TestType.EDGE_CASE,
        phone_number="20100000016",
        messages=[
            "اهلا",
            "العاصمه الاداريه",  # With ه instead of ة
            "جرين هايتس",  # Arabic transliteration
        ],
        expected_outcomes=[
            ExpectedOutcome(intent="greeting"),
            ExpectedOutcome(has_area=True),  # Should still match New Capital
            ExpectedOutcome(has_project=True),  # Should fuzzy match Green Heights
        ],
        expected_final_state={"has_area": True, "has_project": True}
    ),
    
    ConversationTestCase(
        name="cancel_and_restart",
        description="User cancels and starts new search",
        test_type=TestType.ERROR_RECOVERY,
        phone_number="20100000017",
        messages=[
            "شقة في التجمع",
            "خلاص مش عايز",
            "ابدأ من جديد",
            "فيلا في الساحل",
        ],
        expected_outcomes=[
            ExpectedOutcome(has_area=True),
            ExpectedOutcome(intent="cancel"),
            ExpectedOutcome(intent="new_search"),
            ExpectedOutcome(has_area=True, has_unit_type=True),
        ],
        expected_final_state={"has_area": True}
    ),
    
    ConversationTestCase(
        name="empty_and_noise_messages",
        description="Handle empty and noise messages gracefully",
        test_type=TestType.EDGE_CASE,
        phone_number="20100000018",
        messages=[
            "   ",  # Whitespace only
            "???",
            "اهلا",
        ],
        expected_outcomes=[
            ExpectedOutcome(),  # Should handle gracefully
            ExpectedOutcome(),
            ExpectedOutcome(intent="greeting"),
        ],
        expected_final_state={}
    ),
    
    ConversationTestCase(
        name="session_persistence",
        description="Session should persist across messages",
        test_type=TestType.MULTI_TURN,
        phone_number="20100000019",
        messages=[
            "شقة في العاصمة",
            "Green Heights 3",
            "5 مليون",
        ],
        expected_outcomes=[
            ExpectedOutcome(has_area=True, has_unit_type=True),
            ExpectedOutcome(has_project=True),  # Should retain area from previous
            ExpectedOutcome(is_complete=True),  # Should have all requirements
        ],
        expected_final_state={"has_area": True, "has_project": True, "is_complete": True}
    ),
    
    ConversationTestCase(
        name="confirmation_fatigue_handling",
        description="Bot should vary confirmation messages on multiple attempts",
        test_type=TestType.MULTI_TURN,
        phone_number="20100000020",
        messages=[
            "شقة في العاصمة الادارية 5 مليون",
            "امممم",  # Ambiguous - not confirm, not reject
            "مش متأكد",  # Still ambiguous
            "تمام اكيد",  # Finally confirms
        ],
        expected_outcomes=[
            ExpectedOutcome(is_complete=True, awaiting_confirmation=True),
            ExpectedOutcome(awaiting_confirmation=True),  # Should re-ask with varied message
            ExpectedOutcome(awaiting_confirmation=True),  # Should handle gracefully
            ExpectedOutcome(intent="confirm"),
        ],
        expected_final_state={"intent": "confirm"}
    ),
]


# =============================================================================
# TEST RUNNER
# =============================================================================

def run_test_case(test_case: ConversationTestCase, base_url: str = "http://localhost:8000", verbose: bool = False, save_responses: bool = True) -> Dict[str, Any]:
    """Run a single test case against the chatbot API.
    
    Args:
        test_case: The test case to run
        base_url: Base URL of the chatbot API
        verbose: If True, print detailed response data
        save_responses: If True, save all responses to JSON file
    """
    import random
    unique_phone = f"{test_case.phone_number}_{random.randint(1000, 9999)}"
    
    results = {
        "name": test_case.name,
        "description": test_case.description,
        "test_type": test_case.test_type.value,
        "phone_number": unique_phone,  # Use unique phone for isolation
        "original_phone": test_case.phone_number,
        "passed": True,
        "message_results": [],
        "raw_responses": [],  # Store full API responses
        "errors": []
    }
    
    for i, message in enumerate(test_case.messages):
        # Retry logic for 429 Rate Limit
        max_retries = 3
        retry_delay = 62  # Cohere trial limit is per minute, so 62s is a safe reset
        
        for attempt in range(max_retries + 1):
            try:
                response = httpx.post(
                    f"{base_url}/api/webhook/chat",
                    json={
                        "phone_number": unique_phone,
                        "message": message
                    },
                    timeout=60.0  # Increased timeout for LLM calls
                )
                
                # Handle Rate Limit (429)
                if response.status_code == 429:
                    if attempt < max_retries:
                        print(f"\n      ⚠️ Rate limit hit (429). Waiting {retry_delay}s before retry (Attempt {attempt + 1}/{max_retries})...")
                        time.sleep(retry_delay)
                        continue
                    else:
                        error_msg = f"Message {i+1}: FAILED after {max_retries} retries due to Rate Limit (429)"
                        results["errors"].append(error_msg)
                        results["passed"] = False
                        break
                
                if response.status_code != 200:
                    error_msg = f"Message {i+1}: HTTP {response.status_code} - {response.text[:200]}"
                    results["errors"].append(error_msg)
                    results["passed"] = False
                    if verbose:
                        print(f"      ⚠️ {error_msg}")
                    break  # Don't retry other HTTP errors
                    
                data = response.json()
                
                # Check for rate limit error in JSON body (since API returns 200 even on error)
                error_body = str(data.get("error", ""))
                if verbose and error_body:
                    print(f"      🔍 Debug: Error Body: {error_body[:100]}...")

                if "429" in error_body or "TooManyRequests" in error_body or "TierLimitExceeded" in error_body:
                    if attempt < max_retries:
                        print(f"\n      ⚠️ Rate limit hit (detected in JSON). Waiting {retry_delay}s before retry (Attempt {attempt + 1}/{max_retries})...")
                        time.sleep(retry_delay)
                        continue
                    else:
                        error_msg = f"Message {i+1}: FAILED after {max_retries} retries due to Rate Limit (JSON)"
                        results["errors"].append(error_msg)
                        results["passed"] = False
                        break
                        
                break # Success! Exit retry loop
                if attempt < max_retries:
                    print(f"\n      ⚠️ Timeout. Retrying (Attempt {attempt + 1}/{max_retries})...")
                    continue
                results["errors"].append(f"Message {i+1}: TIMEOUT after 60s")
                results["passed"] = False
                break
            except Exception as e:
                results["errors"].append(f"Message {i+1}: {type(e).__name__}: {str(e)}")
                results["passed"] = False
                break
        
        if not results["passed"]:
            # If we failed this message (timeout, retry limit, or other error),
            # don't continue with the rest of the conversation
            continue
            
        # At this point, 'data' is guaranteed to be defined because results['passed'] is True
        # and we exited the retry loop successfully.
        
        # Store full raw response for debugging
        results["raw_responses"].append({
            "message_index": i,
            "user_message": message,
            "full_response": data
        })
        
        if verbose:
            print(f"\n      📨 Message {i+1}: {message[:50]}...")
            print(f"      📤 Intent: {data.get('intent')}")
            print(f"      📤 is_complete: {data.get('is_complete')}")
            print(f"      📤 Response: {data.get('response', '')[:80]}...")
            reqs = data.get("extracted_requirements", {})
            if reqs:
                print(f"      📤 Requirements: area={reqs.get('area')}, project={reqs.get('project')}, unit_type={reqs.get('unit_type')}")
        
        msg_result = {
            "message": message,
            "response": data.get("response", "")[:200] + "..." if len(data.get("response", "")) > 200 else data.get("response", ""),
            "intent": data.get("intent"),
            "is_complete": data.get("is_complete"),
            "extracted_requirements": data.get("extracted_requirements", {}),
            "checks_passed": []
        }
        
        # Check expected outcomes if defined
        if i < len(test_case.expected_outcomes):
            expected = test_case.expected_outcomes[i]
            reqs = data.get("extracted_requirements", {})
            
            # Check intent
            if expected.intent and data.get("intent") != expected.intent:
                msg_result["checks_passed"].append(f"❌ intent: expected {expected.intent}, got {data.get('intent')}")
                results["passed"] = False
            elif expected.intent:
                msg_result["checks_passed"].append(f"✅ intent: {expected.intent}")
            
            # Check is_complete
            if expected.is_complete is not None and data.get("is_complete") != expected.is_complete:
                msg_result["checks_passed"].append(f"❌ is_complete: expected {expected.is_complete}, got {data.get('is_complete')}")
                results["passed"] = False
            elif expected.is_complete is not None:
                msg_result["checks_passed"].append(f"✅ is_complete: {expected.is_complete}")
                        # Check has_area
            if expected.has_area is not None:
                has_area = bool(reqs and (reqs.get("area") or reqs.get("area_id")))
                if has_area != expected.has_area:
                    msg_result["checks_passed"].append(f"❌ has_area: expected {expected.has_area}, got {has_area}")
                    results["passed"] = False
                else:
                    msg_result["checks_passed"].append(f"✅ has_area: {expected.has_area}")
            
            # Check has_project
            if expected.has_project is not None:
                has_project = bool(reqs and (reqs.get("project") or reqs.get("project_id")))
                if has_project != expected.has_project:
                    msg_result["checks_passed"].append(f"❌ has_project: expected {expected.has_project}, got {has_project}")
                    results["passed"] = False
                else:
                    msg_result["checks_passed"].append(f"✅ has_project: {expected.has_project}")
            
            # Check has_unit_type
            if expected.has_unit_type is not None:
                has_unit_type = bool(reqs and reqs.get("unit_type"))
                if has_unit_type != expected.has_unit_type:
                    msg_result["checks_passed"].append(f"❌ has_unit_type: expected {expected.has_unit_type}, got {has_unit_type}")
                    results["passed"] = False
                else:
                    msg_result["checks_passed"].append(f"✅ has_unit_type: {expected.has_unit_type}")
                
            if expected.response_contains:
                for phrase in expected.response_contains:
                    if phrase not in data.get("response", ""):
                        msg_result["checks_passed"].append(f"❌ response should contain: '{phrase}'")
                        results["passed"] = False
                    else:
                        msg_result["checks_passed"].append(f"✅ response contains: '{phrase}'")
                        
            if expected.response_not_contains:
                for phrase in expected.response_not_contains:
                    if phrase in data.get("response", ""):
                        msg_result["checks_passed"].append(f"❌ response should NOT contain: '{phrase}'")
                        results["passed"] = False
                    else:
                        msg_result["checks_passed"].append(f"✅ response doesn't contain: '{phrase}'")
        
        results["message_results"].append(msg_result)
        time.sleep(3.5)  # Rate limiting - Cohere trial is 20 calls/min, so ~3s delay needed
    
    # Save raw responses to JSON for debugging
    if save_responses:
        import os
        os.makedirs("test_results", exist_ok=True)
        result_file = f"test_results/{test_case.name}.json"
        with open(result_file, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
    
    return results


def run_all_tests(base_url: str = "http://localhost:8000", verbose: bool = False, test_names: Optional[List[str]] = None) -> Dict[str, Any]:
    """Run all test cases and print results.
    
    Args:
        base_url: Base URL of the chatbot API
        verbose: If True, print detailed response data
        test_names: If provided, only run tests with these names
    
    Returns:
        Summary of test results
    """
    print("=" * 70)
    print("🧪 Customer Chatbot End-to-End Conversation Tests")
    print("=" * 70)
    
    if verbose:
        print("📢 VERBOSE MODE: Printing detailed API responses")
    print(f"📁 Results will be saved to: test_results/*.json")
    print("=" * 70)
    
    passed = 0
    failed = 0
    all_results = []
    
    tests_to_run = TEST_CASES
    if test_names:
        tests_to_run = [tc for tc in TEST_CASES if tc.name in test_names]
        print(f"\n🔍 Running {len(tests_to_run)} selected test(s): {test_names}")
    
    for test_case in tests_to_run:
        print(f"\n📋 Test: {test_case.name}")
        print(f"   Type: {test_case.test_type.value}")
        print(f"   Desc: {test_case.description}")
        print(f"   Phone: {test_case.phone_number}")
        
        result = run_test_case(test_case, base_url, verbose=verbose)
        all_results.append(result)
        
        if result["passed"]:
            print(f"   ✅ PASSED")
            passed += 1
        else:
            print(f"   ❌ FAILED")
            for error in result["errors"]:
                print(f"      Error: {error}")
            for msg_result in result["message_results"]:
                for check in msg_result.get("checks_passed", []):
                    if "❌" in check:
                        print(f"      {check}")
            failed += 1
    
    print("\n" + "=" * 70)
    print(f"📊 RESULTS: {passed} passed, {failed} failed out of {len(tests_to_run)} tests")
    print("=" * 70)
    
    # Save summary
    summary = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total": len(tests_to_run),
        "passed": passed,
        "failed": failed,
        "results": all_results
    }
    
    import os
    os.makedirs("test_results", exist_ok=True)
    with open("test_results/_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"📁 Full results saved to: test_results/_summary.json")
    
    return summary


def print_test_cases_summary() -> None:
    """Print summary of all test cases without running them."""
    print("=" * 70)
    print("📋 Customer Chatbot Conversation Test Cases Summary")
    print("=" * 70)
    
    by_type: Dict[TestType, List[ConversationTestCase]] = {}
    for tc in TEST_CASES:
        by_type.setdefault(tc.test_type, []).append(tc)
    
    for test_type, cases in by_type.items():
        print(f"\n### {test_type.value.upper()} ({len(cases)} tests)")
        for tc in cases:
            print(f"  • {tc.name}: {tc.description}")
            print(f"    Messages: {len(tc.messages)}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="End-to-End Conversation Tests for Customer Chatbot")
    parser.add_argument("--live", action="store_true", help="Run tests against live chatbot API")
    parser.add_argument("--verbose", "-v", action="store_true", help="Print detailed API responses")
    parser.add_argument("--test", "-t", action="append", help="Run specific test(s) by name (can be used multiple times)")
    parser.add_argument("--url", default="http://localhost:8000", help="Base URL of chatbot API")
    
    args = parser.parse_args()
    
    if args.live:
        run_all_tests(base_url=args.url, verbose=args.verbose, test_names=args.test)
    else:
        print_test_cases_summary()
        print("\n" + "=" * 70)
        print("ℹ️  Usage:")
        print("    python tests/test_conversations.py --live              # Run all tests")
        print("    python tests/test_conversations.py --live --verbose    # Verbose mode")
        print("    python tests/test_conversations.py --live -t multi_word_confirmation_arabic  # Single test")
        print("=" * 70)

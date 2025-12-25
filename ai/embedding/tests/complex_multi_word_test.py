#!/usr/bin/env python3
"""
Complex Multi-Word Matching Test Suite
Tests extraction of multiple entities (area, unit_type, project) from conversational queries
"""

import requests
import urllib.parse
import json
import os
import time
from typing import Optional, Tuple, List

BASE_URL = "http://localhost:8001"

pass_count = 0
fail_count = 0
test_results = []

# Load known entities for dynamic success criteria
try:
    with open("known_entities.json", "r") as f:
        known = json.load(f)
except:
    known = {"areas": [], "projects": [], "unit_types": []}

def split_into_chunks(text: str, n: int = 3) -> List[str]:
    """Split text into chunks of n words."""
    words = text.split()
    chunks = []
    for i in range(0, len(words), n):
        chunks.append(" ".join(words[i:i+n]))
    return chunks

def format_duration(seconds: float) -> str:
    """Format seconds into M m S s string."""
    m = int(seconds // 60)
    s = seconds % 60
    return f"{m}m {s:.3f}s"

def test_multi_entity_chunked(
    test_num: int,
    query: str,
    expected_area: Optional[str],
    expected_unit: Optional[str],
    expected_project: Optional[str],
    description: str,
    test_type: str = "EXISTING", # EXISTING or NEGATIVE
    chunk_size: int = 3
) -> bool:
    """Test multi-entity extraction from a query using chunked search."""
    global pass_count, fail_count, test_results
    start_time = time.time()
    
    print(f"Test {test_num}: {description}")
    print(f"Query: {query}")
    
    chunks = split_into_chunks(query, chunk_size)
    print(f"  → Chunks: {chunks}")
    
    success = True
    result_entry = {
        "test_num": test_num,
        "test_type": test_type,
        "description": description,
        "query": query,
        "chunks": chunks,
        "expectations": {
            "area": expected_area,
            "unit": expected_unit,
            "project": expected_project
        },
        "chunk_results": {
            "area": [],
            "unit": [],
            "project": []
        },
        "merged_results": {
            "area": None,
            "unit": None,
            "project": None
        },
        "results": {},
        "success": False,
        "duration_seconds": 0,
        "duration_formatted": ""
    }
    
    def get_max_score_results(chunk_results: List[dict]) -> dict:
        """Merge results from multiple chunks, keeping higher scores."""
        merged = {"matched": False, "value": None, "score": 0, "alternatives": []}
        all_values = {} # value -> max_score
        
        for res in chunk_results:
            # Check main match
            if res.get("matched") and res.get("value"):
                val, score = res["value"], res.get("score", 0)
                all_values[val] = max(all_values.get(val, 0), score)
            
            # Check alternatives
            for alt in res.get("alternatives", []):
                val, score = alt["value"], alt.get("score", 0)
                all_values[val] = max(all_values.get(val, 0), score)
        
        # Sort by score and rebuild top results
        sorted_vals = sorted(all_values.items(), key=lambda x: x[1], reverse=True)
        if sorted_vals:
            merged["matched"] = True
            merged["value"] = sorted_vals[0][0]
            merged["score"] = sorted_vals[0][1]
            merged["alternatives"] = [{"value": v, "score": s} for v, s in sorted_vals[1:6]]
            
        return merged

    def check_in_top5_aggregated(agg_data: dict, expected: str) -> Tuple[bool, str, float, List[dict]]:
        """Check if expected value is in aggregated results."""
        all_results = []
        if agg_data.get("matched") and agg_data.get("value"):
            all_results.append({"value": agg_data["value"], "score": agg_data["score"]})
        
        for alt in agg_data.get("alternatives", []):
            all_results.append({"value": alt["value"], "score": alt["score"]})
            
        for i, res in enumerate(all_results[:5]):
            if expected.lower() in res["value"].lower():
                return True, res["value"], res["score"], all_results[:5]
        
        if all_results:
            return False, all_results[0]["value"], all_results[0]["score"], all_results[:5]
        return False, "null", 0, []

    # Process Area
    if expected_area:
        area_chunk_results = []
        for chunk in chunks:
            try:
                resp = requests.get(f"{BASE_URL}/search/area", params={"q": chunk, "threshold": 0.1, "top_k": 5})
                chunk_result = resp.json()
                area_chunk_results.append(chunk_result)
                result_entry["chunk_results"]["area"].append({"chunk": chunk, "result": chunk_result})
            except: pass
        
        agg_area = get_max_score_results(area_chunk_results)
        result_entry["merged_results"]["area"] = agg_area
        found, val, score, top5 = check_in_top5_aggregated(agg_area, expected_area)
        
        # DYNAMIC SUCCESS CRITERIA
        is_existing = expected_area.lower() in known["areas"]
        test_label = "EXISTING" if is_existing else "NEGATIVE"
        
        if is_existing:
            is_top_match = (val.lower() == expected_area.lower() or expected_area.lower() in val.lower()) if val != "null" else False
            result_entry["results"]["area"] = {"found": found, "matched_value": val, "score": score, "top5": top5, "type": "EXISTING", "is_top_match": is_top_match}
            if found:
                match_type = "TOP 1" if is_top_match else "TOP 5"
                print(f"  ✅ Area: {val} ({score:.2f}) [{match_type}]")
            else:
                print(f"  ❌ Area: Expected '{expected_area}', not in top 5. Best got: '{val}' ({score:.2f})")
                success = False
        else: # NEGATIVE (Not in DB)
            # Success = Low score (No False Positive)
            is_safe = score < 0.40
            result_entry["results"]["area"] = {"found": is_safe, "matched_value": val, "score": score, "top5": top5, "type": "NEGATIVE", "is_negative_passed": is_safe}
            if is_safe:
                print(f"  ✅ Area: Correctly filtered '{expected_area}' (Negative: best noise {val} @ {score:.2f})")
            else:
                print(f"  ❌ Area: FALSE POSITIVE! '{val}' matched too high ({score:.2f}) for non-existent '{expected_area}'")
                success = False

    # Process Unit
    if expected_unit:
        unit_chunk_results = []
        for chunk in chunks:
            try:
                resp = requests.get(f"{BASE_URL}/search/unit-type", params={"q": chunk, "threshold": 0.1, "top_k": 5})
                chunk_result = resp.json()
                unit_chunk_results.append(chunk_result)
                result_entry["chunk_results"]["unit"].append({"chunk": chunk, "result": chunk_result})
            except: pass
        
        agg_unit = get_max_score_results(unit_chunk_results)
        result_entry["merged_results"]["unit"] = agg_unit
        found, val, score, top5 = check_in_top5_aggregated(agg_unit, expected_unit)
        
        is_existing = expected_unit.lower() in known["unit_types"]
        
        if is_existing:
            is_top_match = (val.lower() == expected_unit.lower() or expected_unit.lower() in val.lower()) if val != "null" else False
            result_entry["results"]["unit"] = {"found": found, "matched_value": val, "score": score, "top5": top5, "type": "EXISTING", "is_top_match": is_top_match}
            if found:
                match_type = "TOP 1" if is_top_match else "TOP 5"
                print(f"  ✅ Unit: {val} ({score:.2f}) [{match_type}]")
            else:
                print(f"  ❌ Unit: Expected '{expected_unit}', not in top 5. Best got: '{val}' ({score:.2f})")
                success = False
        else: # NEGATIVE (Not in DB)
            is_safe = score < 0.45 
            result_entry["results"]["unit"] = {"found": is_safe, "matched_value": val, "score": score, "top5": top5, "type": "NEGATIVE", "is_negative_passed": is_safe}
            if is_safe:
                print(f"  ✅ Unit: Correctly filtered '{expected_unit}' (Negative: best noise {val} @ {score:.2f})")
            else:
                print(f"  ❌ Unit: FALSE POSITIVE! '{val}' matched too high ({score:.2f}) for non-existent '{expected_unit}'")
                success = False

    # Process Project
    if expected_project:
        proj_chunk_results = []
        for chunk in chunks:
            try:
                resp = requests.get(f"{BASE_URL}/search/project", params={"q": chunk, "threshold": 0.1, "top_k": 5})
                chunk_result = resp.json()
                proj_chunk_results.append(chunk_result)
                result_entry["chunk_results"]["project"].append({"chunk": chunk, "result": chunk_result})
            except: pass
        
        agg_proj = get_max_score_results(proj_chunk_results)
        result_entry["merged_results"]["project"] = agg_proj
        found, val, score, top5 = check_in_top5_aggregated(agg_proj, expected_project)
        
        is_existing = expected_project.lower() in known["projects"]
        
        if is_existing:
            is_top_match = (val.lower() == expected_project.lower() or expected_project.lower() in val.lower()) if val != "null" else False
            result_entry["results"]["project"] = {"found": found, "matched_value": val, "score": score, "top5": top5, "type": "EXISTING", "is_top_match": is_top_match}
            if found:
                match_type = "TOP 1" if is_top_match else "TOP 5"
                print(f"  ✅ Project: {val} ({score:.2f}) [{match_type}]")
            else:
                print(f"  ❌ Project: Expected '{expected_project}', not in top 5. Best got: '{val}' ({score:.2f})")
                success = False
        else: # NEGATIVE (Not in DB)
            is_safe = score < 0.40
            result_entry["results"]["project"] = {"found": is_safe, "matched_value": val, "score": score, "top5": top5, "type": "NEGATIVE", "is_negative_passed": is_safe}
            if is_safe:
                print(f"  ✅ Project: Correctly filtered '{expected_project}' (Negative: best noise {val} @ {score:.2f})")
            else:
                print(f"  ❌ Project: FALSE POSITIVE! '{val}' matched too high ({score:.2f}) for non-existent '{expected_project}'")
                success = False

    duration = time.time() - start_time
    result_entry["duration_seconds"] = round(duration, 3)
    result_entry["duration_formatted"] = format_duration(duration)
    result_entry["success"] = success
    test_results.append(result_entry)
    
    if success:
        pass_count += 1
        print(f"  → PASS ({result_entry['duration_formatted']})")
    else:
        fail_count += 1
        print(f"  → FAIL ({result_entry['duration_formatted']})")
    print()
    return success


def main():
    print("=" * 60)
    print("COMPLEX MULTI-WORD MATCHING TEST SUITE")
    print("Comprehensive Suite: 52 Tests")
    print("=" * 60)
    print()
    
    suite_start_time = time.time()
    
    # GROUP 1: ORIGINAL ARABIC QUERIES (1-10)
    print("=== GROUP 1: ARABIC QUERIES (Complex) ===")
    test_multi_entity_chunked(1, "عايز اعرف اي ارخص شقة في التجمع", "Tagamoo", "Apartment", None, "Cheapest apartment in Tagamoo")
    test_multi_entity_chunked(2, "ابحث عن فيلا في الساحل الشمالي", "North Coast", "Villa", None, "Villa in North Coast")
    test_multi_entity_chunked(3, "عايز دوبلكس في مدينتي", "Madinty", "Duplex", None, "Duplex in Madinty")
    test_multi_entity_chunked(4, "شاليه للبيع في شرم الشيخ", "Sharm El Sheikh", "Chalet", None, "Chalet in Sharm")
    test_multi_entity_chunked(5, "ستوديو للايجار في العاصمة الجديدة", "New Capital", "Studio", None, "Studio in New Capital")
    test_multi_entity_chunked(6, "بنتهاوس فاخر في التجمع الخامس", "Tagamoo", "Penthouse", None, "Penthouse in Tagamoo 5")
    test_multi_entity_chunked(7, "تاون هاوس في مدينتي بسعر كويس", "Madinty", "Townhouse", None, "Townhouse in Madinty")
    test_multi_entity_chunked(8, "عندكم شقق في الساحل؟", "North Coast", "Apartment", None, "Apartments in Coast?")
    test_multi_entity_chunked(9, "فلا في الشرم", "Sharm El Sheikh", "Villa", None, "Villa in Sharm (typo)")
    test_multi_entity_chunked(10, "ايه الفرق بين شقق مدينتي والتجمع؟", "Madinty", "Apartment", None, "Compare apartments")
    print()

    # GROUP 2: ORIGINAL ENGLISH QUERIES (11-20)
    print("=== GROUP 2: ENGLISH QUERIES (Complex) ===")
    test_multi_entity_chunked(11, "I want to find an apartment in North Coast", "North Coast", "Apartment", None, "Apartment in North Coast")
    test_multi_entity_chunked(12, "Looking for a villa in the new capital city", "New Capital", "Villa", None, "Villa in New Capital")
    test_multi_entity_chunked(13, "any duplex available in tagamoo area?", "Tagamoo", "Duplex", None, "Duplex in Tagamoo")
    test_multi_entity_chunked(14, "show me units in Hawabay resort", None, None, "Hawabay", "Units in Hawabay project")
    test_multi_entity_chunked(15, "cheapest studio near sharm el sheikh", "Sharm El Sheikh", "Studio", None, "Studio near Sharm")
    test_multi_entity_chunked(16, "penthaus in madinty city", "Madinty", "Penthouse", None, "Penthouse in Madinty (typo)")
    test_multi_entity_chunked(17, "what villas do you have in north coast?", "North Coast", "Villa", None, "Villas in North Coast?")
    test_multi_entity_chunked(18, "compare apartments in tagamoo and madinty", "Tagamoo", "Apartment", None, "Compare apartments")
    test_multi_entity_chunked(19, "got any chalets in sharm? ", "Sharm El Sheikh", "Chalet", None, "Chalets in Sharm")
    test_multi_entity_chunked(20, "apartments in green plaza project", None, "Apartment", "Green Plaza", "Apartments in Green Plaza")
    print()

    # GROUP 3: ORIGINAL MIXED & ARABIZI (21-25)
    print("=== GROUP 3: MIXED LANGUAGE & ARABIZI ===")
    test_multi_entity_chunked(21, "3ayez sha2a fel sahel", "North Coast", "Apartment", None, "Arabizi: sha2a in sahel")
    test_multi_entity_chunked(22, "villa في North Coast", "North Coast", "Villa", None, "Mixed: villa في area")
    test_multi_entity_chunked(23, "شقة in Hawabay", None, "Apartment", "Hawabay", "Mixed: شقة + project")
    test_multi_entity_chunked(24, "duplex in tagamo3", "Tagamoo", "Duplex", None, "Arabizi: tagamo3")
    test_multi_entity_chunked(25, "3andoko villas fel madinty?", "Madinty", "Villa", None, "Arabizi: villas in madinty")
    print()

    # GROUP 4: ORIGINAL EDGE CASES (26-30)
    print("=== GROUP 4: EDGE CASES ===")
    test_multi_entity_chunked(26, "I am looking for a nice apartment with a sea view in the beautiful north coast area of Egypt", "North Coast", "Apartment", None, "Long query with noise")
    test_multi_entity_chunked(27, "شَقَّة في الساحل الشمالي", "North Coast", "Apartment", None, "Arabic with diacritics")
    test_multi_entity_chunked(28, "which is better: villa in sahel or madinty?", "North Coast", "Villa", None, "Multiple areas")
    test_multi_entity_chunked(29, "2 bedroom apartment in tagamoo 5", "Tagamoo", "Apartment", None, "With bedroom count")
    test_multi_entity_chunked(30, "looking for villa in sharm", "Sharm El Sheikh", "Villa", None, "Simple + area abbrev")
    print()

    # GROUP 5: REAL DB PROJECTS (31-45)
    print("=== GROUP 5: REAL DB PROJECTS ===")
    test_multi_entity_chunked(31, "عايز شقة في مشروع Hawabay", None, "Apartment", "Hawabay", "Project: Hawabay (Arabic context)")
    test_multi_entity_chunked(32, "Show me units in Crystal Resort 2", None, None, "Crystal Resort", "Project: Crystal Resort 2")
    test_multi_entity_chunked(33, "فيلا للبيع في Green Heights 3", None, "Villa", "Green Heights", "Project: Green Heights 3")
    test_multi_entity_chunked(34, "Crystal Towers 4 details please", None, None, "Crystal Towers", "Project: Crystal Towers 4")
    test_multi_entity_chunked(35, "prices of Golden Bay 5 apartments", None, "Apartment", "Golden Bay", "Project: Golden Bay 5")
    test_multi_entity_chunked(36, "عايز اعرف اسعار River Island 6", None, None, "River Island", "Project: River Island 6")
    test_multi_entity_chunked(37, "units available in Future View 7", None, None, "Future View", "Project: Future View 7")
    test_multi_entity_chunked(38, "شقة في Mountain Garden 8", None, "Apartment", "Mountain Garden", "Project: Mountain Garden 8")
    test_multi_entity_chunked(39, "Grand Valley 9 location", None, None, "Grand Valley", "Project: Grand Valley 9")
    test_multi_entity_chunked(40, "is there a duplex in Mountain Heights 10?", None, "Duplex", "Mountain Heights", "Project: Mountain Heights 10")
    test_multi_entity_chunked(41, "Palm View 11 showroom", None, None, "Palm View", "Project: Palm View 11")
    test_multi_entity_chunked(42, "Green Gate 12 compounds", None, None, "Green Gate", "Project: Green Gate 12")
    test_multi_entity_chunked(43, "Royal Compound 13 reviews", None, None, "Royal Compound", "Project: Royal Compound 13")
    test_multi_entity_chunked(44, "Sunny Compound 14 contact", None, None, "Sunny Compound", "Project: Sunny Compound 14")
    test_multi_entity_chunked(45, "Future Garden 15 brochures", None, None, "Future Garden", "Project: Future Garden 15")
    print()

    # GROUP 6: NEGATIVE CASES (46-52)
    print("=== GROUP 6: NEGATIVE CASES (Non-Existent Entities) ===")
    test_multi_entity_chunked(46, "عايز شقة في المعادي", "Maadi", "Apartment", None, "Area: Maadi (Not in DB)", test_type="NEGATIVE")
    test_multi_entity_chunked(47, "بنتهاوس في الشيخ زايد", "Zayed", "Penthouse", None, "Area: Sheikh Zayed (Not in DB)", test_type="NEGATIVE")
    test_multi_entity_chunked(48, "villa in Heliopolis", "Heliopolis", "Villa", None, "Area: Heliopolis (Not in DB)", test_type="NEGATIVE")
    test_multi_entity_chunked(49, "studio in Obour city", "Obour", "Studio", None, "Area: Obour (Not in DB)", test_type="NEGATIVE")
    test_multi_entity_chunked(50, "chalet in Shorouk", "Shorouk", "Chalet", None, "Area: Shorouk (Not in DB)", test_type="NEGATIVE")
    test_multi_entity_chunked(51, "units in Random Tower Resort", None, None, "Random Tower", "Project: Random Tower (Not in DB)", test_type="NEGATIVE")
    test_multi_entity_chunked(52, "any apartments in Fake Heights?", None, "Apartment", "Fake Heights", "Project: Fake Heights (Not in DB)", test_type="NEGATIVE")

    suite_duration = time.time() - suite_start_time
    
    # Results Summary
    summary = {
        "pass_count": pass_count,
        "fail_count": fail_count,
        "total": pass_count + fail_count,
        "success_rate": f"{(pass_count * 100 // (pass_count + fail_count)) if (pass_count + fail_count) > 0 else 0}%",
        "total_duration_seconds": round(suite_duration, 3),
        "total_duration_formatted": format_duration(suite_duration),
        "details": test_results
    }
    
    # Save to JSON
    output_file = "complex_test_results.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print("=" * 60)
    print("COMPLEX MULTI-WORD TEST RESULTS")
    print("=" * 60)
    print()
    print(f"✅ Passed: {pass_count}")
    print(f"❌ Failed: {fail_count}")
    print(f"⏱️ Total Duration: {format_duration(suite_duration)}")
    print()
    print(f"📝 Full results saved to: {os.path.abspath(output_file)}")
    print("=" * 60)

if __name__ == "__main__":
    main()

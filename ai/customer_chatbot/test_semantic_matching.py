"""
Test script for Semantic Matcher using embeddings.
Tests 10 diverse cases and compares with LLM-based extraction.
"""

import time
import json
from app.services.semantic_matcher import get_semantic_matcher

def run_embedding_tests():
    """Run 10 test cases for embedding-based matching."""
    
    matcher = get_semantic_matcher()
    
    test_cases = [
        {
            "id": 1,
            "query": "المشاريع في الساحل الشمالي",
            "expected_area": "North Coast",
            "expected_area_id": 6,
            "description": "Arabic area inquiry"
        },
        {
            "id": 2,
            "query": "projects in New Capital",
            "expected_area": "New Capital",
            "expected_area_id": 7,
            "description": "English area inquiry"
        },
        {
            "id": 3,
            "query": "projcts in Tagamo",  # Typos
            "expected_area": "Tagamoo",
            "expected_area_id": 8,
            "description": "Typo tolerance test"
        },
        {
            "id": 4,
            "query": "north cost",  # Typo for "coast"
            "expected_area": "North Coast",
            "expected_area_id": 6,
            "description": "Typo in area name"
        },
        {
            "id": 5,
            "query": "شقة في التجمع الخامس",
            "expected_area": "Tagamoo",
            "expected_area_id": 8,
            "expected_unit_type": "Apartment",
            "description": "Mixed: unit type + area"
        },
        {
            "id": 6,
            "query": "units in Hawabay",
            "expected_project": "Hawabay",
            "expected_project_id": 88,
            "description": "Project matching"
        },
        {
            "id": 7,
            "query": "Sharm El Sheikh projects",
            "expected_area": "Sharm El Sheikh",
            "expected_area_id": 10,
            "description": "Multi-word area"
        },
        {
            "id": 8,
            "query": "مدينتي",
            "expected_area": "Madinty",
            "expected_area_id": 9,
            "description": "Single word Arabic"
        },
        {
            "id": 9,
            "query": "فيلا",
            "expected_unit_type": "Villa",
            "description": "Unit type only (Arabic)"
        },
        {
            "id": 10,
            "query": "duplex in tagamoo",
            "expected_area": "Tagamoo",
            "expected_area_id": 8,
            "expected_unit_type": "Duplex",
            "description": "Unit type + area (English)"
        }
    ]
    
    results = []
    
    print("=" * 80)
    print("EMBEDDING-BASED SEMANTIC MATCHING - TEST RESULTS")
    print("=" * 80)
    print()
    
    for test in test_cases:
        print(f"Test #{test['id']}: {test['description']}")
        print(f"Query: '{test['query']}'")
        
        start_time = time.time()
        
        # Test area matching with top 5 scores
        area_result = None
        area_top5 = []
        if "expected_area" in test:
            # Get all areas and their scores
            areas = matcher._get_areas()
            area_texts = [f"{a['name']} {a.get('name_ar', a['name'])}" for a in areas]
            scores = matcher.embedding_service.compute_similarity(test['query'], area_texts)
            
            # Get top 5
            scored_areas = [(areas[i], scores[i]) for i in range(len(areas))]
            scored_areas.sort(key=lambda x: x[1], reverse=True)
            area_top5 = [(a['name'], a.get('areaId') or a.get('area_id'), score) for a, score in scored_areas[:5]]
            
            area_result = matcher.match_area(test['query'])
            area_match = (
                area_result.get("matched") and 
                area_result.get("value") == test["expected_area"] and
                area_result.get("id") == test["expected_area_id"]
            )
        
        # Test project matching with top 5 scores
        project_result = None
        project_top5 = []
        if "expected_project" in test:
            projects = matcher._get_projects()
            project_texts = [f"{p['name']}" for p in projects]
            scores = matcher.embedding_service.compute_similarity(test['query'], project_texts)
            
            # Get top 5
            scored_projects = [(projects[i], scores[i]) for i in range(len(projects))]
            scored_projects.sort(key=lambda x: x[1], reverse=True)
            project_top5 = [(p['name'], p.get('projectId') or p.get('project_id'), score) for p, score in scored_projects[:5]]
            
            project_result = matcher.match_project(test['query'])
            project_match = (
                project_result.get("matched") and
                project_result.get("value") == test["expected_project"]
            )
        
        # Test unit type matching
        unit_type_result = None
        if "expected_unit_type" in test:
            unit_type_result = matcher.match_unit_type(test['query'])
            unit_type_match = (
                unit_type_result.get("matched") and
                unit_type_result.get("value") == test["expected_unit_type"]
            )
        
        elapsed = (time.time() - start_time) * 1000  # Convert to ms
        
        # Determine overall result
        passed = True
        if area_result and "expected_area" in test:
            passed = passed and area_match
        if project_result and "expected_project" in test:
            passed = passed and project_match
        if unit_type_result and "expected_unit_type" in test:
            passed = passed and unit_type_match
        
        result = {
            "test_id": test["id"],
            "query": test["query"],
            "description": test["description"],
            "area_result": area_result,
            "area_top5": area_top5,
            "project_result": project_result,
            "project_top5": project_top5,
            "unit_type_result": unit_type_result,
            "passed": passed,
            "time_ms": round(elapsed, 2)
        }
        results.append(result)
        
        # Print result
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"Status: {status} ({elapsed:.0f}ms)")
        
        if area_result:
            print(f"  Area: {area_result.get('value')} (ID: {area_result.get('id')}, Score: {area_result.get('score', 0):.3f})")
        if area_top5:
            print(f"  Top 5 Areas:")
            for i, (name, aid, score) in enumerate(area_top5, 1):
                marker = "👉" if i == 1 else "  "
                print(f"    {marker} {i}. {name} (ID: {aid}) - Score: {score:.3f}")
        
        if project_result:
            print(f"  Project: {project_result.get('value')} (ID: {project_result.get('id')}, Score: {project_result.get('score', 0):.3f})")
        if project_top5:
            print(f"  Top 5 Projects:")
            for i, (name, pid, score) in enumerate(project_top5, 1):
                marker = "👉" if i == 1 else "  "
                print(f"    {marker} {i}. {name} (ID: {pid}) - Score: {score:.3f}")
        
        if unit_type_result:
            print(f"  Unit Type: {unit_type_result.get('value')} (Score: {unit_type_result.get('score', 0):.3f})")
        
        print()
    
    # Summary
    passed_count = sum(1 for r in results if r["passed"])
    avg_time = sum(r["time_ms"] for r in results) / len(results)
    
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total Tests: {len(results)}")
    print(f"Passed: {passed_count}/{len(results)} ({passed_count/len(results)*100:.1f}%)")
    print(f"Average Time: {avg_time:.0f}ms")
    print()
    
    return results


if __name__ == "__main__":
    results = run_embedding_tests()
    
    # Save results to file
    with open("/tmp/embedding_test_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print("Results saved to /tmp/embedding_test_results.json")

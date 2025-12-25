#!/bin/bash
# Updated Comprehensive Embedding Service Test Script
# Covers: Simple, Medium, Complex, and Edge cases with correct expectations

BASE_URL="http://localhost:8001"

pass_count=0
fail_count=0

echo "==============================================="
echo "EMBEDDING SERVICE COMPREHENSIVE TEST SUITE V2"
echo "==============================================="
echo ""

# Function to run test and show result
run_test() {
    local test_name="$1"
    local endpoint="$2"
    local expected="$3"
    local should_match="$4"  # true or false
    
    result=$(curl -s "$endpoint")
    matched=$(echo "$result" | jq -r '.matched // false')
    value=$(echo "$result" | jq -r '.value // "null"')
    score=$(echo "$result" | jq -r '.score // 0')
    
    if [[ "$should_match" == "true" && "$matched" == "true" && "$value" == *"$expected"* ]]; then
        echo "✅ PASS: $test_name"
        echo "   Matched: $value (score: $score)"
        ((pass_count++))
    elif [[ "$should_match" == "false" && "$matched" == "false" ]]; then
        echo "✅ PASS: $test_name (correctly rejected)"
        ((pass_count++))
    else
        echo "❌ FAIL: $test_name"
        echo "   Expected match=$should_match for '$expected', Got: $value (matched: $matched, score: $score)"
        ((fail_count++))
    fi
    echo ""
}

echo "=== STEP 1: DATA SYNC ==="
echo ""
echo "Assuming data is already synced from previous test run..."
echo ""

echo "=== STEP 2: SIMPLE CASES (Exact Matches) ==="
echo ""

run_test "Exact area: North Coast" "$BASE_URL/search/area?q=North%20Coast" "North Coast" "true"
run_test "Exact area: Madinty" "$BASE_URL/search/area?q=Madinty" "Madinty" "true"
run_test "Exact area: Tagamoo" "$BASE_URL/search/area?q=Tagamoo" "Tagamoo" "true"
run_test "Exact project: Hawabay" "$BASE_URL/search/project?q=Hawabay" "Hawabay" "true"
run_test "Exact project: Green Plaza 1" "$BASE_URL/search/project?q=Green%20Plaza%201" "Green Plaza 1" "true"

echo "=== STEP 3: TYPOS (Medium Complexity) ==="
echo ""

run_test "Typo: 'North Cost'" "$BASE_URL/search/area?q=North%20Cost" "North Coast" "true"
run_test "Typo: 'Hawa Bay' (space)" "$BASE_URL/search/project?q=Hawa%20Bay" "Hawabay" "true"
run_test "Typo: 'Tagamo'" "$BASE_URL/search/area?q=Tagamo" "Tagamoo" "true"
run_test "Typo: 'Sharm el shaikh'" "$BASE_URL/search/area?q=Sharm%20el%20shaikh" "Sharm El Sheikh" "true"
run_test "Typo: 'Greeen Plaza'" "$BASE_URL/search/project?q=Greeen%20Plaza" "Green Plaza" "true"
run_test "Typo: 'madinti'" "$BASE_URL/search/area?q=madinti" "Madinty" "true"
run_test "Typo: 'nrth coast'" "$BASE_URL/search/area?q=nrth%20coast" "North Coast" "true"

echo "=== STEP 4: PARTIAL MATCHES (Complex) ==="
echo ""

run_test "Partial: 'Mountain'" "$BASE_URL/search/project?q=Mountain" "Mountain" "true"
run_test "Partial: 'Royal'" "$BASE_URL/search/project?q=Royal" "Royal" "true"
run_test "Partial: 'Future'" "$BASE_URL/search/project?q=Future" "Future" "true"
run_test "Partial: 'Golden'" "$BASE_URL/search/project?q=Golden" "Golden Bay" "true"

echo "=== STEP 5: EDGE CASES ==="
echo ""

run_test "High threshold (0.9)" "$BASE_URL/search/area?q=North%20Coast&threshold=0.9" "North Coast" "false"
run_test "Non-existent area" "$BASE_URL/search/area?q=Alexandria&threshold=0.5" "Alexandria" "false"
run_test "Very short query: 'N'" "$BASE_URL/search/area?q=N&threshold=0.5" "false" "false"
run_test "Random gibberish" "$BASE_URL/search/project?q=xyzabc123&threshold=0.4" "false" "false"

echo "=== STEP 6: AREA-FILTERED PROJECTS ==="
echo ""

run_test "Project in North Coast (area_id=6)" "$BASE_URL/search/project?q=bay&area_id=6" "Hawabay" "true"
run_test "Project in Tagamoo (area_id=8)" "$BASE_URL/search/project?q=Plaza&area_id=8" "Green Plaza" "true"
run_test "Project in New Capital (area_id=7)" "$BASE_URL/search/project?q=Crystal&area_id=7" "Crystal" "true"

echo "=== STEP 7: UNIT TYPES (English) ==="
echo ""

run_test "Unit: Villa" "$BASE_URL/search/unit-type?q=villa" "Villa" "true"
run_test "Unit: Apartment" "$BASE_URL/search/unit-type?q=apartment" "Apartment" "true"
run_test "Unit: Duplex" "$BASE_URL/search/unit-type?q=duplex" "Duplex" "true"
run_test "Unit: Studio" "$BASE_URL/search/unit-type?q=studio" "Studio" "true"
run_test "Unit: Penthouse" "$BASE_URL/search/unit-type?q=penthouse" "Penthouse" "true"
run_test "Unit typo: 'vila'" "$BASE_URL/search/unit-type?q=vila" "Villa" "true"
run_test "Unit typo: 'apartmnt'" "$BASE_URL/search/unit-type?q=apartmnt" "Apartment" "true"

echo "=== STEP 8: UNIT TYPES (Arabic) ==="
echo ""

run_test "Arabic: شقة (Apartment)" "$BASE_URL/search/unit-type?q=%D8%B4%D9%82%D8%A9" "Apartment" "true"
run_test "Arabic: فيلا (Villa)" "$BASE_URL/search/unit-type?q=%D9%81%D9%8A%D9%84%D8%A7" "Villa" "true"
run_test "Arabic: دوبلكس (Duplex)" "$BASE_URL/search/unit-type?q=%D8%AF%D9%88%D8%A8%D9%84%D9%83%D8%B3" "Duplex" "true"
run_test "Arabic: شاليه (Chalet)" "$BASE_URL/search/unit-type?q=%D8%B4%D8%A7%D9%84%D9%8A%D9%87" "Chalet" "true"

echo "=== STEP 9: BATCH EMBEDDING API ==="
echo ""

batch_result=$(curl -s -X POST "$BASE_URL/embed/batch" -H "Content-Type: application/json" -d '{"texts": ["test1", "test2", "test3"]}')
batch_count=$(echo "$batch_result" | jq '.count')
if [[ "$batch_count" == "3" ]]; then
    echo "✅ PASS: Batch embedding (3 texts)"
    echo "   Returned $batch_count embeddings"
    ((pass_count++))
else
    echo "❌ FAIL: Batch embedding"
    echo "   Expected 3 embeddings, got: $batch_count"
    ((fail_count++))
fi
echo ""

echo "=== STEP 10: SYNC API ==="
echo ""

sync_result=$(curl -s -X POST "$BASE_URL/sync/area" -H "Content-Type: application/json" -d '{"area_id": 999, "name": "Test Area", "name_ar": "منطقة اختبار"}')
sync_success=$(echo "$sync_result" | jq -r '.success')
if [[ "$sync_success" == "true" ]]; then
    echo "✅ PASS: Area sync API"
    ((pass_count++))
    # Clean up
    curl -s -X DELETE "$BASE_URL/sync/area/999" > /dev/null
else
    echo "❌ FAIL: Area sync API"
    ((fail_count++))
fi
echo ""

echo "==============================================="
echo "TEST RESULTS SUMMARY"
echo "==============================================="
echo ""
echo "✅ Passed: $pass_count"
echo "❌ Failed: $fail_count"
echo ""
total=$((pass_count + fail_count))
percentage=$((pass_count * 100 / total))
echo "Success Rate: $percentage%"
echo "==============================================="

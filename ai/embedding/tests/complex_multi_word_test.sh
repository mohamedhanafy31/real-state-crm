#!/bin/bash
# Complex Multi-Word Matching Test Suite
# Tests extraction of multiple entities (area, unit_type, project) from conversational queries

BASE_URL="http://localhost:8001"

pass_count=0
fail_count=0

echo "==============================================="
echo "COMPLEX MULTI-WORD MATCHING TEST SUITE"
echo "30 Conversational Query Tests"
echo "==============================================="
echo ""

# Function to test multi-entity extraction
test_multi_entity() {
    local test_num="$1"
    local query="$2"
    local expected_area="$3"
    local expected_unit="$4"
    local expected_project="$5"
    local description="$6"
    
    echo "Test $test_num: $description"
    echo "Query: $query"
    
    local success=true
    
    # Test area extraction
    if [[ -n "$expected_area" ]]; then
        area_result=$(curl -s "$BASE_URL/search/area?q=$(echo "$query" | jq -sRr @uri)&threshold=0.3")
        area_matched=$(echo "$area_result" | jq -r '.matched')
        area_value=$(echo "$area_result" | jq -r '.value // "null"')
        area_score=$(echo "$area_result" | jq -r '.score // 0')
        
        if [[ "$area_matched" == "true" && "$area_value" == *"$expected_area"* ]]; then
            echo "  ✅ Area: $area_value ($area_score)"
        else
            echo "  ❌ Area: Expected '$expected_area', got '$area_value' (score: $area_score)"
            success=false
        fi
    fi
    
    # Test unit type extraction
    if [[ -n "$expected_unit" ]]; then
        unit_result=$(curl -s "$BASE_URL/search/unit-type?q=$(echo "$query" | jq -sRr @uri)&threshold=0.3")
        unit_matched=$(echo "$unit_result" | jq -r '.matched')
        unit_value=$(echo "$unit_result" | jq -r '.value // "null"')
        unit_score=$(echo "$unit_result" | jq -r '.score // 0')
        
        if [[ "$unit_matched" == "true" && "$unit_value" == *"$expected_unit"* ]]; then
            echo "  ✅ Unit: $unit_value ($unit_score)"
        else
            echo "  ❌ Unit: Expected '$expected_unit', got '$unit_value' (score: $unit_score)"
            success=false
        fi
    fi
    
    # Test project extraction
    if [[ -n "$expected_project" ]]; then
        project_result=$(curl -s "$BASE_URL/search/project?q=$(echo "$query" | jq -sRr @uri)&threshold=0.3")
        project_matched=$(echo "$project_result" | jq -r '.matched')
        project_value=$(echo "$project_result" | jq -r '.value // "null"')
        project_score=$(echo "$project_result" | jq -r '.score // 0')
        
        if [[ "$project_matched" == "true" && "$project_value" == *"$expected_project"* ]]; then
            echo "  ✅ Project: $project_value ($project_score)"
        else
            echo "  ❌ Project: Expected '$expected_project', got '$project_value' (score: $project_score)"
            success=false
        fi
    fi
    
    if [[ "$success" == true ]]; then
        ((pass_count++))
        echo "  → PASS"
    else
        ((fail_count++))
        echo "  → FAIL"
    fi
    echo ""
}

echo "=== GROUP 1: ARABIC QUERIES (Complex) ==="
echo ""

# Test 1: Arabic with area + unit type
test_multi_entity 1 \
    "عايز اعرف اي ارخص شقة في التجمع" \
    "Tagamoo" \
    "Apartment" \
    "" \
    "Cheapest apartment in Tagamoo (Arabic)"

# Test 2: Arabic with area + project hint
test_multi_entity 2 \
    "ابحث عن فيلا في الساحل الشمالي" \
    "North Coast" \
    "Villa" \
    "" \
    "Villa in North Coast (Arabic)"

# Test 3: Arabic with area + duplex
test_multi_entity 3 \
    "عايز دوبلكس في مدينتي" \
    "Madinty" \
    "Duplex" \
    "" \
    "Duplex in Madinty (Arabic)"

# Test 4: Arabic with sharm
test_multi_entity 4 \
    "شاليه للبيع في شرم الشيخ" \
    "Sharm El Sheikh" \
    "Chalet" \
    "" \
    "Chalet in Sharm El Sheikh (Arabic)"

# Test 5: Arabic with studio
test_multi_entity 5 \
    "ستوديو للايجار في العاصمة الجديدة" \
    "New Capital" \
    "Studio" \
    "" \
    "Studio in New Capital (Arabic)"

# Test 6: Arabic with penthouse
test_multi_entity 6 \
    "بنتهاوس فاخر في التجمع الخامس" \
    "Tagamoo" \
    "Penthouse" \
    "" \
    "Penthouse in Tagamoo 5 (Arabic)"

# Test 7: Arabic with townhouse
test_multi_entity 7 \
    "تاون هاوس في مدينتي بسعر كويس" \
    "Madinty" \
    "Townhouse" \
    "" \
    "Townhouse in Madinty (Arabic)"

# Test 8: Arabic informal
test_multi_entity 8 \
    "عندكم شقق في الساحل؟" \
    "North Coast" \
    "Apartment" \
    "" \
    "Do you have apartments in Coast? (Informal Arabic)"

# Test 9: Arabic with typo
test_multi_entity 9 \
    "فلا في الشرم" \
    "Sharm El Sheikh" \
    "Villa" \
    "" \
    "Villa in Sharm (Arabic typo: فلا)"

# Test 10: Arabic comparative
test_multi_entity 10 \
    "ايه الفرق بين شقق مدينتي والتجمع؟" \
    "Madinty" \
    "Apartment" \
    "" \
    "Difference between apartments (Arabic comparative)"

echo "=== GROUP 2: ENGLISH QUERIES (Complex) ==="
echo ""

# Test 11: English with area + unit
test_multi_entity 11 \
    "I want to find an apartment in North Coast" \
    "North Coast" \
    "Apartment" \
    "" \
    "Apartment in North Coast (English)"

# Test 12: English with villa
test_multi_entity 12 \
    "Looking for a villa in the new capital city" \
    "New Capital" \
    "Villa" \
    "" \
    "Villa in New Capital (English)"

# Test 13: English informal
test_multi_entity 13 \
    "any duplex available in tagamoo area?" \
    "Tagamoo" \
    "Duplex" \
    "" \
    "Duplex in Tagamoo (English informal)"

# Test 14: English with project
test_multi_entity 14 \
    "show me units in Hawabay resort" \
    "North Coast" \
    "" \
    "Hawabay" \
    "Units in Hawabay (English with project)"

# Test 15: English price-focused
test_multi_entity 15 \
    "cheapest studio near sharm el sheikh" \
    "Sharm El Sheikh" \
    "Studio" \
    "" \
    "Cheapest studio in Sharm (English)"

# Test 16: English with typos
test_multi_entity 16 \
    "penthaus in madinty city" \
    "Madinty" \
    "Penthouse" \
    "" \
    "Penthouse in Madinty (English typo: penthaus)"

# Test 17: English question
test_multi_entity 17 \
    "what villas do you have in north coast?" \
    "North Coast" \
    "Villa" \
    "" \
    "What villas in North Coast? (English question)"

# Test 18: English comparative
test_multi_entity 18 \
    "compare apartments in tagamoo and madinty" \
    "Tagamoo" \
    "Apartment" \
    "" \
    "Compare apartments (English)"

# Test 19: English casual
test_multi_entity 19 \
    "got any chalets in sharm?" \
    "Sharm El Sheikh" \
    "Chalet" \
    "" \
    "Chalets in Sharm (English casual)"

# Test 20: English specific project
test_multi_entity 20 \
    "apartments in green plaza project" \
    "Tagamoo" \
    "Apartment" \
    "Green Plaza" \
    "Apartments in Green Plaza (English)"

echo "=== GROUP 3: MIXED LANGUAGE QUERIES ==="
echo ""

# Test 21: Arabizi (Arabic written in English)
test_multi_entity 21 \
    "3ayez sha2a fel sahel" \
    "North Coast" \
    "Apartment" \
    "" \
    "Arabizi: sha2a (apartment) in sahel (coast)"

# Test 22: Mixed Arabic-English
test_multi_entity 22 \
    "villa في North Coast" \
    "North Coast" \
    "Villa" \
    "" \
    "Mixed: English villa + Arabic في + English area"

# Test 23: Mixed with project
test_multi_entity 23 \
    "شقة in Hawabay" \
    "" \
    "Apartment" \
    "Hawabay" \
    "Mixed: Arabic unit + English project"

# Test 24: Arabizi area
test_multi_entity 24 \
    "duplex in tagamo3" \
    "Tagamoo" \
    "Duplex" \
    "" \
    "Arabizi: tagamo3 (تجمع)"

# Test 25: Mixed informal
test_multi_entity 25 \
    "3andoko villas fel madinty?" \
    "Madinty" \
    "Villa" \
    "" \
    "Arabizi: Do you have villas in Madinty?"

echo "=== GROUP 4: EDGE CASES (Complex Queries) ==="
echo ""

# Test 26: Long query with noise
test_multi_entity 26 \
    "I am looking for a nice apartment with a sea view in the beautiful north coast area of Egypt" \
    "North Coast" \
    "Apartment" \
    "" \
    "Long English query with noise words"

# Test 27: Arabic with diacritics
test_multi_entity 27 \
    "شَقَّة في الساحل الشمالي" \
    "North Coast" \
    "Apartment" \
    "" \
    "Arabic with diacritics (تشكيل)"

# Test 28: Multiple areas mentioned
test_multi_entity 28 \
    "which is better: villa in sahel or madinty?" \
    "North Coast" \
    "Villa" \
    "" \
    "Multiple areas mentioned (should pick first)"

# Test 29: Query with numbers
test_multi_entity 29 \
    "2 bedroom apartment in tagamoo 5" \
    "Tagamoo" \
    "Apartment" \
    "" \
    "Query with bedroom count + area variant"

# Test 30: Emoji and special chars
test_multi_entity 30 \
    "🏠 looking for villa in sharm 🌊" \
    "Sharm El Sheikh" \
    "Villa" \
    "" \
    "Query with emojis"

echo "==============================================="
echo "COMPLEX MULTI-WORD TEST RESULTS"
echo "==============================================="
echo ""
echo "✅ Passed: $pass_count"
echo "❌ Failed: $fail_count"
echo ""
total=$((pass_count + fail_count))
if [[ $total -gt 0 ]]; then
    percentage=$((pass_count * 100 / total))
    echo "Success Rate: $percentage%"
fi
echo "==============================================="

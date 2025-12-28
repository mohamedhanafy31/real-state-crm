
import os
import sys
import json
import time
from dotenv import load_dotenv

def colored(text, color, attrs=None):
    return text

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load env vars from .env file in parent directory
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

# Enforce Cohere
os.environ["GENERATOR_TYPE"] = "cohere"

from app.graph.nodes import classify_inquiry_logic
from app.core.logging_config import setup_logging

# Setup logging
setup_logging()

TEST_CASES = [
    # --- Price Checks ---
    {"msg": "How much is a villa in Hawabay?", "expected": "price_check", "desc": "Explicit Price (EN)"},
    {"msg": "bikam el shqa fi green plaza?", "expected": "price_check", "desc": "Franco Price"},
    {"msg": "عايز اعرف اسعار الشقق في التجمع", "expected": "price_check", "desc": "Arabic Price"},
    {"msg": "what is the down payment for sea view?", "expected": "price_check", "desc": "Payment Details"},
    
    # --- Availability Checks ---
    {"msg": "Do you have any villas available currently?", "expected": "availability_check", "desc": "Explicit Availability (EN)"},
    {"msg": "fih 3andoko studios?", "expected": "availability_check", "desc": "Franco Availability"},
    {"msg": "ايه الوحدات المتاحة عندكم؟", "expected": "availability_check", "desc": "Arabic Availability"},
    {"msg": "I want to buy an apartment", "expected": "availability_check", "desc": "Purchase Intent"},
    
    # --- Project Comparison ---
    {"msg": "Compare Hawabay and Green Plaza", "expected": "project_comparison", "desc": "Explicit Compare"},
    {"msg": "eh el far2 ben el etnen dol?", "expected": "project_comparison", "desc": "Franco Compare (Context needed normally)"},
    {"msg": "ايهما افضل الاستثمار في التجمع ولا العاصمة؟", "expected": "project_comparison", "desc": "Arabic Compare Areas"},
    
    # --- Location Info ---
    {"msg": "Where is the New Capital located?", "expected": "location_info", "desc": "Explicit Location"},
    {"msg": "el tagamo3 fen belzabt?", "expected": "location_info", "desc": "Franco Location"},
    {"msg": "موقع مشروع فيوتشر جاردن فين؟", "expected": "location_info", "desc": "Arabic Project Location"},
    
    # --- General QA ---
    {"msg": "Can I pay over 10 years?", "expected": "general_qa", "desc": "Payment Plan General"},
    {"msg": "men el developer beta3 el mashro3?", "expected": "general_qa", "desc": "Franco Developer Info"},
    {"msg": "هل الشركة ليها سابقة اعمال؟", "expected": "general_qa", "desc": "Arabic Company Info"},
    
    # --- Complex / Multi-Intent ---
    {"msg": "I have a budget of 5 million, what can I buy in New Capital?", "expected": "availability_check", "desc": "Budget Constraint Availability"},
    {"msg": "I am looking for a villa, how much does it cost?", "expected": "price_check", "desc": "Mixed (Availability + Price) -> Price Focus"},
    {"msg": "I don't want a chalet, I need a standalone villa.", "expected": "availability_check", "desc": "Negation / Specific Unit"},
    {"msg": "Show me something with a garden and a view.", "expected": "availability_check", "desc": "Feature Constraint"},
    {"msg": "Is it better to buy now or wait?", "expected": "general_qa", "desc": "Advisory / Market Question"},

    # --- Arabic Complex Cases (User Focus) ---
    {"msg": "معايا 5 مليون، ايه المتاح في التجمع؟", "expected": "availability_check", "desc": "Arabic Budget Constraint"},
    {"msg": "مش عايز شقة، محتاج فيلا مستقلة", "expected": "availability_check", "desc": "Arabic Negation/Specific"},
    {"msg": "ايه الفرق بينه وبين المشروع التاني؟", "context": "Comparing two projects", "expected": "project_comparison", "desc": "Arabic Context Comparison"},
    {"msg": "نظام التقسيط ازاي والمقدم كام؟", "expected": "price_check", "desc": "Arabic Payment Plan (Price)"},
    {"msg": "المكان ده قريب من الجامعة الأمريكية؟", "expected": "location_info", "desc": "Arabic Location Constraint"},
    {"msg": "يا باشا عايز حاجة لقطة", "expected": "availability_check", "desc": "Arabic Slang Deal"},
    {"msg": "في حاجة استلام فوري؟", "expected": "availability_check", "desc": "Arabic Delivery Date"},
    {"msg": "ممكن ابدل وحدتي بوحدة تانية؟", "expected": "general_qa", "desc": "Arabic Policy/Exchange"},
    {"msg": "الاسعار دي نهائية ولا في تفاوض؟", "expected": "price_check", "desc": "Arabic Negotiation"},
    
    # --- Context / Follow-up (Simulated) ---
    {"msg": "What about the other one?", "context": "User comparing Project A and Project B", "expected": "project_comparison", "desc": "Context-Dependent Follow-up"},
    {"msg": "Is it close to the university?", "context": "Focus: Green Heights 3", "expected": "location_info", "desc": "Context-Aware Location"},
    
    # --- Edge Cases ---
    {"msg": "details", "expected": "general_qa", "desc": "Single Word Vague"},
    {"msg": "Are the prices negotiable?", "expected": "price_check", "desc": "Negotiation / Price Policy"},
    {"msg": "Do you accept cash only?", "expected": "price_check", "desc": "Payment Method"},
    {"msg": "Who is the owner of the company?", "expected": "general_qa", "desc": "Company Info"},
    {"msg": "Msa msa ya basha", "expected": "general_qa", "desc": "Slang Greeting"},
    {"msg": "123456", "expected": "general_qa", "desc": "Numeric Noise"},
    {"msg": "print('hello')", "expected": "general_qa", "desc": "Code Injection Attempt"}
]

def run_tests():
    print(colored("Starting Smart Router Verification (Extended)...", "cyan"))
    print("-" * 60)
    
    passed = 0
    failed_cases = []
    
    for i, test in enumerate(TEST_CASES, 1):
        time.sleep(3) # Avoid rate limit
        print(f"Test {i}: [{test['desc']}]")
        print(f"Input: {test['msg']}")
        if "context" in test:
            print(f"Context: {test['context']}")
        
        try:
            # Call the actual Router Logic
            context_str = test.get("context", "")
            result = classify_inquiry_logic(test['msg'], context_str=context_str)
            classification = result.get("type")
            entities = result.get("entities", {})
            
            success = classification == test['expected']
            
            color = "green" if success else "red"
            
            print(colored(f"Result: {classification} (Expected: {test['expected']})", color))
            # print(f"Entities: {json.dumps(entities, ensure_ascii=False)}")
            
            if success:
                passed += 1
            else:
                failed_cases.append({
                    "id": i,
                    "desc": test['desc'],
                    "input": test['msg'],
                    "got": classification,
                    "expected": test['expected']
                })
                
        except Exception as e:
            print(colored(f"ERROR: {str(e)}", "red"))
            failed_cases.append({
                "id": i,
                "desc": test['desc'],
                "input": test['msg'],
                "got": f"ERROR: {str(e)}",
                "expected": test['expected']
            })
            
        print("-" * 60)
        
    print(colored(f"\nFinal Results: {passed}/{len(TEST_CASES)} Passed", "cyan"))
    
    if failed_cases:
        print(colored("\nFAILED CASES SUMMARY:", "red"))
        for f in failed_cases:
            print(f"[{f['id']}] {f['desc']}")
            print(f"   Input: {f['input']}")
            print(f"   Expected: {f['expected']} | Got: {f['got']}")
            print("-" * 30)

if __name__ == "__main__":
    run_tests()

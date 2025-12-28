"""
Interview phase definitions.
Defines all 6 interview phases with questions, scoring weights, and criteria.
"""

from typing import Dict, List, Any

INTERVIEW_PHASES: Dict[int, Dict[str, Any]] = {
    1: {
        "name": "Ice-Breaking & Identity",
        "name_ar": "التعارف والمعلومات الأساسية",
        "max_score": 5,  # Reduced from 10 to balance total=100
        "questions": [
            {
                "key": "phase1_q1",
                "text_en": "How long have you been working as a real estate broker?",
                "text_ar": "من إمتى وانت شغال كوسيط عقاري؟"
            },
            {
                "key": "phase1_q2", 
                "text_en": "Do you mainly work in sales, rentals, or both?",
                "text_ar": "بتشتغل في البيع ولا الإيجار ولا الاتنين؟"
            },
            {
                "key": "phase1_q3",
                "text_en": "Which areas or cities do you usually work in?",
                "text_ar": "إيه المناطق أو المدن اللي بتشتغل فيها عادة؟"
            }
        ],
        "success_criteria": [
            "Specific areas mentioned (not vague like 'anywhere' or 'all Egypt')",
            "Consistent experience timeline",
            "Clear and direct answers"
        ],
        "red_flags": [
            "Extremely generic answers",
            "Inconsistent timelines",
            "Avoiding area specification"
        ]
    },
    2: {
        "name": "Real-World Experience",
        "name_ar": "خبرة العمل الفعلية",
        "max_score": 30,
        "questions": [
            {
                "key": "phase2_q1",
                "text_en": "Tell me about the last deal you successfully closed (without sensitive details).",
                "text_ar": "احكيلي عن آخر صفقة قفلتها بنجاح (من غير تفاصيل حساسة)."
            },
            {
                "key": "phase2_q2",
                "text_en": "What was the main challenge in that deal, and how did you solve it?",
                "text_ar": "إيه كان أكبر تحدي في الصفقة دي وإزاي تعاملت معاه؟"
            },
            {
                "key": "phase2_q3",
                "text_en": "On average, how long does it take you from first contact with a client to closing a deal?",
                "text_ar": "في المتوسط، بياخد قد إيه وقت من أول تواصل مع العميل لحد ما تقفل الصفقة؟"
            }
        ],
        "success_criteria": [
            "Logical sequence of events",
            "Real problem and solution described",
            "Realistic timelines (not exaggerated)"
        ],
        "red_flags": [
            "Marketing-style language instead of real examples",
            "No challenges mentioned (too perfect)",
            "Unrealistic speed or perfection"
        ]
    },
    3: {
        "name": "Professional Terminology",
        "name_ar": "المصطلحات المهنية",
        "max_score": 20,
        "random_select": 2,  # Select 2-3 questions randomly
        "questions": [
            {
                "key": "phase3_q1",
                "text_en": "What is a down payment, and when is it refundable?",
                "text_ar": "إيه هو العربون، وإمتى بيترجع؟"
            },
            {
                "key": "phase3_q2",
                "text_en": "What is the difference between exclusive and non-exclusive selling agreements?",
                "text_ar": "إيه الفرق بين التفويض الحصري وغير الحصري؟"
            },
            {
                "key": "phase3_q3",
                "text_en": "In which cases does a broker lose their commission?",
                "text_ar": "في أي حالات الوسيط بيخسر عمولته؟"
            },
            {
                "key": "phase3_q4",
                "text_en": "What does it mean when a deal falls through?",
                "text_ar": "يعني إيه لما الصفقة تطير أو تفشل؟"
            }
        ],
        "success_criteria": [
            "Practical explanations with examples",
            "Contextual understanding, not dictionary definitions",
            "Real-world application knowledge"
        ],
        "red_flags": [
            "Incorrect definitions",
            "Overly academic/textbook explanations",
            "Confusing or mixing terms"
        ]
    },
    4: {
        "name": "Scenario-Based Decision Making",
        "name_ar": "سيناريوهات واتخاذ القرار",
        "max_score": 25,
        "random_select": 1,  # Select 1 primary scenario
        "questions": [
            {
                "key": "phase4_q1",
                "text_en": "A client wants to buy at 20% below market price and refuses to accept reality. What do you do?",
                "text_ar": "عميل عايز يشتري بـ20% أقل من السوق ومش عايز يقتنع. هتعمل إيه؟"
            },
            {
                "key": "phase4_q2",
                "text_en": "A property owner changes their mind after an initial agreement. How do you protect your rights?",
                "text_ar": "صاحب العقار غير رأيه بعد ما اتفقتم. إزاي تحمي حقك؟"
            }
        ],
        "success_criteria": [
            "Logical negotiation approach",
            "Understanding of role boundaries",
            "Balanced behavior (not aggressive, not unrealistic)"
        ],
        "red_flags": [
            "Emotional or impulsive answers",
            "Unrealistic guarantees or promises",
            "Ignoring legal/ethical limits"
        ]
    },
    5: {
        "name": "Numbers & Financial Awareness",
        "name_ar": "الأرقام والوعي المالي",
        "max_score": 15,
        "questions": [
            {
                "key": "phase5_q1",
                "text_en": "What is the average commission rate you work with?",
                "text_ar": "متوسط نسبة العمولة اللي بتشتغل بيها قد إيه؟"
            },
            {
                "key": "phase5_q2",
                "text_en": "If a unit costs 2,000,000, how much commission do you earn?",
                "text_ar": "لو وحدة سعرها 2 مليون، عمولتك هتبقى كام؟"
            },
            {
                "key": "phase5_q3",
                "text_en": "What percentage does your company take from your commission?",
                "text_ar": "الشركة بتاخد نسبة كام من عمولتك؟"
            }
        ],
        "success_criteria": [
            "Correct mathematical calculations",
            "Market-realistic commission percentages (1-3% typically)",
            "Confidence when discussing numbers"
        ],
        "red_flags": [
            "Hesitation or avoidance of numbers",
            "Incorrect math calculations",
            "Unrealistic commission rates (too high or too low)"
        ]
    },
    6: {
        "name": "Credibility & Self-Awareness",
        "name_ar": "المصداقية والوعي الذاتي",
        "max_score": 5,  # Reduced from 10 to balance total=100
        "questions": [
            {
                "key": "phase6_q1",
                "text_en": "Why did you lose your last deal?",
                "text_ar": "ليه آخر صفقة خسرتها؟"
            },
            {
                "key": "phase6_q2",
                "text_en": "What is the most common mistake you see new brokers make?",
                "text_ar": "إيه أكتر غلطة بتشوفها عند الوسطاء الجداد؟"
            },
            {
                "key": "phase6_q3",
                "text_en": "What type of clients do you usually avoid?",
                "text_ar": "إيه نوع العملاء اللي بتتجنبهم؟"
            }
        ],
        "success_criteria": [
            "Acknowledgment of past failures",
            "Constructive self-criticism",
            "Realistic client assessment"
        ],
        "red_flags": [
            "Claiming no losses ever",
            "Blaming others exclusively",
            "Overconfidence"
        ]
    }
}


def get_phase(phase_number: int) -> Dict[str, Any]:
    """Get phase configuration by number."""
    if phase_number not in INTERVIEW_PHASES:
        raise ValueError(f"Invalid phase number: {phase_number}")
    return INTERVIEW_PHASES[phase_number]


def get_total_max_score() -> int:
    """Get total maximum possible score across all phases."""
    return sum(phase["max_score"] for phase in INTERVIEW_PHASES.values())


def get_phase_names() -> List[str]:
    """Get list of all phase names."""
    return [phase["name"] for phase in INTERVIEW_PHASES.values()]

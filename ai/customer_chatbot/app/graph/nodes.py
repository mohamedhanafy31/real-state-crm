"""
LangGraph node definitions for conversation workflow.
Each node represents a step in the conversation processing pipeline.
"""

from typing import Dict, Any
from datetime import datetime
import json

from app.graph.state import ConversationState, ExtractedRequirements
from app.core.vector_store import get_vector_store
from app.core.llm import get_llm_service
from app.core.embeddings import get_embedding_service
from app.core.logging_config import get_logger
from app.services.backend_api import get_backend_api_service

logger = get_logger(__name__)


def receive_message(state: ConversationState) -> ConversationState:
    """Entry point - receives and preprocesses the user message.
    
    Args:
        state: Current conversation state.
        
    Returns:
        Updated state with timestamp.
    """
    logger.debug(f"Node [receive_message]: Processing message for {state['phone_number']}")
    state["timestamp"] = datetime.now().isoformat()
    return state


def load_session_state(state: ConversationState) -> ConversationState:
    """Load persistent session state from database.
    
    Args:
        state: Current conversation state.
        
    Returns:
        Updated state with loaded session data.
    """
    vector_store = get_vector_store()
    session_data = vector_store.get_customer_session(state["phone_number"])
    
    if session_data:
        # Merge existing session state - core fields
        state["extracted_requirements"] = session_data["extracted_requirements"]
        state["is_complete"] = session_data["is_complete"]
        # Workflow state fields (confirmation flow)
        state["confirmed"] = session_data.get("confirmed", False)
        state["awaiting_confirmation"] = session_data.get("awaiting_confirmation", False)
        state["confirmation_attempt"] = session_data.get("confirmation_attempt", 0)
        logger.info(f"Node [load_session_state]: Loaded existing session for {state['phone_number']} (confirmed: {state['confirmed']})")
    else:
        logger.debug(f"Node [load_session_state]: No existing session for {state['phone_number']}")
    
    return state


def retrieve_context(state: ConversationState) -> ConversationState:
    """Retrieve relevant context from vector store.
    
    Args:
        state: Current conversation state.
        
    Returns:
        Updated state with conversation history and retrieved context.
    """
    vector_store = get_vector_store()
    
    # Get conversation history
    history = vector_store.get_conversation_history(
        phone_number=state["phone_number"],
        limit=10
    )
    
    state["conversation_history"] = history
    
    # Search for similar past conversations
    similar_messages = vector_store.search_similar(
        query=state["user_message"],
        phone_number=state["phone_number"],
        limit=3
    )
    
    # Format retrieved context
    context = [
        f"[{msg_type}]: {msg_text}"
        for msg_type, msg_text, score in similar_messages
        if score > 0.5  # Only include relevant matches
    ]
    state["retrieved_context"] = context
    
    logger.debug(f"Node [retrieve_context]: Found {len(history)} history messages and {len(context)} context snippets")
    return state


def build_workflow_hint(state: ConversationState) -> str:
    """Build context hint based on current workflow state.
    
    This helps the LLM understand what phase the conversation is in,
    improving intent detection accuracy for contextual responses.
    
    Args:
        state: Current conversation state.
        
    Returns:
        Arabic hint string describing the current workflow state.
    """
    hint = ""
    
    # Confirmation phase
    if state.get("awaiting_confirmation"):
        attempt = state.get("confirmation_attempt", 1)
        hint = f"""
🔔 الحالة الحالية: انا سألت العميل عن تأكيد الطلب (المحاولة {attempt}).
قواعد التفسير:
- رسالة زي "تمام"/"اه"/"نعم"/"ok"/"ماشي" = confirm
- رسالة زي "لا"/"غلط"/"عدل"/"غير" = edit
- لو سأل سؤال جديد = inquiry
"""
    # Name correction phase
    elif state.get("awaiting_name_correction"):
        pending = state.get("pending_correction", {})
        field = pending.get("field", "اسم")
        hint = f"""
🔔 الحالة الحالية: انا سألت العميل عن تصحيح {field}.
قواعد التفسير:
- لو رد باسم جديد (كلمة أو كلمتين) = correction
- لو رد "صح"/"اه" = confirm
"""
    # Missing data phase
    elif state.get("missing_fields"):
        missing = state.get("missing_fields", [])[:2]
        hint = f"""
📋 معلومات ناقصة نحتاجها: {missing}
- لو العميل ذكر أي من المعلومات دي = new_search أو update_requirements
"""
    
    # Add known requirements summary
    reqs = state.get("extracted_requirements", {})
    known = [f"{k}={v}" for k, v in reqs.items() if v][:4]
    if known:
        hint += f"\n📋 المعلومات المسجلة حالياً: {', '.join(known)}"
    
    return hint


def refine_intent(raw_intent: str, state: ConversationState) -> str:
    """Apply rule-based refinements to LLM intent classification.
    
    This catches edge cases where the LLM might misclassify
    based on message text alone without understanding workflow context.
    
    Args:
        raw_intent: The intent returned by the LLM.
        state: Current conversation state.
        
    Returns:
        Refined intent string.
    """
    msg = state["user_message"].lower()
    
    # Confirmation phase rules (including closing phase)
    # We check if awaiting_confirmation OR (is_complete and not confirmed)
    in_confirmation_phase = state.get("awaiting_confirmation") or (state.get("is_complete") and not state.get("confirmed"))

    if in_confirmation_phase:
        confirm_words = ["تمام", "ok", "اه", "نعم", "صح", "ماشي", "اكيد", "موافق", "تأكيد", "اوك", "tmam", "aywa", "👍", "مظبوط", "كدة", "كده", "اوكي", "حاضر"]
        # Cancel MUST be checked BEFORE reject (since "مش عايز" contains "مش")
        cancel_words = ["خلاص", "مش عايز", "الغي", "إلغاء", "ابدأ من جديد", "cancel"]
        reject_words = ["غلط", "عدل", "غير", "لأ", "لأه", "no"]  # Removed "مش" and "لا" to avoid false positives
        
        
        # Priority 1: Check cancel first (most specific)
        if any(w in msg for w in cancel_words):
            logger.debug(f"[refine_intent] Override: {raw_intent} -> cancel (matched cancel word)")
            return "cancel"

        # Check if message is DATA (name/phone) vs pure confirmation
        is_reject = any(w in msg for w in reject_words)
        if not is_reject:
            msg_words = state["user_message"].split()
            # Check if ANY word is a confirm word
            has_confirm_word = any(w.lower() in confirm_words for w in msg_words)
            
            # FIXED LOGIC: If message has confirm word AND is short (<=5 words), it's likely pure confirmation
            # Examples: "اه تمام كدة مظبوط" (4 words), "تمام" (1 word), "ok yes" (2 words)
            if has_confirm_word and len(msg_words) <= 5:
                # Even if LLM said something else, this is confirmation
                if raw_intent not in ["inquiry", "new_search"]:
                    logger.debug(f"[refine_intent] Override: {raw_intent} -> confirm (short msg with confirm word)")
                    return "confirm"
            
            # If message is long (>5 words) AND has substantial non-confirm content, might be data
            elif len(msg_words) > 5:
                non_confirm_words = [w for w in msg_words if w.lower() not in confirm_words]
                if len(non_confirm_words) >= 3:  # Increased threshold to avoid false positives
                    logger.debug(f"[refine_intent] Override: {raw_intent} -> update_requirements (long msg with data)")
                    return "update_requirements"
        
        if raw_intent in ["follow_up", "unknown", "greeting"]:
            # Priority 2: Confirmation
            if any(w in msg for w in confirm_words):
                logger.debug(f"[refine_intent] Override: {raw_intent} -> confirm (matched confirmation word)")
                return "confirm"
    
    # Name correction phase rules
    if state.get("awaiting_name_correction"):
        # Priority 1: Check for confirmation of suggested name FIRST
        # Use exact match or space-separated to avoid substring issues (e.g. 'مدينتي' contains 'دي')
        confirm_phrases = ["صح", "اه", "نعم", "اكيد", "ده صح", "دي صح", "اه ده", "اه دي", "ايوه"]
        msg_words = msg.split()
        if any(w in msg_words for w in confirm_phrases) or msg.strip() in confirm_phrases:
            logger.debug(f"[refine_intent] Override: {raw_intent} -> confirm (confirmed suggested name)")
            return "confirm"
        
        # Priority 2: Short message = likely a name correction
        if raw_intent == "unknown" and len(state["user_message"].split()) <= 3:
            logger.debug(f"[refine_intent] Override: unknown -> correction (short message during name correction)")
            return "correction"
    
    return raw_intent


def detect_intent(state: ConversationState) -> ConversationState:
    """Detect the intent of the user message using state-aware classification.
    
    This function combines:
    1. Workflow state hints injected into the LLM prompt
    2. Rule-based post-processing for edge cases
    
    Args:
        state: Current conversation state.
        
    Returns:
        Updated state with detected intent.
    """
    llm_service = get_llm_service()
    
    # Build state-aware context hint
    workflow_hint = build_workflow_hint(state)
    
    intent_prompt = f"""حلل الرسالة التالية وحدد نية المستخدم.
    
الرسالة: {state["user_message"]}
{workflow_hint}
سياق المحادثة السابقة:
{json.dumps(state.get("conversation_history", [])[-3:], ensure_ascii=False)}

الأنواع المتاحة:
- new_search: يبحث عن وحدة عقارية جديدة (ويذكر مواصفات أو يطلب البدء)
- update_requirements: يريد تعديل متطلباته المسجلة
- inquiry: يسأل عن معلومات (مشاريع، أسعار، مناطق، مقارنة) - 🚨 أولوية قصوى إذا سأل عن "مشاريع" أو "أسعار"
- follow_up: متابعة لطلب سابق (بدون طلب معلومات جديدة)
- greeting: تحية فقط
- confirm: تأكيد البيانات أو الموافقة
- edit: يريد تعديل أثناء مرحلة التأكيد
- correction: يصحح اسم منطقة/مشروع/نوع وحدة
- cancel: يريد إلغاء الطلب أو البدء من جديد
- unknown: غير واضح

قواعد صارمة:
1. إذا سأل المستخدم عن "مشاريع"، "أسعار"، "تفاصيل"، "مناطق" -> النية هي 'inquiry' فوراً.
2. لا تختر 'follow_up' إذا كان هناك سؤال عن معلومات (Data Fetching needed).
3. أجب بنوع النية فقط (كلمة واحدة)."""

    response = llm_service.generate_response(
        user_message=intent_prompt,
        system_prompt="أنت محلل نوايا. أجب بكلمة واحدة فقط."
    )
    
    # Parse intent from response
    intent_map = {
        "new_search": "new_search",
        "update_requirements": "update_requirements",
        "inquiry": "inquiry",
        "follow_up": "follow_up",
        "greeting": "greeting",
        "confirm": "confirm",
        "edit": "edit",
        "correction": "correction",
        "cancel": "cancel",
    }
    
    raw_intent = response.strip().lower()
    detected = intent_map.get(raw_intent, "unknown")
    
    # Apply rule-based refinements
    final_intent = refine_intent(detected, state)
    state["intent"] = final_intent
    
    logger.debug(f"Node [detect_intent]: Workflow hint used:\n{workflow_hint}")
    logger.debug(f"Node [detect_intent]: Raw LLM Response: {response}")
    logger.info(f"Node [detect_intent]: Raw: {detected} -> Final: {final_intent}")
    return state


def extract_requirements(state: ConversationState) -> ConversationState:
    """Extract customer requirements from message using LLM.
    NOW WITH DB-BASED TRANSLATION: Arabic → English
    
    Args:
        state: Current conversation state.
        
    Returns:
        Updated state with extracted requirements in ENGLISH.
    """
    from app.services.name_matcher import get_name_matcher_service
    from app.services.backend_api import get_backend_api_service
    
    llm_service = get_llm_service()
    matcher = get_name_matcher_service()
    backend_api = get_backend_api_service()
    
    # FETCH DB VALUES for translation mapping
    try:
        areas = backend_api.get_areas()
        projects = backend_api.get_projects()
        unit_types = backend_api.get_unit_types()
        
        # Build translation maps
        area_map = "\n".join([f"- Arabic: '{a.get('name_ar', a['name'])}' → English: '{a['name']}' (ID: {a['area_id']})" 
                              for a in areas if a.get('name') and a.get('area_id')])  # Check area_id exists
        project_map = "\n".join([f"- '{p['name']}' (ID: {p['project_id']}, Area: {p.get('area', {}).get('name', 'N/A')})" 
                                 for p in projects[:20] if p.get('name') and p.get('project_id')])  # Limit to avoid token overflow
        unit_type_map = "\n".join([f"- Arabic: 'شقة' → 'Apartment', 'فيلا' → 'Villa', 'دوبلكس' → 'Duplex', 'استوديو' → 'Studio'"])
        
    except Exception as e:
        logger.warning(f"Failed to fetch DB values for extraction: {e}")
        area_map = "- North Coast, New Capital, Tagamoo, Madinty, Sharm El Sheikh"
        project_map = "- Hawabay, Crystal Resort, etc."
        unit_type_map = "- Apartment, Villa, Duplex, Studio"
    
    extraction_prompt = f"""استخرج متطلبات العميل العقارية من الرسالة التالية وترجمها للإنجليزية.

الرسالة: {state["user_message"]}

سياق سابق:
{json.dumps(state.get("retrieved_context", []), ensure_ascii=False)}

**قاعدة بيانات المناطق المتاحة:**
{area_map}

**قاعدة بيانات المشاريع المتاحة (عينة):**
{project_map}

**أنواع الوحدات:**
{unit_type_map}

أرجع JSON بالحقول التالية (ضع null للقيم غير الموجودة):
{{
    "customer_name": "اسم العميل المستخرج من الرسالة (مثل 'محمد احمد'). null إذا لم يذكر.",
    "customer_phone": "رقم الهاتف المستخرج (مثل '010xxxx'). null إذا لم يذكر.",
    "customer_email": "البريد الإلكتروني (مثل 'example@mail.com'). null إذا لم يذكر.",
    "area": "اسم المنطقة بالإنجليزية (استخدم قاعدة البيانات أعلاه للترجمة)",
    "area_id": رقم معرف المنطقة من قاعدة البيانات,
    "project": "اسم المشروع بالإنجليزية",
    "project_id": رقم معرف المشروع من قاعدة البيانات,
    "unit_type": "نوع الوحدة بالإنجليزية (Apartment/Villa/Duplex/Studio)",
    "budget_min": الحد الأدنى للميزانية (رقم),
    "budget_max": الحد الأقصى للميزانية (رقم),
    "size_min": الحد الأدنى للمساحة (رقم),
    "size_max": الحد الأقصى للمساحة (رقم),
    "bedrooms": عدد الغرف (رقم),
    "bathrooms": عدد الحمامات (رقم),
    "floor_preference": "ground_floor / high_floor / any",
    "needs_garden": true/false,
    "needs_roof": true/false,
    "additional_notes": "ملاحظات إضافية"
}}

قواعد مهمة:
1. **CRITICAL**: استخرج المنطقة/المشروع حتى لو كان السؤال استعلامي!
   - "المشاريع في الساحل الشمالي" → area: "North Coast", area_id: 6
   - "What projects in North Coast" → area: "North Coast", area_id: 6
   - "شقة في التجمع" → area: "Tagamoo", unit_type: "Apartment"
2. **ترجم للإنجليزية**: استخدم قاعدة البيانات أعلاه لترجمة الأسماء العربية
3. **استخرج المعرفات (IDs)**: ابحث عن area_id و project_id من قاعدة البيانات
4. Floor: "دور أرضي"/"ground floor" → "ground_floor" | "دور عالي"/"high floor" → "high_floor"
5. Garden: "حديقة"/"garden" → needs_garden=true
6. Roof: "روف"/"roof"/"سطح" → needs_roof=true

أرجع JSON فقط:"""

    response = llm_service.generate_response(
        user_message=extraction_prompt,
        system_prompt="أنت محلل بيانات عقارية. أرجع JSON صالح فقط مع ترجمة الأسماء للإنجليزية."
    )
    
    # Parse JSON response
    try:
        # Clean the response to get pure JSON
        json_str = response.strip()
        if json_str.startswith("```"):
            json_str = json_str.split("```")[1]
            if json_str.startswith("json"):
                json_str = json_str[4:]
        
        new_requirements = json.loads(json_str)
        
        # MERGE with existing requirements
        existing = state.get("extracted_requirements", {})
        merged = {**existing}
        
        # PROACTIVE FUZZY MATCHING: Match area/project against DB and ask for confirmation
        pending_confirmation_needed = False
        confirmation_messages = []
        
        for key, value in new_requirements.items():
            if value is not None and value != "null":
                if key in ["customer_name", "customer_email"]:
                    state[key] = value
                elif key == "customer_phone":
                    pass  # We have phone from webhook
                else:
                    # CRITICAL: Fuzzy match area/project immediately
                    if key == "area" and value:
                        match_result = matcher.match_area(value)
                        if match_result.matched:
                            # Got exact match → use English name
                            merged["area"] = match_result.value
                            merged["area_id"] = match_result.id
                            # Ask user to confirm if input was Arabic
                            if value != match_result.value:  # Different = was Arabic
                                confirmation_messages.append(f"المنطقة: **{match_result.value}**")
                                pending_confirmation_needed = True
                        elif match_result.alternatives:
                            # Ambiguous → ask user to choose
                            state["area_alternatives"] = match_result.alternatives
                            state["area_original"] = value
                            pending_confirmation_needed = True
                            confirmation_messages.append(f"المنطقة '{value}' - يرجى التوضيح")
                        else:
                            # No match → keep as-is for now
                            merged["area"] = value
                    
                    elif key == "project" and value:
                        area_id = merged.get("area_id")  # Use area_id if available
                        match_result = matcher.match_project(value, area_id=area_id)
                        if match_result.matched:
                            merged["project"] = match_result.value
                            merged["project_id"] = match_result.id
                            if value != match_result.value:
                                confirmation_messages.append(f"المشروع: **{match_result.value}**")
                                pending_confirmation_needed = True
                        elif match_result.alternatives:
                            state["project_alternatives"] = match_result.alternatives
                            state["project_original"] = value
                            pending_confirmation_needed = True
                            confirmation_messages.append(f"المشروع '{value}' - يرجى التوضيح")
                        else:
                            merged["project"] = value
                    
                    else:
                        # Other fields → merge directly
                        merged[key] = value
        
        state["extracted_requirements"] = merged
        
        # If we need confirmation, generate a confirmation message
        if pending_confirmation_needed and confirmation_messages:
            confirmation_text = "\n".join(confirmation_messages)
            state["awaiting_name_confirmation"] = True
            state["clarification_question"] = f"""فهمت منك:\n{confirmation_text}\n\n**انت قصدك كده صح؟** اكتب 'نعم' للتأكيد أو صحح المعلومة."""
        
        
        # FIX: Infinite Loop Break - Auto-confirm if contact info provided during confirmation OR closing phase
        # We check if awaiting_confirmation OR (is_complete and not confirmed) - meaning we are in "booking" phase
        in_confirmation_phase = state.get("awaiting_confirmation") or (state.get("is_complete") and not state.get("confirmed"))
        
        if in_confirmation_phase:
            # Check if name or phone was JUST extracted
            new_name = new_requirements.get("customer_name")
            new_phone = new_requirements.get("customer_phone")
            
            # If we were missing them, and now we have them -> Auto Confirm
            missing_before = state.get("missing_fields", [])
            has_new_contact = (new_name and "customer_name" in missing_before) or \
                              (new_phone and "customer_phone" in missing_before) or \
                              (new_name and new_phone)
                              
            if has_new_contact:
                state["confirmed"] = True
                logger.info(f"Node [extract_requirements]: Auto-confirming request - User provided contact info: {new_name}, {new_phone}")

        logger.info(f"Node [extract_requirements]: Merged requirements - {len(merged)} fields, Confirmation needed: {pending_confirmation_needed}")
    except json.JSONDecodeError:
        logger.error("Node [extract_requirements]: Failed to parse LLM response as JSON")
        if "extracted_requirements" not in state:
            state["extracted_requirements"] = {}
        state["error"] = "Failed to parse requirements"
    
    return state


def check_missing_data(state: ConversationState) -> ConversationState:
    """Check for missing required data.
    
    Args:
        state: Current conversation state.
        
    Returns:
        Updated state with missing fields list.
    """
    requirements = state.get("extracted_requirements", {})
    
    missing = []
    
    # Relaxed validation: Area + (Budget OR Size OR Type) is enough to start
    # Bedrooms and detailed size are optional "soft" requirements
    
    # Check Area
    if not requirements.get("area"):
        missing.append("area")

    # Check at least one other constraint to narrow down
    has_other_constraint = (
        requirements.get("unit_type") or 
        requirements.get("budget_max") or 
        requirements.get("size_min")
    )
    
    if not has_other_constraint:
         missing.append("requirements") # Generic missing tag
    
    # Optional suggestions logic remains...
            
    # HIERARCHY LOGIC:
    # If we have Area but NO Project, we should suggest projects (but it's not a blocking "missing field" for the request object itself,
    # unless we want to force project selection. Let's make it a suggestion step).
    # We'll treat "project" as a soft-requirement: if missing, we ask "Do you have a specific project?"
    # But if the user says "No" or ignores it, we proceed. to avoid blocking.
    # actually, user wants "Available projects should be listed".
    
    # HIERARCHY LOGIC:
    # If we have Area but NO Project, we check if there ARE projects to serve suggestions.
    if requirements.get("area") and not requirements.get("project") and not state.get("project_suggested"):
        from app.services.backend_api import get_backend_api_service
        backend_api = get_backend_api_service()
        projects = backend_api.get_projects(requirements.get("area"))
        
        if projects:
            state["should_suggest_projects"] = True
            logger.info(f"Node [check_missing_data]: Found {len(projects)} projects for {requirements.get('area')}, suggesting...")
        else:
            state["should_suggest_projects"] = False
            logger.debug(f"Node [check_missing_data]: No projects found for {requirements.get('area')}, skipping suggestion.")
    else:
        state["should_suggest_projects"] = False
    
    state["missing_fields"] = missing
    
    # If suggesting projects, we are NOT complete (we want to ask)
    if state.get("should_suggest_projects"):
        state["is_complete"] = False
        state["should_ask_clarification"] = True
    else:
        state["is_complete"] = len(missing) == 0
        state["should_ask_clarification"] = len(missing) > 0
    
    logger.info(f"Node [check_missing_data]: Complete: {state['is_complete']}, Missing: {missing}, Suggest Project: {state.get('should_suggest_projects')}")
    return state


def generate_clarification(state: ConversationState) -> ConversationState:
    """Generate a clarification question for missing data.
    
    Args:
        state: Current conversation state.
        
    Returns:
        Updated state with clarification question.
    """
    if not state.get("should_ask_clarification"):
        return state
    
    
    missing = state.get("missing_fields", [])
    logger.info(f"Node [generate_clarification]: Entry - Suggest Project: {state.get('should_suggest_projects')}, Missing: {missing}")
    
    # Prioritize Project Suggestion
    if state.get("should_suggest_projects"):
        area_name = state.get("extracted_requirements", {}).get("area")
        from app.services.backend_api import get_backend_api_service
        backend_api = get_backend_api_service()
        projects = backend_api.get_projects(area_name)
        
        logger.info(f"Node [generate_clarification]: Suggesting for area '{area_name}' - Found {len(projects) if projects else 0} projects")
        
        if projects:
            project_list = "\n".join([f"• {p['name']}" for p in projects[:5]])
            state["clarification_question"] = f"ممتاز! في {area_name} عندنا مشاريع مميزة:\n{project_list}\n\nتحب تحدد مشروع معين ولا ندور في المنطقة كلها؟"
            state["project_suggested"] = True # Mark as asked so we don't loop
            return state
        else:
            logger.warning(f"Node [generate_clarification]: 'should_suggest_projects' was True but no projects found for '{area_name}'.")
    
    # Field to Arabic mapping
    field_names = {
        "area": "المنطقة",
        "unit_type": "نوع الوحدة",
        "budget_max": "الحد الأقصى للميزانية",
        "size_min": "المساحة المطلوبة (متر مربع)",
        "bedrooms": "عدد الغرف",
        "bathrooms": "عدد الحمامات"
    }
    
    # Ask about the first missing field
    if missing:
        first_missing = missing[0]
        field_name = field_names.get(first_missing, first_missing)
        
        # Proactive area suggestion
        if first_missing == "area":
            from app.services.backend_api import get_backend_api_service
            backend_api = get_backend_api_service()
            areas = backend_api.get_areas()
            state["available_areas"] = areas
            area_list = "\n".join([f"• {a['name']}" for a in areas])
            state["clarification_question"] = f"ممكن تحدد لي المنطقة اللي بتدور عليها؟\n\nالمناطق المتاحة حالياً:\n{area_list}"
        
        elif first_missing == "unit_type":
            # Check if we have a project selected to filter types
            project_name = state.get("extracted_requirements", {}).get("project")
            
            # Default types
            unit_types = [
                {"name": "شقة", "id": "apartment"},
                {"name": "فيلا", "id": "villa"},
                {"name": "تاون هاوس", "id": "townhouse"},
                {"name": "دوبلكس", "id": "duplex"},
            ]
            
            msg_intro = "ايه نوع الوحدة اللي بتدور عليها؟"
            
            if project_name:
                 msg_intro = f"في {project_name}، ايه نوع الوحدة المناسب ليك؟"
            
            state["available_areas"] = unit_types  # Reusing available_areas field for buttons
            unit_list = "\n".join([f"• {u['name']}" for u in unit_types])
            state["clarification_question"] = f"{msg_intro}\n\nالأنواع الشائعة:\n{unit_list}"
        
        elif first_missing == "size_min":
            state["clarification_question"] = "ممكن تحدد لي المساحة التقريبية اللي محتاجها (بالمتر المربع)؟ هذا التفصيل مهم عشان نلاقيلك الأنسب."
            
        else:
            state["clarification_question"] = f"ممكن تحدد لي {field_name} اللي بتدور عليها؟"
            
        logger.info(f"Node [generate_clarification]: Prepared question for: {first_missing}")
    
    return state


def requirement_confirmation(state: ConversationState) -> ConversationState:
    """Summarize requirements and ask for final confirmation.
    
    Features:
    - Varied messages based on confirmation attempt (fatigue handling)
    - Support for edit flow
    - Mandatory confirmation before request creation
    
    Args:
        state: Current conversation state.
        
    Returns:
        Updated state with confirmation question.
    """
    if not state.get("is_complete") or state.get("confirmed"):
        return state
    
    reqs = state.get("extracted_requirements", {})
    
    # Check if user intends to confirm (or provided contact info which implies confirmation)
    if state.get("intent") == "confirm" or (state.get("customer_name") and state.get("awaiting_confirmation")):
        
        # FINAL CHECK: Do we have contact info?
        if not state.get("customer_name"):
            state["response"] = """ممتاز! عشان أقدر أكمل الحجز وأحول طلبك لفريق المبيعات، محتاج منك بعض البيانات البسيطة:

*   الاسم بالكامل
*   رقم تليفون للتواصل (لو غير الرقم الحالي)

اكتبهم في رسالة واحدة وهكملك الإجراء فوراً. 👇"""
            state["awaiting_confirmation"] = True  # Still waiting, but now for contact info
            return state
            
        # We have contact info -> PROCEED
        state["confirmed"] = True
        state["awaiting_confirmation"] = False
        logger.info(f"Node [requirement_confirmation]: User confirmed requirements. Name: {state.get('customer_name')}")
        return state
    
    # Check if user wants to edit
    if state.get("intent") == "edit":
        state["awaiting_confirmation"] = False
        logger.info("Node [requirement_confirmation]: User wants to edit")
        return state
    
    # Get confirmation attempt count
    attempt = state.get("confirmation_attempt", 0)
    
    # Field labels for summary
    labels = {
        "area": "📍 المنطقة",
        "project": "🏗️ المشروع",
        "unit_type": "🏠 نوع الوحدة",
        "budget_max": "💰 الميزانية",
        "bedrooms": "🛏️ الغرف",
        "bathrooms": "🚿 الحمامات",
        "size_max": "📐 المساحة (م2)"
    }
    
    summary_parts = []
    for key, label in labels.items():
        val = reqs.get(key)
        if val:
            summary_parts.append(f"• {label}: {val}")
    
    summary = "\n".join(summary_parts)
    
    # Varied intro based on attempt (fatigue handling) or if no units found
    matched_units = state.get("matched_units", [])
    
    if not matched_units:
        intro = "للأسف ملاقيتش وحدات مطابقة بالظبط في قاعدة البيانات حالياً 😔\n\nلكن ولا يهمك! ممكن أسجل طلبك فوراً وفريق المبيعات هيدور لك مخصوص ويتواصل معاك.\n\nدي تفاصيل طلبك:\n\n"
        closing = "\n\n**تحب أسجل الطلب بالبيانات دي؟**"
    elif attempt == 0:
        intro = "خليني أتأكد من طلبك:\n\n"
        closing = "\n\n**كده تمام؟** ولا تحب تعدل حاجة؟"
    elif attempt == 1:
        intro = "تمام، خلينا نراجعها مرة أخيرة بس 👌\n\n"
        closing = "\n\n**كده صح؟**"
    else:
        intro = "آخر مراجعة:\n\n"
        closing = "\n\n**نأكد ونبدأ؟**"
    
    state["response"] = f"{intro}{summary}{closing}"
    state["awaiting_confirmation"] = True
    state["confirmation_attempt"] = attempt + 1
    
    # Provide buttons
    state["confirmation_buttons"] = [
        {"name": "تأكيد ✅", "id": "confirm"},
        {"name": "تعديل 📝", "id": "edit"}
    ]
    
    logger.info(f"Node [requirement_confirmation]: Attempt {attempt + 1} - asking for confirmation")
    return state


def generate_response(state: ConversationState) -> ConversationState:
    """Generate the final response using LLM.
    
    Args:
        state: Current conversation state.
        
    Returns:
        Updated state with generated response.
    """
    # If a response is already prepared (e.g., by confirmation or inquiry node), keep it
    if state.get("response") and (state.get("intent") == "confirm" or not state.get("is_complete") and state.get("confirmed") is False):
        if state.get("intent") == "confirm" and state.get("confirmed"):
             # After confirmation, we might want a success message
             state["response"] = "تم بنجاح! جاري إرسال طلبك للوسطاء. هقوم بالبحث عن وحدات مطابقة لمواصفاتك الآن."
        else:
             return state
    
    # If we're in confirmation flow (response already set by requirement_confirmation)
    if state.get("response") and state.get("is_complete") and not state.get("confirmed"):
        logger.info(f"Node [generate_response]: Source -> Confirmation Flow")
        return state

    llm_service = get_llm_service()
    
    # Build context from retrieved messages
    context = "\n".join(state.get("retrieved_context", []))
    
    # Build the response based on intent and state
    if state.get("intent") == "greeting":
        from app.services.backend_api import get_backend_api_service
        backend_api = get_backend_api_service()
        areas = backend_api.get_areas()
        area_list = "\n".join([f"• {a['name']}" for a in areas])
        
        state["response"] = f"""أهلاً وسهلاً! أنا مساعدك في البحث عن العقارات.

أقدر أساعدك في إيجاد وحدات في المناطق المتاحة لدينا:
{area_list}

حابب تبدأ البحث في أي منطقة؟"""
        return state
    
    # Handle Inquiry Response
    if state.get("intent") == "inquiry":
        inquiry_results = state.get("inquiry_results", {})
        
        # Check if we need to capture a lead instead of answering
        if inquiry_results.get("type") == "lead_capture_needed":
            state["response"] = """أنا هنا لمساعدتك في العثور على أنسب وحدة عقارية لك.
            
وعشان أقدر أخدمك بشكل أفضل، محتاج أعرف شوية تفاصيل:
1. المنطقة اللي بتفضلها؟
2. الميزانية التقريبية؟
3. نوع الوحدة (شقة، فيلا، إلخ)؟

بمجرد ما تديني التفاصيل دي، هسجل طلبك وأخلي حد من الفريق يتواصل معاك فوراً."""
            # Reset complete state to encourage requirement gathering if not already started
            state["is_complete"] = False
            return state

        # CRITICAL FIX: Reduce data sent to LLM to prevent token overflow
        # Only send essential fields, not full objects
        inquiry_type = inquiry_results.get("type")
        limited_results = {"type": inquiry_type}
        
        if inquiry_type == "projects" and inquiry_results.get("data"):
            # Only send project names and count, not full objects
            projects = inquiry_results["data"]
            limited_results["count"] = len(projects)
            limited_results["names"] = [p.get("name") for p in projects[:10]]  # Max 10 names
            limited_results["area"] = inquiry_results.get("area_filter")
        elif inquiry_type == "units_search" and inquiry_results.get("data"):
            # Only send unit count and basic info
            units = inquiry_results["data"]
            limited_results["count"] = len(units)
            limited_results["sample"] = [{
                "type": u.get("unitType"),
                "price": u.get("price"),
                "size": u.get("size"),
                "project": u.get("project", {}).get("name")
            } for u in units[:5]]  # Max 5 samples
        elif inquiry_type == "price_range":
            # Price range is already small
            limited_results["data"] = inquiry_results.get("data", {})
        elif inquiry_type == "ambiguous_entity":
            limited_results["entity_type"] = inquiry_results.get("entity_type")
            limited_results["original"] = inquiry_results.get("original")
            limited_results["alternatives"] = inquiry_results.get("alternatives", [])[:5]  # Max 5
        
        elif inquiry_type == "general_qa":
            # Allow general Q&A using RAG context
            limited_results["note"] = "General inquiry - use constraints from context"

        # CRITICAL FIX: Strict anti-hallucination prompt with LIMITED data
        if inquiry_type == "general_qa":
             # Relaxed prompt for general questions
             system_prompt = f"""أنت مساعد عقارات ذكي. العميل يسأل سؤال عام.
             
             القواعد:
             1. أجب بناءً على المعلومات المتاحة في السياق (Context) فقط.
             2. إذا كانت المعلومة غير موجودة، قل "لا توجد لدي معلومة مؤكدة حالياً".
             3. كن ودوداً ومساعداً.
             """
        else:
             # Strict data-driven prompt for specific search results
             system_prompt = f"""أنت مساعد عقارات ذكي. العميل سأل سؤال استعلامي.
    
             **قواعد صارمة - يحظر تماماً مخالفتها:**
             1. **استخدم البيانات الحقيقية فقط** من نتائج البحث أدناه
             2. **ممنوع منعاً باتاً** اختراع أسماء مشاريع أو أسعار أو معلومات
             3. إذا كانت النتائج فارغة أو null، قل "لا توجد معلومات متاحة حالياً"
             4. **لا تذكر أي اسم مشروع أو سعر ليس موجود في البيانات أدناه**
             
             نتائج البحث (محدودة): {json.dumps(limited_results, ensure_ascii=False)}
             
             **المطلوب:**
             - إذا كانت النتيجة "ambiguous_entity": أخبر العميل أنك لم تجد الاسم بالضبط واعرض الخيارات من "alternatives"
             - إذا كانت النتيجة "projects": اذكر أسماء المشاريع من "names" فقط وعددها من "count"
             - إذا كانت "data" فارغة أو null: قل "لا توجد مشاريع متاحة في هذه المنطقة في قاعدة البيانات"
             - إذا كانت "units_search": اعرض عدد الوحدات وعينة من "sample" مع أسعارها الحقيقية فقط
             - إذا كانت "price_range": اعرض min/max/count من "data"
             
             **تحذير أخير**: أي معلومة غير موجودة في نتائج البحث أعلاه هي اختراع محظور."""
        
        logger.info(f"Node [generate_response]: Source -> Inquiry Results (Anti-Hallucination Mode, Limited Data)")
        response = llm_service.generate_response(
            user_message=state["user_message"],
            context=context,
            conversation_history=state.get("conversation_history"),
            system_prompt=system_prompt
        )
        state["response"] = response
        return state
    
    if state.get("should_ask_clarification") and state.get("clarification_question"):
        # Combine acknowledgment with clarification
        llm_service = get_llm_service()
        logger.info(f"Node [generate_response]: Source -> Clarification Question")
        response = llm_service.generate_response(
            user_message=state["user_message"],
            context=context,
            conversation_history=state.get("conversation_history"),
            system_prompt=f"""أنت مساعد عقارات. العميل أرسل رسالة ومحتاج توضيح.
            
المعلومات المستخرجة: {json.dumps(state.get("extracted_requirements", {}), ensure_ascii=False)}
السؤال المطلوب: {state["clarification_question"]}

اعترف بما فهمته، ثم اسأل السؤال التوضيحي. كن موجزاً وودوداً."""
        )
        state["response"] = response
    else:
        # Check if we have unit search results
        matched_units = state.get("matched_units", [])
        request_id = state.get("request_id")
        
        if state.get("is_complete") and request_id:
            # Request successfully created - Confirm assignment to broker
            units_section = ""
            if matched_units:
                units_list = chr(10).join([f"• {u['unit_code']} - {u.get('price', 'السعر عند الطلب')} جنية" for u in matched_units[:3]])
                units_section = f"\n\nالوحدات المقترحة مبدئياً:\n{units_list}"
            
            state["response"] = f"""تم استلام طلبك بنجاح! ✅
رقم الطلب: #{request_id}

تم تحويل طلبك لأحد مستشارينا المتميزين في فريق المبيعات. هيتواصل معاك في أقرب وقت عشان يعرض عليك الوحدات المتاحة بأسعارها وتفاصيل السداد.{units_section}

هل تحب نعمل بحث تاني؟"""
            logger.info(f"Node [generate_response]: Source -> Request Created Success")
            return state
        
        elif state.get("is_complete") and state.get("area_not_found"):
            # Area not found scenario
             pass # Will fallthrough to LLM or handle explicitly
             
        # FALLBACK / GENERIC RESPONSE
        # Ensuring we pass matched units to context if available
        units_context = ""
        if matched_units:
            units_context = f"\nMatched Units Details:\n{json.dumps(matched_units, ensure_ascii=False)}"
        
        system_prompt = f"""أنت مساعد عقارات. ساعد العميل في العثور على وحدات مناسبة.
        
        تعليمات صارمة:
        1. لا تذكر أسماء مشاريع أو وحدات غير موجودة في بيانات الوحدات المتاحة (Matched Units).
        2. إذا لم تجد وحدات في البيانات، قل أنك ستقوم بتسجيل الطلب للبحث.
        3. كن ودوداً ومحترفاً.
        
        {units_context}"""
        
        logger.info(f"Node [generate_response]: Source -> Generic Fallback")
        response = llm_service.generate_response(
            user_message=state["user_message"],
            context=context,
            conversation_history=state.get("conversation_history"),
            system_prompt=system_prompt
        )
        state["response"] = response
        return state

        # If search completed but not confirmed yet
        if matched_units:
             # Construct units string for LLM context
             units_str = json.dumps(matched_units[:5], ensure_ascii=False)
             
             system_prompt = f"""أنت مساعد عقارات. وجدت بعض الوحدات التي قد تناسب العميل.
             
الوحدات المقترحة:
{units_str}

المطلوب:
1. قدم أفضل 3 خيارات للعميل بناءً على طلبه.
2. استخدم البيانات الحقيقية فقط (السعر، المساحة، اسم المشروع) من القائمة أعلاه.
3. لا تختلق أي بيانات (مثل "اسم الكمباوند" أو "السعر").
4. اسأل العميل إذا كان يريد حجز أي منها.
"""
             response = llm_service.generate_response(
                user_message=state["user_message"],
                context=context,
                conversation_history=state.get("conversation_history"),
                system_prompt=system_prompt
             )
             state["response"] = response
             return state
        
        elif state.get("available_areas"):
            # Area not found - suggest available areas to user
            area_not_found = state.get("area_not_found", "المنطقة المحددة")
            available_areas = state.get("available_areas", [])
            
            # Format available areas list
            areas_list = "\n".join([f"• {area['name']}" for area in available_areas])
            
            state["response"] = f"""عذراً، لم أتمكن من العثور على منطقة تسمى "{area_not_found}" في قاعدة البيانات.

المناطق المتاحة حالياً هي:
{areas_list}

من فضلك اختر واحدة من هذه المناطق وسأساعدك في إيجاد الوحدة المناسبة."""
            
            # Mark as not complete so user can specify correct area
            state["is_complete"] = False
        
        elif state.get("is_complete") and not request_id and not state.get("available_areas"):
            # Complete but request creation failed (shouldn't happen often if areas check passed)
            state["response"] = "حدث خطأ بسيط أثناء تسجيل طلبك، ولكن لا تقلق. سأقوم بإبلاغ الدعم الفني فوراً. هل تحب أن تترك لي ملاحظة إضافية؟"
        
        else:
            # Generate regular response
            response = llm_service.generate_response(
                user_message=state["user_message"],
                context=context,
                conversation_history=state.get("conversation_history")
            )
            state["response"] = response
    
    return state


def format_units_for_display(units: list) -> str:
    """Format unit search results for display in Arabic.
    
    Args:
        units: List of unit dictionaries from backend.
        
    Returns:
        Formatted string with unit details.
    """
    if not units:
        return "لا توجد وحدات متاحة"
    
    formatted = []
    for i, unit in enumerate(units[:5], 1):  # Top 5 units
        project_name = unit.get("project", {}).get("name", "غير محدد")
        area_name = unit.get("project", {}).get("area", {}).get("name", "غير محدد")
        unit_type = unit.get("unitType", "غير محدد")
        size = unit.get("size", 0)
        price = unit.get("price", 0)
        building = unit.get("building", "")
        floor = unit.get("floor", "")
        
        # Format price in millions if over 1M
        if price >= 1000000:
            price_str = f"{price / 1000000:.1f} مليون جنيه"
        else:
            price_str = f"{price:,.0f} جنيه"
        
        unit_details = f"""{i}. {unit_type} - {project_name}
   📍 المنطقة: {area_name}
   📐 المساحة: {size} متر مربع
   💰 السعر: {price_str}"""
        
        if building:
            unit_details += f"\n   🏢 المبنى: {building}"
        if floor:
            unit_details += f" - الدور: {floor}"
        
        formatted.append(unit_details)
    
    return "\n\n".join(formatted)


def persist_conversation(state: ConversationState) -> ConversationState:
    """Persist the conversation to vector store.
    
    Args:
        state: Current conversation state.
        
    Returns:
        Same state (final node).
    """
    vector_store = get_vector_store()
    
    # Store user message
    vector_store.store_message(
        phone_number=state["phone_number"],
        message_type="user",
        message_text=state["user_message"],
        metadata={
            "intent": state.get("intent"),
            "requirements": state.get("extracted_requirements"),
            "timestamp": state.get("timestamp")
        }
    )
    
    # Store assistant response
    if state.get("response"):
        vector_store.store_message(
            phone_number=state["phone_number"],
            message_type="assistant",
            message_text=state["response"],
            metadata={
                "timestamp": state.get("timestamp")
            }
        )
    
    return state


def save_session_state(state: ConversationState) -> ConversationState:
    """Save current session state to database.
    
    Args:
        state: Current conversation state.
        
    Returns:
        Same state.
    """
    vector_store = get_vector_store()
    vector_store.save_customer_session(
        phone_number=state["phone_number"],
        extracted_requirements=state.get("extracted_requirements", {}),
        last_intent=state.get("intent", "unknown"),
        is_complete=state.get("is_complete", False),
        confirmed=state.get("confirmed", False),
        awaiting_confirmation=state.get("awaiting_confirmation", False),
        confirmation_attempt=state.get("confirmation_attempt", 0)
    )
    logger.debug(f"Node [save_session_state]: Session saved for {state['phone_number']} (confirmed: {state.get('confirmed')})")
    return state


def search_units(state: ConversationState) -> ConversationState:
    """Search for matching units from backend.
    
    Args:
        state: Current conversation state.
        
    Returns:
        Updated state with matched units.
    """
    if not state.get("is_complete"):
        logger.debug("Node [search_units]: Skipping - requirements not complete")
        return state
    
    backend_api = get_backend_api_service()
    reqs = state.get("extracted_requirements", {})
    
    try:
        units = backend_api.search_units(
            area_name=reqs.get("area"),
            project_name=reqs.get("project"),
            unit_type=reqs.get("unit_type"),
            budget_max=reqs.get("budget_max"),
            size_min=reqs.get("size_min"),
            bedrooms=reqs.get("bedrooms")
        )
        
        state["matched_units"] = units[:5]  # Top 5 results
        logger.info(f"Node [search_units]: Found {len(units)} matching units")
    except Exception as e:
        logger.error(f"Node [search_units]: Error - {e}")
        state["matched_units"] = []
    
    return state


def create_customer_request(state: ConversationState) -> ConversationState:
    """Create formal request in backend CRM.
    
    Args:
        state: Current conversation state.
        
    Returns:
        Updated state with request_id.
    """
    if not state.get("is_complete") or not state.get("confirmed"):
        logger.debug("Node [create_request]: Skipping - requirements not complete or confirmed")
        return state
    
    backend_api = get_backend_api_service()
    reqs = state.get("extracted_requirements", {})
    
    try:
        # Get or create customer with updated contact info
        customer_data = {
            "name": reqs.get("customer_name") or state.get("customer_name"),
            "phone": reqs.get("customer_phone") or state["phone_number"],
            "email": reqs.get("customer_email")
        }
        
        customer_id = backend_api.get_or_create_customer(
            phone=state["phone_number"],
            name=customer_data["name"]
        )
        # Update customer info if new details provided
        if customer_data["name"] or customer_data["email"]:
            # Note: You might want a backend method to update customer details, 
            # or pass them to create_request to handle persistence.
            pass

        # Get area ID
        area_name = reqs.get("area")
        if area_name:
            area_id = backend_api.get_area_id_by_name(area_name)
            if area_id:
                # Create request
                request_id = backend_api.create_request(
                    customer_id=customer_id,
                    area_id=area_id,
                    requirements=reqs
                )
                state["request_id"] = request_id
                state["customer_id"] = customer_id
                state["confirmed"] = False  # Reset for future requests if needed
                logger.info(f"Node [create_request]: Created request {request_id} for customer {customer_id}")
                
                # Sync conversation history to persistent SQL storage
                try:
                    vector_store = get_vector_store()
                    # Fetch recent history (last 20 messages)
                    history = vector_store.get_conversation_history(state["phone_number"], limit=20)
                    
                    synced_count = 0
                    for msg in history:
                        # Map role to actor_type
                        # 'user' -> 'customer', 'assistant' -> 'ai'
                        if msg['role'] == 'user':
                            actor_type = 'customer'
                            actor_id_val = customer_id
                        else:
                            actor_type = 'ai'
                            actor_id_val = None
                            
                        success = backend_api.save_conversation(
                            request_id=request_id,
                            actor_type=actor_type,
                            message=msg['content'],
                            actor_id=actor_id_val
                        )
                        if success:
                            synced_count += 1
                            
                    logger.info(f"Node [create_request]: Synced {synced_count} messages to conversations table")
                    
                except Exception as e:
                    logger.error(f"Node [create_request]: Error syncing history - {e}")

            else:
                # Area not found - fetch all available areas to suggest
                logger.warning(f"Node [create_request]: Area '{area_name}' not found - fetching alternatives")
                all_areas = backend_api.get_areas()
                state["available_areas"] = all_areas
                state["area_not_found"] = area_name
                state["request_id"] = None  # Ensure request_id is None
                logger.info(f"Node [create_request]: Fetched {len(all_areas)} available areas for suggestion")
        else:
            logger.warning("Node [create_request]: No area specified in requirements")
    
    except Exception as e:
        logger.error(f"Node [create_request]: Error - {e}")
    
    return state


def classify_inquiry_logic(user_message: str, context_str: str = "") -> dict:
    """Classify user inquiry using a lightweight LLM router.
    
    Uses Cohere command-r7b-12-2024 for speed.
    """
    llm_service = get_llm_service()
    
    router_prompt = f"""You are a smart router for a Real Estate Chatbot. 
    Analyze the user's question and classify it into ONE of these categories:
    
    1. price_check: Question about price, cost, down payment, installments.
    2. availability_check: Question about what units are available, types (apartments/villas), or specific availability.
    3. project_comparison: Asking to compare 2+ projects or areas.
    4. location_info: Asking about a specific area, location, or where something is.
    5. general_qa: General questions about the company, real estate market, or generic "how are you".
    
    User Message: "{user_message}"
    Context: {context_str}
    
    Return JSON ONLY:
    {{
        "type": "category_name",
        "entities": {{
            "project": "extracted_project_name_or_null",
            "area": "extracted_area_name_or_null",
            "unit_type": "extracted_unit_type_or_null"
        }}
    }}
    """
    
    try:
        response = llm_service.generate_response(
            user_message=router_prompt,
            system_prompt="You are a JSON-only classification router. Output valid JSON."
        )
        
        # Parse JSON
        import re
        json_match = re.search(r"\{.*\}", response, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(0))
        return {"type": "general_qa", "entities": {}}
        
    except Exception as e:
        logger.error(f"Router failed: {e}")
        return {"type": "general_qa", "entities": {}}


def handle_inquiry(state: ConversationState) -> ConversationState:
    """Handle general inquiry requests using Smart LLM Routing.
    
    Replaces keyword matching with semantic classification.
    """
    backend_api = get_backend_api_service()
    from app.services.name_matcher import get_name_matcher_service
    matcher = get_name_matcher_service()
    
    message = state["user_message"]
    reqs = state.get("extracted_requirements", {})
    
    # Context for extraction (e.g. if we know they are looking in New Capital)
    context_str = f"Current Focus: Area={reqs.get('area')}, Project={reqs.get('project')}"
    
    # 1. CLASSIFY
    classification = classify_inquiry_logic(message, context_str)
    inquiry_type = classification.get("type", "general_qa")
    entities = classification.get("entities", {})
    
    logger.info(f"Node [handle_inquiry]: Smart Router Classification -> {inquiry_type} | Entities: {entities}")
    state["inquiry_classification"] = classification
    
    results = {}
    
    try:
        # Merge extracted entities with state requirements if trusted
        target_project_name = entities.get("project") or reqs.get("project")
        target_area_name = entities.get("area") or reqs.get("area")
        target_unit = entities.get("unit_type") or reqs.get("unit_type") # This might need mapping too

        # Resolve IDs
        target_project_id = reqs.get("project_id")
        target_area_id = reqs.get("area_id")

        if target_project_name and not target_project_id:
             p_match = matcher.match_project(target_project_name)
             if p_match.matched:
                 target_project_id = p_match.id
                 target_project_name = p_match.value # Canonical name
        
        if target_area_name and not target_area_id:
             a_match = matcher.match_area(target_area_name)
             if a_match.matched:
                 target_area_id = a_match.id
                 target_area_name = a_match.value

        # Map Unit Type (Arabic -> English)
        if target_unit:
             # simple quick mapping or use the one from extract_requirements logic if reusable
             # For now, let's reuse the mapping logic if possible or duplicate simple version
             type_map = {
                'شقة': 'Apartment', 'شقق': 'Apartment',
                'فيلا': 'Villa', 'فلل': 'Villa',
                'تاون': 'Town House', 'توين': 'Twin House',
                'شاليه': 'Chalet', 'ستوديو': 'Studio'
             }
             for k, v in type_map.items():
                 if k in target_unit:
                     target_unit = v
                     break

        # --- ROUTING LOGIC ---
        
        if inquiry_type == "price_check":
            price_data = backend_api.get_price_range(
                project_id=target_project_id,
                area_id=target_area_id,
                unit_type=target_unit
            )
            results["type"] = "price_range"
            results["data"] = price_data
            results["filters"] = {"project": target_project_name, "area": target_area_name, "unit_type": target_unit}
            
        elif inquiry_type == "project_comparison":
             results["type"] = "comparison_needed"
             results["message"] = "Specify projects to compare"
             
        elif inquiry_type == "availability_check":
             if target_project_id or target_area_id:
                 if target_project_id:
                     # Check specific project units
                     units = backend_api.search_units(
                         project_id=target_project_id, 
                         unit_type=target_unit,
                         limit=5
                     )
                     results["type"] = "units_search"
                     results["data"] = units
                 else:
                     # List projects in area (using ID)
                     # Note: get_projects currently takes area_name, let's see if we can use ID or name
                     # backend_api.get_projects takes area_name string.
                     projects = backend_api.get_projects(target_area_name) 
                     results["type"] = "projects"
                     results["data"] = projects[:10]
                     results["area_filter"] = target_area_name
             else:
                 results["type"] = "general_qa"
                 results["message"] = "General availability"

        elif inquiry_type == "location_info":
             if target_area_name:
                  results["type"] = "general_qa" 
                  results["context_note"] = f"User asking about location of {target_area_name}"
             else:
                 areas = backend_api.get_all_areas()
                 results["type"] = "areas"
                 results["data"] = areas

        else: # general_qa
            results["type"] = "general_qa"
            results["message"] = "General inquiry"

        state["inquiry_results"] = results
        
    except Exception as e:
        logger.error(f"Node [handle_inquiry]: Error - {e}")
        state["inquiry_results"] = {"error": str(e), "type": "general_qa"}
        
    return state


def validate_names(state: ConversationState) -> ConversationState:
    """Validate and correct area, project, and unit type names against DB.
    
    Uses NameMatcherService for dynamic DB matching with:
    - Arabic normalization
    - Franco Arabic → English conversion (via Cohere)
    - Fuzzy matching with configurable thresholds
    
    Returns:
        Updated state with corrected names or pending_correction for user confirmation.
    """
    from app.services.name_matcher import get_name_matcher_service
    
    matcher = get_name_matcher_service()
    reqs = state.get("extracted_requirements", {})
    pending_correction = None
    
    # Validate Area
    if reqs.get("area") and not reqs.get("area_id"):
        result = matcher.match_area(reqs["area"])
        if result.matched:
            reqs["area"] = result.value
            reqs["area_id"] = result.id
            logger.info(f"Node [validate_names]: Area matched: {result.value}")
        else:
            pending_correction = {
                "field": "area",
                "original": reqs["area"],
                "suggested": result.value,
                "alternatives": result.alternatives,
                "confidence": result.confidence
            }
    
    # Validate Project (only if area resolved)
    if not pending_correction and reqs.get("project") and not reqs.get("project_id"):
        result = matcher.match_project(reqs["project"], area_id=reqs.get("area_id"))
        if result.matched:
            reqs["project"] = result.value
            reqs["project_id"] = result.id
            logger.info(f"Node [validate_names]: Project matched: {result.value}")
        else:
            pending_correction = {
                "field": "project",
                "original": reqs["project"],
                "suggested": result.value,
                "alternatives": result.alternatives,
                "confidence": result.confidence,
                "area_filtered": result.area_filtered
            }
    
    # Validate Unit Type
    if not pending_correction and reqs.get("unit_type") and not reqs.get("unit_type_validated"):
        result = matcher.match_unit_type(reqs["unit_type"])
        if result.matched:
            reqs["unit_type"] = result.value
            reqs["unit_type_validated"] = True
            logger.info(f"Node [validate_names]: Unit type matched: {result.value}")
        else:
            pending_correction = {
                "field": "unit_type",
                "original": reqs["unit_type"],
                "suggested": result.value,
                "alternatives": result.alternatives
            }
    
    state["extracted_requirements"] = reqs
    state["pending_correction"] = pending_correction
    state["names_validated"] = pending_correction is None
    
    return state


def generate_correction_prompt(state: ConversationState) -> ConversationState:
    """Generate Arabic prompt for name correction confirmation.
    
    Shows LLM-converted Franco names and lists projects filtered by area.
    """
    from app.services.name_matcher import get_name_matcher_service
    
    pending = state.get("pending_correction", {})
    if not pending:
        return state
    
    reqs = state.get("extracted_requirements", {})
    matcher = get_name_matcher_service()
    
    field = pending.get("field")
    suggested = pending.get("suggested", "")
    alternatives = pending.get("alternatives", [])
    
    if field == "area":
        alts_list = "\n".join([f"• {a}" for a in alternatives[:5]])
        state["clarification_question"] = f"""حضرتك تقصد منطقة **{suggested}** صح؟

لو تقصد منطقة تانية، ممكن تختار:
{alts_list}"""
    
    elif field == "project":
        area_id = reqs.get("area_id")
        if area_id:
            area_projects = matcher.get_projects_for_area(area_id)
            project_names = [p.get('name', '') for p in area_projects[:10]]
            area_name = reqs.get("area", "المنطقة")
            projects_list = "\n".join([f"• {p}" for p in project_names if p])
            state["clarification_question"] = f"""حضرتك تقصد مشروع **{suggested}** صح؟

مشاريع {area_name}:
{projects_list}

ممكن تختار الاسم بالظبط ✨"""
        else:
            alts_list = "\n".join([f"• {a}" for a in alternatives[:5]])
            state["clarification_question"] = f"""حضرتك تقصد مشروع **{suggested}** صح؟

مشاريع مشابهة:
{alts_list}"""
    
    elif field == "unit_type":
        alts_list = "\n".join([f"• {a}" for a in alternatives])
        state["clarification_question"] = f"""حضرتك تقصد **{suggested}** صح؟

الأنواع المتاحة:
{alts_list}"""
    
    state["awaiting_name_correction"] = True
    return state

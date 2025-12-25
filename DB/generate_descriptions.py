#!/usr/bin/env python3
"""
Generate realistic bilingual descriptions for all units following Hawabay patterns.
Sea views are only assigned to Sharm El Sheikh projects (River Island 6).
"""

import psycopg2
import random

# Database connection
conn = psycopg2.connect(
    host="localhost",
    port="5433",
    database="real_estate_crm",
    user="admin",
    password="password"
)

cur = conn.cursor()

# Fetch all units that need descriptions (non-Hawabay)
cur.execute("""
    SELECT u.unit_id, u.code, u.unit_type, u.size, u.price, u.floor, 
           u.garden_size, u.roof_size, p.name as project_name, a.name as area_name
    FROM units u
    JOIN projects p ON u.project_id = p.project_id
    JOIN areas a ON p.area_id = a.area_id
    WHERE p.name != 'Hawabay'
    ORDER BY u.unit_id;
""")

units = cur.fetchall()

print(f"Generating descriptions for {len(units)} units...")

# View templates based on location
def get_view_description(floor, is_sharm_el_sheikh, unit_type):
    """Determine view based on floor and location"""
    if floor is None or floor == '':
        floor_num = 0
    else:
        try:
            floor_num = int(floor.replace('G', '0').replace('B', '-1'))
        except:
            floor_num = 0
    
    if is_sharm_el_sheikh and floor_num >= 3:
        return "إطلالات خلابة مطلة على البحر sea view مع إطلالة مباشرة على الشاطئ beach view تمنح منظر بحري رائع."
    elif is_sharm_el_sheikh and floor_num == 2:
        return "شرفة مطلة على البحر sea view تمنح open view ممتدة مع منظر بحري جميل."
    elif floor_num >= 3:
        return "واجهة مرتفعة city view تطل على الشارع الرئيسي مع open view دائمة."
    elif floor_num == 2:
        return "شرفة مطلة على النادي الرياضي تمنح open view ممتدة."
    else:
        return "تصميم بواجهات زجاجية مطلة على مساحة خضراء لراحة العين."

def generate_description(unit_id, code, unit_type, size, price, floor, garden_size, roof_size, project_name, area_name):
    """Generate complete unit description following Hawabay patterns"""
    
    is_sharm = area_name == "Sharm El Sheikh"
    is_villa = unit_type.lower() in ['villa', 'townhouse', 'duplex']
    
    # Header
    if is_villa:
        header = f"وحدة {unit_type} بمساحة {size} م² كود {code} داخل كمباوند {project_name}."
    else:
        header = f"وحدة Apartment بمساحة {size} م² كود {code} داخل كمباوند {project_name}."
    
    # View
    view = get_view_description(floor, is_sharm, unit_type)
    
    # Location
    location = "موقع prime location داخل gated community قريب من الخدمات اليومية والمدارس الدولية."
    
    # Finishing
    if is_villa:
        finishing = "تشطيب الترا سوبر لوكس modern finishing باستخدام high quality materials جاهز للاستعمال."
    else:
        finishing = "الوحدة fully finished بتشطيب كامل سوبر لوكس جاهزة للسكن."
    
    # Layout
    if is_villa:
        layout = f"مساحة واسعة مع living area كبيرة تناسب suitable for families."
    else:
        layout = "توزيع open space مع مطبخ أمريكان وغرفة نوم master bedroom مريحة."
    
    # Outdoor spaces
    outdoor_parts = []
    if is_villa:
        if garden_size and garden_size > 0:
            outdoor_parts.append(f"حديقة خاصة private garden بمساحة {int(garden_size)} م² مثالية للجلوس.")
        if roof_size and roof_size > 0:
            outdoor_parts.append(f"روف بمساحة {int(roof_size)} م² مع تراس واسع قابل لتجهيز جلسة عائلية مع إطلالة بحرية ممتدة." if is_sharm else f"روف بمساحة {int(roof_size)} م² مع تراس واسع قابل لتجهيز جلسة عائلية.")
        else:
            outdoor_parts.append("تراس واسع يطل على المساحات المفتوحة.")
    else:
        if is_sharm and floor and (floor.startswith('3') or floor.startswith('4') or floor.startswith('5')):
            outdoor_parts.append("تراس واسع يطل على البحر مع منظر بحري رائع.")
        else:
            outdoor_parts.append("تراس واسع يطل على المساحات المفتوحة.")
    
    outdoor = " ".join(outdoor_parts)
    
    # Availability
    availability = "الوحدة جاهز للسكن مع إمكانية استلام فوري ready to move وخطط تقسيط ميسرة."
    
    # Amenities
    amenities = "يستفيد الساكن من clubhouse، gym، حمام سباحة، kids area وخدمات security 24/7 داخل المشروع."
    
    # Building features
    if is_villa:
        building = "villa فيلا للبيع standalone villa ضمن luxury villa gated community."
    else:
        building = "apartment شقة للبيع داخل compound مزودة بأسانسير elevator وخدمات security دائمة."
    
    # Keywords
    base_keywords = ["تراس واسع", "استلام فوري", "prime location", "master bedroom", "security", 
                     "fully finished", "سوبر لوكس", "قريب من الخدمات", "جاهز للسكن", 
                     "compound", "gated community", "clubhouse", "kids area", "ready to move", 
                     "حمام سباحة", "open space", "gym", "security 24/7", "تشطيب كامل"]
    
    if is_villa:
        base_keywords.extend(["standalone villa", "حديقة خاصة", "living area كبيرة", 
                             "suitable for families", "private garden", "luxury villa", 
                             "فيلا للبيع", "الترا سوبر لوكس", "مساحة واسعة", "high quality materials"])
        if roof_size and roof_size > 0:
            base_keywords.extend(["rooftop", "روف"])
    else:
        base_keywords.extend(["مطبخ أمريكان", "شقة للبيع", "apartment", "elevator"])
    
    if is_sharm:
        base_keywords.extend(["مطل على البحر", "sea view", "beach view"])
    else:
        base_keywords.extend(["garden view", "مساحة خضراء"])
    
    keywords = f"كلمات مفتاحية: {', '.join(base_keywords)}."
    
    # Combine all parts
    description = f"{header} {view} {location} {finishing} {layout} {outdoor} {availability} {amenities} {building} {keywords}"
    
    return description

# Update all units
updated_count = 0
for unit in units:
    unit_id, code, unit_type, size, price, floor, garden_size, roof_size, project_name, area_name = unit
    
    description = generate_description(unit_id, code, unit_type, size, price, floor, 
                                       garden_size, roof_size, project_name, area_name)
    
    cur.execute("""
        UPDATE units 
        SET description = %s 
        WHERE unit_id = %s
    """, (description, unit_id))
    
    updated_count += 1
    if updated_count % 100 == 0:
        print(f"Updated {updated_count}/{ len(units)} units...")
        conn.commit()

conn.commit()
print(f"\n✓ Successfully generated descriptions for {updated_count} units!")

# Verify
cur.execute("""
    SELECT COUNT(*) FROM units WHERE description IS NOT NULL AND description != '';
""")
total_with_desc = cur.fetchone()[0]
print(f"✓ Total units with descriptions: {total_with_desc}")

cur.close()
conn.close()

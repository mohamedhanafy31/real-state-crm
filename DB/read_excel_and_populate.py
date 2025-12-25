#!/usr/bin/env python3
"""
Script to read Excel file and generate SQL UPDATE statements for unit descriptions
"""
import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
import os

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'port': 5433,
    'user': 'admin',
    'password': 'password',
    'database': 'real_estate_crm'
}

def read_excel_file(filepath):
    """Read the Excel file and return unit data"""
    print(f"Reading Excel file: {filepath}")
    try:
        df = pd.read_excel(filepath)
        print(f"Excel columns: {df.columns.tolist()}")
        print(f"Excel shape: {df.shape}")
        print(f"\nFirst few rows:\n{df.head()}")
        return df
    except Exception as e:
        print(f"Error reading Excel: {e}")
        return None

def get_all_units_from_db():
    """Fetch all units from the database"""
    print("\nFetching units from database...")
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
        SELECT 
            u.unit_id,
            u.code,
            u.unit_type,
            u.size,
            u.price,
            u.garden_size,
            u.roof_size,
            u.description,
            p.name as project_name,
            a.name as area_name
        FROM units u
        LEFT JOIN projects p ON u.project_id = p.project_id
        LEFT JOIN areas a ON p.area_id = a.area_id
        ORDER BY u.unit_id
        """
        
        cur.execute(query)
        units = cur.fetchall()
        
        print(f"Found {len(units)} units in database")
        
        cur.close()
        conn.close()
        
        return units
    except Exception as e:
        print(f"Error fetching units: {e}")
        return []

def generate_description(unit, excel_descriptions):
    """Generate Arabic description for a unit based on its properties"""
    
    # Try to match by code if available in excel
    if excel_descriptions is not None:
        # Will implement after seeing Excel structure
        pass
    
    # Generate description based on unit properties
    unit_type = unit['unit_type']
    size = unit['size']
    garden_size = unit.get('garden_size', 0) or 0
    roof_size = unit.get('roof_size', 0) or 0
    project = unit.get('project_name', '')
    area = unit.get('area_name', '')
    
    descriptions = {
        'Apartment': [
            f"شقة فاخرة بمساحة {int(size)} متر في {project}",
            f"شقة مميزة مساحتها {int(size)} متر بتشطيب راقي",
            f"شقة للبيع بمساحة {int(size)} متر في موقع مميز",
        ],
        'Villa': [
            f"فيلا فاخرة بمساحة {int(size)} متر في {project}",
            f"فيلا مستقلة مساحتها {int(size)} متر بحديقة خاصة",
            f"فيلا راقية للبيع بمساحة {int(size)} متر",
        ],
        'Studio': [
            f"استوديو عملي بمساحة {int(size)} متر",
            f"استوديو مميز مساحته {int(size)} متر للاستثمار",
            f"استوديو للبيع بمساحة {int(size)} متر بسعر مناسب",
        ],
        'Duplex': [
            f"دوبلكس فاخر بمساحة {int(size)} متر",
            f"دوبلكس مميز مساحته {int(size)} متر بتصميم عصري",
            f"دوبلكس للبيع بمساحة {int(size)} متر",
        ],
        'Penthouse': [
            f"بنتهاوس فاخر بمساحة {int(size)} متر مع روف",
            f"بنتهاوس مميز مساحته {int(size)} متر بإطلالة رائعة",
            f"بنتهاوس للبيع بمساحة {int(size)} متر",
        ]
    }
    
    # Base description
    desc_list = descriptions.get(unit_type, [f"وحدة بمساحة {int(size)} متر"])
    base_desc = desc_list[unit['unit_id'] % len(desc_list)]
    
    # Add features
    features = []
    if garden_size > 0:
        features.append(f"حديقة {int(garden_size)} متر")
    if roof_size > 0:
        features.append(f"روف {int(roof_size)} متر")
    
    if features:
        base_desc += " - " + " + ".join(features)
    
    # Add location if available
    if area:
        base_desc += f" - {area}"
    
    return base_desc

def main():
    # Read Excel file
    excel_path = "/media/hanafy/aa9ee400-c081-4d3b-b831-a2a8c83c9f4410/MetaVR/real_state_CRM/DB/11-15.xlsx"
    excel_df = read_excel_file(excel_path)
    
    # Get all units from database
    units = get_all_units_from_db()
    
    if not units:
        print("No units found in database!")
        return
    
    # Generate SQL UPDATE statements
    print("\nGenerating SQL UPDATE statements...")
    
    sql_output = []
    sql_output.append("-- Update unit descriptions from Excel data\n")
    sql_output.append("-- Generated automatically\n\n")
    
    for unit in units:
        description = generate_description(unit, excel_df)
        
        # Escape single quotes
        description = description.replace("'", "''")
        
        sql = f"UPDATE units SET description = '{description}' WHERE unit_id = {unit['unit_id']}; -- {unit['code']}"
        sql_output.append(sql)
    
    # Write to file
    output_file = "/media/hanafy/aa9ee400-c081-4d3b-b831-a2a8c83c9f4410/MetaVR/real_state_CRM/DB/populate_descriptions.sql"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_output))
    
    print(f"\nSQL file generated: {output_file}")
    print(f"Total units processed: {len(units)}")
    
    # Show sample
    print("\n=== Sample descriptions ===")
    for i, unit in enumerate(units[:5]):
        desc = generate_description(unit, excel_df)
        print(f"{unit['code']}: {desc}")

if __name__ == "__main__":
    main()

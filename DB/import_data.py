import pandas as pd
import psycopg2
import os

# Database connection
conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="real_estate_crm",
    user="admin",
    password="password"
)
cur = conn.cursor()

# 1. Import Units from Excel
excel_path = "11-15.xlsx"
df = pd.read_excel(excel_path)

PROJECT_ID = 88
AREA_ID = 6

units_data = []
for _, row in df.iterrows():
    # Helper to clean numeric values
    def clean_num(val):
        try:
            return float(val) if pd.notnull(val) else 0.0
        except:
            return 0.0

    unit = (
        PROJECT_ID,
        str(row['Usage']),
        clean_num(row['Area']), # Area in excel is size
        clean_num(row['Price']),
        'available',
        str(row['Code']),
        str(row['Name']),
        str(row['Building']),
        str(row['Floor']),
        clean_num(row['Garden']),
        clean_num(row['Roof']),
        clean_num(row['10% مقدم']),
        clean_num(row['قسط 4 سنين ']),
        clean_num(row['قسط 5 سنين '])
    )
    units_data.append(unit)

# Bulk insert units
insert_query = """
    INSERT INTO units (
        project_id, unit_type, size, price, status, 
        code, unit_name, building, floor, garden_size, 
        roof_size, down_payment_10_percent, installment_4_years, installment_5_years
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
"""
cur.executemany(insert_query, units_data)
print(f"Imported {len(units_data)} units.")

# 2. Assign any area to current brokers (all brokers to area 6)
cur.execute("SELECT broker_id FROM brokers")
broker_ids = cur.fetchall()

for (bid,) in broker_ids:
    cur.execute("INSERT INTO broker_areas (broker_id, area_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (bid, AREA_ID))
print(f"Assigned {len(broker_ids)} brokers to Area ID {AREA_ID}.")

conn.commit()
cur.close()
conn.close()

#!/usr/bin/env python3
"""
Import real estate units from Excel file into PostgreSQL database.

This script reads unit data from an Excel file and imports it into the database,
creating projects and areas as needed.
"""

import os
import sys
import argparse
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from typing import Dict, List, Tuple


class UnitsImporter:
    """Import real estate units from Excel to PostgreSQL."""
    
    def __init__(self, db_params: Dict[str, str], dry_run: bool = False):
        """Initialize the importer.
        
        Args:
            db_params: Database connection parameters
            dry_run: If True, don't commit changes to the database
        """
        self.db_params = db_params
        self.dry_run = dry_run
        self.conn = None
        self.cursor = None
        
    def connect(self):
        """Establish database connection."""
        print(f"🔌 Connecting to database at {self.db_params['host']}:{self.db_params['port']}...")
        self.conn = psycopg2.connect(**self.db_params)
        self.cursor = self.conn.cursor()
        print("✅ Connected successfully")
        
    def close(self):
        """Close database connection."""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            if self.dry_run:
                print("🔄 Rolling back changes (dry-run mode)")
                self.conn.rollback()
            else:
                print("💾 Committing changes")
                self.conn.commit()
            self.conn.close()
            
    def get_or_create_area(self, area_name: str) -> int:
        """Get or create an area by name.
        
        Args:
            area_name: Name of the area
            
        Returns:
            area_id
        """
        # Try to find existing area
        self.cursor.execute("SELECT area_id FROM areas WHERE name = %s", (area_name,))
        result = self.cursor.fetchone()
        
        if result:
            return result[0]
        
        # Create new area
        self.cursor.execute(
            "INSERT INTO areas (name) VALUES (%s) RETURNING area_id",
            (area_name,)
        )
        area_id = self.cursor.fetchone()[0]
        print(f"  📍 Created new area: {area_name} (ID: {area_id})")
        return area_id
        
    def get_or_create_project(self, project_name: str, area_id: int) -> int:
        """Get or create a project by name.
        
        Args:
            project_name: Name of the project
            area_id: ID of the area this project is in
            
        Returns:
            project_id
        """
        # Try to find existing project
        self.cursor.execute("SELECT project_id FROM projects WHERE name = %s", (project_name,))
        result = self.cursor.fetchone()
        
        if result:
            return result[0]
        
        # Create new project
        self.cursor.execute(
            "INSERT INTO projects (name, area_id, is_active) VALUES (%s, %s, true) RETURNING project_id",
            (project_name, area_id)
        )
        project_id = self.cursor.fetchone()[0]
        print(f"  🏗️  Created new project: {project_name} (ID: {project_id})")
        return project_id
        
    def import_units(self, excel_path: str, default_area: str = "North Coast"):
        """Import units from Excel file.
        
        Args:
            excel_path: Path to the Excel file
            default_area: Default area name for projects (geographic location)
        """
        print(f"\n📥 Reading Excel file: {excel_path}")
        df = pd.read_excel(excel_path)
        print(f"✅ Found {len(df)} units in Excel")
        
        # Get or create default area
        area_id = self.get_or_create_area(default_area)
        
        # Track projects created
        projects_cache = {}
        
        # Prepare units data
        units_data = []
        errors = []
        
        print(f"\n🔄 Processing units...")
        for idx, row in df.iterrows():
            try:
                # Get or create project
                project_name = str(row['Project']).strip()
                if project_name not in projects_cache:
                    projects_cache[project_name] = self.get_or_create_project(project_name, area_id)
                project_id = projects_cache[project_name]
                
                # Prepare unit data
                unit_data = (
                    project_id,
                    str(row['Usage']),  # unit_type
                    float(row['Area']),  # size
                    float(row['Price']),  # price
                    'available',  # status
                    str(row['Code']),  # code
                    str(row['Name']),  # unit_name
                    str(row['Building']),  # building
                    str(row['Floor']),  # floor
                    float(row.get('Garden', 0)),  # garden_size
                    float(row.get('Roof', 0)),  # roof_size
                    float(row['10% مقدم']),  # down_payment_10_percent
                    float(row['قسط 4 سنين ']),  # installment_4_years
                    float(row['قسط 5 سنين ']),  # installment_5_years
                )
                units_data.append(unit_data)
                
            except Exception as e:
                errors.append(f"Row {idx + 2}: {str(e)}")
                
        if errors:
            print(f"\n⚠️  Encountered {len(errors)} errors:")
            for error in errors[:10]:  # Show first 10 errors
                print(f"  - {error}")
            if len(errors) > 10:
                print(f"  ... and {len(errors) - 10} more")
                
        if not units_data:
            print("❌ No valid units to import")
            return
            
        # Insert units
        print(f"\n💾 Inserting {len(units_data)} units into database...")
        execute_values(
            self.cursor,
            """
            INSERT INTO units (
                project_id, unit_type, size, price, status,
                code, unit_name, building, floor,
                garden_size, roof_size,
                down_payment_10_percent, installment_4_years, installment_5_years
            ) VALUES %s
            ON CONFLICT (code) DO UPDATE SET
                price = EXCLUDED.price,
                status = EXCLUDED.status,
                down_payment_10_percent = EXCLUDED.down_payment_10_percent,
                installment_4_years = EXCLUDED.installment_4_years,
                installment_5_years = EXCLUDED.installment_5_years
            """,
            units_data
        )
        
        print(f"✅ Successfully processed {len(units_data)} units")
        print(f"📊 Created/Updated {len(projects_cache)} projects")
        

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Import real estate units from Excel')
    parser.add_argument('excel_file', help='Path to Excel file')
    parser.add_argument('--host', default='localhost', help='Database host')
    parser.add_argument('--port', default='5433', help='Database port')
    parser.add_argument('--dbname', default='real_estate_crm', help='Database name')
    parser.add_argument('--user', default='postgres', help='Database user')
    parser.add_argument('--password', default='postgres', help='Database password')
    parser.add_argument('--area', default='North Coast', help='Default geographic area for projects')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without committing')
    
    args = parser.parse_args()
    
    # Check if Excel file exists
    if not os.path.exists(args.excel_file):
        print(f"❌ Error: File not found: {args.excel_file}")
        sys.exit(1)
        
    # Database connection parameters
    db_params = {
        'host': args.host,
        'port': args.port,
        'dbname': args.dbname,
        'user': args.user,
        'password': args.password
    }
    
    print("=" * 70)
    print("  REAL ESTATE UNITS IMPORTER")
    print("=" * 70)
    
    if args.dry_run:
        print("⚠️  DRY RUN MODE - No changes will be committed")
        
    importer = UnitsImporter(db_params, dry_run=args.dry_run)
    
    try:
        importer.connect()
        importer.import_units(args.excel_file, default_area=args.area)
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        if importer.conn:
            importer.conn.rollback()
        sys.exit(1)
        
    finally:
        importer.close()
        
    print("\n" + "=" * 70)
    print("✅ Import completed successfully")
    print("=" * 70)


if __name__ == '__main__':
    main()

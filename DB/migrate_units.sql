-- Migration script to add new fields to units table
-- Run this against the existing database
ALTER TABLE units
ADD COLUMN IF NOT EXISTS code VARCHAR(100) UNIQUE;
ALTER TABLE units
ADD COLUMN IF NOT EXISTS unit_name VARCHAR(50);
ALTER TABLE units
ADD COLUMN IF NOT EXISTS building VARCHAR(50);
ALTER TABLE units
ADD COLUMN IF NOT EXISTS floor VARCHAR(20);
ALTER TABLE units
ADD COLUMN IF NOT EXISTS garden_size FLOAT DEFAULT 0;
ALTER TABLE units
ADD COLUMN IF NOT EXISTS roof_size FLOAT DEFAULT 0;
ALTER TABLE units
ADD COLUMN IF NOT EXISTS down_payment_10_percent FLOAT;
ALTER TABLE units
ADD COLUMN IF NOT EXISTS installment_4_years FLOAT;
ALTER TABLE units
ADD COLUMN IF NOT EXISTS installment_5_years FLOAT;
-- Add index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_units_code ON units(code);
-- Migration 001: Add Arabic Name Columns and Populate Existing Data
-- Run with: psql -U admin -d real_estate_crm -f migration_001_add_arabic_names.sql
-- Step 1: Add Arabic name columns
ALTER TABLE areas
ADD COLUMN IF NOT EXISTS name_ar VARCHAR(255);
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS name_ar VARCHAR(255);
-- Step 2: Populate Arabic names for existing areas
UPDATE areas
SET name_ar = 'الساحل الشمالي'
WHERE area_id = 6;
-- North Coast
UPDATE areas
SET name_ar = 'العاصمة الإدارية الجديدة'
WHERE area_id = 7;
-- New Capital
UPDATE areas
SET name_ar = 'التجمع الخامس'
WHERE area_id = 8;
-- Tagamoo
UPDATE areas
SET name_ar = 'مدينتي'
WHERE area_id = 9;
-- Madinty
UPDATE areas
SET name_ar = 'شرم الشيخ'
WHERE area_id = 10;
-- Sharm El Sheikh
-- Step 3: Populate Arabic names for existing projects
UPDATE projects
SET name_ar = 'حوابي'
WHERE project_id = 88;
-- Hawabay
UPDATE projects
SET name_ar = 'جرين بلازا 1'
WHERE project_id = 89;
-- Green Plaza 1
UPDATE projects
SET name_ar = 'كريستال ريزورت 2'
WHERE project_id = 90;
-- Crystal Resort 2
UPDATE projects
SET name_ar = 'جرين هايتس 3'
WHERE project_id = 91;
-- Green Heights 3
UPDATE projects
SET name_ar = 'كريستال تاورز 4'
WHERE project_id = 92;
-- Crystal Towers 4
UPDATE projects
SET name_ar = 'جولدن باي 5'
WHERE project_id = 93;
-- Golden Bay 5
UPDATE projects
SET name_ar = 'ريفر آيلاند 6'
WHERE project_id = 94;
-- River Island 6
UPDATE projects
SET name_ar = 'فيوتشر فيو 7'
WHERE project_id = 95;
-- Future View 7
UPDATE projects
SET name_ar = 'ماونتن جاردن 8'
WHERE project_id = 96;
-- Mountain Garden 8
UPDATE projects
SET name_ar = 'جراند فالي 9'
WHERE project_id = 97;
-- Grand Valley 9
UPDATE projects
SET name_ar = 'ماونتن هايتس 10'
WHERE project_id = 98;
-- Mountain Heights 10
UPDATE projects
SET name_ar = 'بالم فيو 11'
WHERE project_id = 99;
-- Palm View 11
UPDATE projects
SET name_ar = 'جرين جيت 12'
WHERE project_id = 100;
-- Green Gate 12
UPDATE projects
SET name_ar = 'رويال كومباوند 13'
WHERE project_id = 101;
-- Royal Compound 13
UPDATE projects
SET name_ar = 'صني كومباوند 14'
WHERE project_id = 102;
-- Sunny Compound 14
UPDATE projects
SET name_ar = 'فيوتشر جاردن 15'
WHERE project_id = 103;
-- Future Garden 15
-- Step 4: Verify changes
SELECT 'Areas:' as table_name,
    area_id as id,
    name,
    name_ar
FROM areas
UNION ALL
SELECT 'Projects:',
    project_id,
    name,
    name_ar
FROM projects
ORDER BY table_name,
    id;
-- Step 5: Show summary
SELECT 'Areas' as entity_type,
    COUNT(*) as total,
    COUNT(name_ar) as with_arabic,
    COUNT(*) - COUNT(name_ar) as missing_arabic
FROM areas
UNION ALL
SELECT 'Projects',
    COUNT(*),
    COUNT(name_ar),
    COUNT(*) - COUNT(name_ar)
FROM projects;
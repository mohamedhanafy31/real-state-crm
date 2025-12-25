-- Seed Areas Table for Testing
-- This file ensures that areas exist for foreign key references in tests
-- Populate areas table with test data
INSERT INTO areas (area_id, name)
VALUES (1, 'Cairo'),
    (2, 'Giza'),
    (3, 'Alexandria'),
    (4, 'Sharm El Sheikh'),
    (5, 'Hurghada') ON CONFLICT (area_id) DO NOTHING;
-- Reset sequence to avoid ID conflicts
SELECT setval(
        'areas_area_id_seq',
        (
            SELECT MAX(area_id)
            FROM areas
        )
    );
-- Verify areas were inserted
SELECT area_id,
    name
FROM areas
ORDER BY area_id;
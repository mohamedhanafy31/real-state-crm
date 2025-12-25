-- Add description column to units table
ALTER TABLE units
ADD COLUMN description TEXT;
-- Update some existing units with dummy descriptions for testing
UPDATE units
SET description = 'Beautiful apartment with a stunning garden view and modern finishing.'
WHERE unit_type = 'Apartment'
    AND garden_size > 0;
UPDATE units
SET description = 'Luxurious villa with a private pool and spacious roof.'
WHERE unit_type = 'Villa';
UPDATE units
SET description = 'Cozy studio, perfect for investment, located in a prime location.'
WHERE unit_type = 'Studio';
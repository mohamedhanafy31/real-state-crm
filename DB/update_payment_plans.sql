-- Update Payment Plans for All Units
-- This script adds payment plan calculations to all units that are missing them
-- Based on the formula from Hawabay project units
-- Update all units missing payment plans with calculated values
UPDATE units
SET down_payment_10_percent = price * 0.10,
    installment_4_years = (price - (price * 0.10)) / 48.0 * 3.0,
    installment_5_years = (price - (price * 0.10)) / 60.0 * 2.8333
WHERE down_payment_10_percent IS NULL
    AND price IS NOT NULL
    AND price > 0;
-- Display summary of the update
SELECT 'Total units updated' as description,
    COUNT(*) as count
FROM units
WHERE down_payment_10_percent IS NOT NULL
    AND price IS NOT NULL;
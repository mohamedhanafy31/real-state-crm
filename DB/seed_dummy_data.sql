-- ============================================
-- Real Estate CRM - Dummy Data Seed Script
-- ============================================
-- This script populates empty tables with realistic test data
-- to make the system fully functional for testing and development.
-- ============================================
-- 1. BROKER-AREA ASSIGNMENTS
-- ============================================
-- Link existing brokers to the North Coast area
INSERT INTO broker_areas (broker_id, area_id)
SELECT user_id,
    2
FROM users
WHERE role = 'broker' ON CONFLICT (broker_id, area_id) DO NOTHING;
-- ============================================
-- 2. CUSTOMER REQUESTS
-- ============================================
-- Create customer inquiries with various statuses
INSERT INTO requests (
        customer_id,
        assigned_broker_id,
        area_id,
        status,
        created_at,
        updated_at
    )
VALUES -- New requests (just came in)
    (
        1,
        4,
        2,
        'new',
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '2 hours'
    ),
    (
        2,
        4,
        2,
        'new',
        NOW() - INTERVAL '5 hours',
        NOW() - INTERVAL '5 hours'
    ),
    -- Contacted requests (broker reached out)
    (
        3,
        4,
        2,
        'contacted',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '1 day'
    ),
    (
        4,
        4,
        2,
        'contacted',
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '3 days'
    ),
    -- Reserved requests (deal made)
    (
        1,
        4,
        2,
        'reserved',
        NOW() - INTERVAL '7 days',
        NOW() - INTERVAL '6 days'
    ),
    (
        4,
        4,
        2,
        'reserved',
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '9 days'
    ),
    -- Paid requests (customer paid)
    (
        2,
        4,
        2,
        'paid',
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '14 days'
    ),
    -- Lost request (customer went elsewhere)
    (
        3,
        4,
        2,
        'lost',
        NOW() - INTERVAL '20 days',
        NOW() - INTERVAL '19 days'
    )
RETURNING request_id;
-- Store the request IDs for later use (PostgreSQL specific)
-- Request IDs will be auto-generated, we'll reference them by customer_id below
-- ============================================
-- 3. REQUEST STATUS HISTORY
-- ============================================
-- Track how requests progressed through the workflow
WITH request_data AS (
    SELECT request_id,
        customer_id,
        assigned_broker_id,
        status,
        created_at,
        updated_at
    FROM requests
)
INSERT INTO request_status_history (
        request_id,
        old_status,
        new_status,
        changed_by,
        from_broker_id,
        to_broker_id,
        created_at
    ) -- Request 1: new -> reserved (customer 1)
SELECT request_id,
    NULL,
    'new',
    'system',
    NULL,
    assigned_broker_id,
    created_at
FROM request_data
WHERE customer_id = 1
    AND status = 'reserved'
UNION ALL
SELECT request_id,
    'new',
    'contacted',
    'broker',
    assigned_broker_id,
    assigned_broker_id,
    created_at + INTERVAL '1 hour'
FROM request_data
WHERE customer_id = 1
    AND status = 'reserved'
UNION ALL
SELECT request_id,
    'contacted',
    'reserved',
    'broker',
    assigned_broker_id,
    assigned_broker_id,
    updated_at
FROM request_data
WHERE customer_id = 1
    AND status = 'reserved'
UNION ALL
-- Request 2: new -> paid (customer 2)
SELECT request_id,
    NULL,
    'new',
    'system',
    NULL,
    assigned_broker_id,
    created_at
FROM request_data
WHERE customer_id = 2
    AND status = 'paid'
UNION ALL
SELECT request_id,
    'new',
    'contacted',
    'broker',
    assigned_broker_id,
    assigned_broker_id,
    created_at + INTERVAL '2 hours'
FROM request_data
WHERE customer_id = 2
    AND status = 'paid'
UNION ALL
SELECT request_id,
    'contacted',
    'reserved',
    'broker',
    assigned_broker_id,
    assigned_broker_id,
    created_at + INTERVAL '3 days'
FROM request_data
WHERE customer_id = 2
    AND status = 'paid'
UNION ALL
SELECT request_id,
    'reserved',
    'paid',
    'broker',
    assigned_broker_id,
    assigned_broker_id,
    updated_at
FROM request_data
WHERE customer_id = 2
    AND status = 'paid'
UNION ALL
-- Request 3: new -> contacted -> lost (customer 3)
SELECT request_id,
    NULL,
    'new',
    'system',
    NULL,
    assigned_broker_id,
    created_at
FROM request_data
WHERE customer_id = 3
    AND status = 'lost'
UNION ALL
SELECT request_id,
    'new',
    'contacted',
    'broker',
    assigned_broker_id,
    assigned_broker_id,
    created_at + INTERVAL '30 minutes'
FROM request_data
WHERE customer_id = 3
    AND status = 'lost'
UNION ALL
SELECT request_id,
    'contacted',
    'lost',
    'broker',
    assigned_broker_id,
    assigned_broker_id,
    updated_at
FROM request_data
WHERE customer_id = 3
    AND status = 'lost'
UNION ALL
-- Request 4: new -> contacted -> reserved (customer 4, second request)
SELECT request_id,
    NULL,
    'new',
    'system',
    NULL,
    assigned_broker_id,
    created_at
FROM request_data
WHERE customer_id = 4
    AND status = 'reserved'
UNION ALL
SELECT request_id,
    'new',
    'contacted',
    'broker',
    assigned_broker_id,
    assigned_broker_id,
    created_at + INTERVAL '1 hour'
FROM request_data
WHERE customer_id = 4
    AND status = 'reserved'
UNION ALL
SELECT request_id,
    'contacted',
    'reserved',
    'broker',
    assigned_broker_id,
    assigned_broker_id,
    updated_at
FROM request_data
WHERE customer_id = 4
    AND status = 'reserved';
-- ============================================
-- 4. RESERVATIONS
-- ============================================
-- Create reservations for requests that reached 'reserved' or 'paid' status
WITH reserved_requests AS (
    SELECT request_id,
        customer_id,
        assigned_broker_id
    FROM requests
    WHERE status IN ('reserved', 'paid')
)
INSERT INTO reservations (
        request_id,
        unit_id,
        broker_id,
        total_unit_price,
        customer_pay_amount,
        broker_commission_amount,
        reservation_status,
        created_at
    )
VALUES -- Reservation 1: Customer 1, Unit 59 (Hawabay/27/I/103), Reserved
    (
        (
            SELECT request_id
            FROM reserved_requests
            WHERE customer_id = 1
            LIMIT 1
        ), 59, 4, 4958000, 495800, -- 10% down payment
        247900, -- 5% commission
        'active', NOW() - INTERVAL '6 days'
    ),
    -- Reservation 2: Customer 4, Unit 61 (Hawabay/02/L/1), Reserved
    (
        (
            SELECT request_id
            FROM reserved_requests
            WHERE customer_id = 4
            LIMIT 1
        ), 61, 4, 4986600, 498660, -- 10% down payment
        249330, -- 5% commission
        'active', NOW() - INTERVAL '9 days'
    ),
    -- Reservation 3: Customer 2, Unit 63 (Hawabay/02/L/101), Paid/Completed
    (
        (
            SELECT request_id
            FROM requests
            WHERE customer_id = 2
                AND status = 'paid'
            LIMIT 1
        ), 63, 4, 5580000, 558000, -- 10% down payment
        279000, -- 5% commission
        'completed', NOW() - INTERVAL '14 days'
    );
-- Update unit status to 'reserved' for reserved units
UPDATE units
SET status = 'reserved'
WHERE unit_id IN (59, 61, 63);
-- ============================================
-- 5. PAYMENT RECORDS
-- ============================================
-- Add payment history for reservations
WITH reservation_data AS (
    SELECT reservation_id,
        request_id,
        broker_id,
        customer_pay_amount,
        created_at
    FROM reservations
)
INSERT INTO payment_records (
        reservation_id,
        paid_amount,
        payment_date,
        payment_method,
        recorded_by_broker_id,
        notes,
        created_at
    ) -- Payment 1: Customer 1's down payment
SELECT r.reservation_id,
    495800,
    (r.created_at)::DATE,
    'bank_transfer',
    r.broker_id,
    'Initial 10% down payment',
    r.created_at + INTERVAL '1 hour'
FROM reservation_data r
WHERE r.request_id = (
        SELECT request_id
        FROM requests
        WHERE customer_id = 1
            AND status = 'reserved'
        LIMIT 1
    )
UNION ALL
-- Payment 2: Customer 4's down payment
SELECT r.reservation_id,
    498660,
    (r.created_at)::DATE,
    'cash',
    r.broker_id,
    'Initial 10% down payment - cash',
    r.created_at + INTERVAL '2 hours'
FROM reservation_data r
WHERE r.request_id = (
        SELECT request_id
        FROM requests
        WHERE customer_id = 4
            AND status = 'reserved'
        LIMIT 1
    )
UNION ALL
-- Payment 3: Customer 2's down payment
SELECT r.reservation_id,
    558000,
    (r.created_at)::DATE,
    'bank_transfer',
    r.broker_id,
    'Initial 10% down payment',
    r.created_at + INTERVAL '1 hour'
FROM reservation_data r
WHERE r.request_id = (
        SELECT request_id
        FROM requests
        WHERE customer_id = 2
            AND status = 'paid'
        LIMIT 1
    )
UNION ALL
-- Payment 4: Customer 2's first installment
SELECT r.reservation_id,
    139500,
    -- Monthly installment
    (r.created_at + INTERVAL '30 days')::DATE,
    'bank_transfer',
    r.broker_id,
    'First monthly installment (4-year plan)',
    r.created_at + INTERVAL '30 days'
FROM reservation_data r
WHERE r.request_id = (
        SELECT request_id
        FROM requests
        WHERE customer_id = 2
            AND status = 'paid'
        LIMIT 1
    )
UNION ALL
-- Payment 5: Customer 2's second installment
SELECT r.reservation_id,
    139500,
    (r.created_at + INTERVAL '60 days')::DATE,
    'bank_transfer',
    r.broker_id,
    'Second monthly installment (4-year plan)',
    r.created_at + INTERVAL '60 days'
FROM reservation_data r
WHERE r.request_id = (
        SELECT request_id
        FROM requests
        WHERE customer_id = 2
            AND status = 'paid'
        LIMIT 1
    );
-- ============================================
-- 6. CONVERSATIONS
-- ============================================
-- Add chat history for requests
WITH request_data AS (
    SELECT request_id,
        customer_id,
        assigned_broker_id,
        created_at
    FROM requests
)
INSERT INTO conversations (
        related_request_id,
        actor_type,
        actor_id,
        message,
        created_at
    ) -- Conversation for Request 1 (customer 1, status: reserved)
SELECT request_id,
    'customer',
    customer_id,
    'مرحبا، أنا مهتم بشراء شقة في الساحل الشمالي',
    created_at
FROM request_data
WHERE customer_id = 1
    AND request_id = (
        SELECT request_id
        FROM requests
        WHERE customer_id = 1
            AND status = 'reserved'
        LIMIT 1
    )
UNION ALL
SELECT request_id,
    'ai',
    0,
    'أهلاً بك! سأساعدك في إيجاد الوحدة المناسبة. لدينا مشروع Hawabay في الساحل الشمالي. هل لديك مساحة معينة في البال؟',
    created_at + INTERVAL '5 seconds'
FROM request_data
WHERE customer_id = 1
    AND request_id = (
        SELECT request_id
        FROM requests
        WHERE customer_id = 1
            AND status = 'reserved'
        LIMIT 1
    )
UNION ALL
SELECT request_id,
    'customer',
    customer_id,
    'نعم، أبحث عن شقة حوالي 130-140 متر',
    created_at + INTERVAL '2 minutes'
FROM request_data
WHERE customer_id = 1
    AND request_id = (
        SELECT request_id
        FROM requests
        WHERE customer_id = 1
            AND status = 'reserved'
        LIMIT 1
    )
UNION ALL
SELECT request_id,
    'broker',
    assigned_broker_id,
    'مرحباً! أنا المسؤول عن طلبك. لدي وحدة ممتازة 134 متر في المبنى 27/I. هل تريد معاينتها؟',
    created_at + INTERVAL '1 hour'
FROM request_data
WHERE customer_id = 1
    AND request_id = (
        SELECT request_id
        FROM requests
        WHERE customer_id = 1
            AND status = 'reserved'
        LIMIT 1
    )
UNION ALL
SELECT request_id,
    'customer',
    customer_id,
    'نعم، متى يمكننا المعاينة؟',
    created_at + INTERVAL '1 hour 15 minutes'
FROM request_data
WHERE customer_id = 1
    AND request_id = (
        SELECT request_id
        FROM requests
        WHERE customer_id = 1
            AND status = 'reserved'
        LIMIT 1
    )
UNION ALL
SELECT request_id,
    'broker',
    assigned_broker_id,
    'ممتاز! الوحدة رائعة والسعر 4,958,000 جنيه. تم الحجز بنجاح!',
    created_at + INTERVAL '3 days'
FROM request_data
WHERE customer_id = 1
    AND request_id = (
        SELECT request_id
        FROM requests
        WHERE customer_id = 1
            AND status = 'reserved'
        LIMIT 1
    )
UNION ALL
-- Conversation for Request 3 (customer 3, status: lost)
SELECT request_id,
    'customer',
    customer_id,
    'هل لديكم وحدات أرخص؟',
    created_at
FROM request_data
WHERE customer_id = 3
    AND request_id = (
        SELECT request_id
        FROM requests
        WHERE customer_id = 3
            AND status = 'lost'
        LIMIT 1
    )
UNION ALL
SELECT request_id,
    'broker',
    assigned_broker_id,
    'الأسعار الحالية هي الأفضل في السوق. هل تريد مشاهدة الوحدات؟',
    created_at + INTERVAL '30 minutes'
FROM request_data
WHERE customer_id = 3
    AND request_id = (
        SELECT request_id
        FROM requests
        WHERE customer_id = 3
            AND status = 'lost'
        LIMIT 1
    )
UNION ALL
SELECT request_id,
    'customer',
    customer_id,
    'شكراً، سأفكر في الأمر',
    created_at + INTERVAL '2 hours'
FROM request_data
WHERE customer_id = 3
    AND request_id = (
        SELECT request_id
        FROM requests
        WHERE customer_id = 3
            AND status = 'lost'
        LIMIT 1
    )
UNION ALL
-- Conversation for Request 4 (customer 4, status: reserved)
SELECT request_id,
    'customer',
    customer_id,
    'مرحبا، أريد شقة في الدور الأرضي',
    created_at
FROM request_data
WHERE customer_id = 4
    AND request_id = (
        SELECT request_id
        FROM requests
        WHERE customer_id = 4
            AND status = 'reserved'
        LIMIT 1
    )
UNION ALL
SELECT request_id,
    'ai',
    0,
    'لدينا عدة خيارات في الدور الأرضي في مشروع Hawabay!',
    created_at + INTERVAL '3 seconds'
FROM request_data
WHERE customer_id = 4
    AND request_id = (
        SELECT request_id
        FROM requests
        WHERE customer_id = 4
            AND status = 'reserved'
        LIMIT 1
    )
UNION ALL
SELECT request_id,
    'broker',
    assigned_broker_id,
    'عندي وحدة مميزة 124 متر في المبنى 02/L - دور أرضي. السعر 4,986,600 جنيه',
    created_at + INTERVAL '45 minutes'
FROM request_data
WHERE customer_id = 4
    AND request_id = (
        SELECT request_id
        FROM requests
        WHERE customer_id = 4
            AND status = 'reserved'
        LIMIT 1
    )
UNION ALL
SELECT request_id,
    'customer',
    customer_id,
    'ممتاز! أريد حجزها',
    created_at + INTERVAL '2 hours'
FROM request_data
WHERE customer_id = 4
    AND request_id = (
        SELECT request_id
        FROM requests
        WHERE customer_id = 4
            AND status = 'reserved'
        LIMIT 1
    );
-- ============================================
-- SUMMARY
-- ============================================
-- Display summary of inserted data
DO $$ BEGIN RAISE NOTICE '============================================';
RAISE NOTICE 'Dummy Data Seed Completed Successfully!';
RAISE NOTICE '============================================';
RAISE NOTICE 'Inserted:';
RAISE NOTICE '- Broker-Area assignments: %',
(
    SELECT COUNT(*)
    FROM broker_areas
);
RAISE NOTICE '- Requests: %',
(
    SELECT COUNT(*)
    FROM requests
);
RAISE NOTICE '- Reservations: %',
(
    SELECT COUNT(*)
    FROM reservations
);
RAISE NOTICE '- Payment Records: %',
(
    SELECT COUNT(*)
    FROM payment_records
);
RAISE NOTICE '- Conversations: %',
(
    SELECT COUNT(*)
    FROM conversations
);
RAISE NOTICE '- Status History: %',
(
    SELECT COUNT(*)
    FROM request_status_history
);
RAISE NOTICE '============================================';
END $$;
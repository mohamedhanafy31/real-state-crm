-- Migration Script: Convert Integer IDs to Random String IDs (nanoid)
-- WARNING: This operation cannot be easily undone. Backup your database first.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
SET session_replication_role = 'replica';
BEGIN;
-- 1. BASE TABLES (No Foreign Keys or simple ones)
-- Users
ALTER TABLE "users"
ADD COLUMN "user_id_new" VARCHAR(21);
UPDATE "users"
SET "user_id_new" = substring(
        encode(gen_random_bytes(16), 'base64')
        from 1 for 21
    );
ALTER TABLE "users"
ALTER COLUMN "user_id_new"
SET NOT NULL;
-- Areas
ALTER TABLE "areas"
ADD COLUMN "area_id_new" VARCHAR(21);
UPDATE "areas"
SET "area_id_new" = substring(
        encode(gen_random_bytes(16), 'base64')
        from 1 for 21
    );
ALTER TABLE "areas"
ALTER COLUMN "area_id_new"
SET NOT NULL;
-- Customers
ALTER TABLE "customers"
ADD COLUMN "customer_id_new" VARCHAR(21);
UPDATE "customers"
SET "customer_id_new" = substring(
        encode(gen_random_bytes(16), 'base64')
        from 1 for 21
    );
ALTER TABLE "customers"
ALTER COLUMN "customer_id_new"
SET NOT NULL;
-- Broker Applications
ALTER TABLE "broker_applications"
ADD COLUMN "application_id_new" VARCHAR(21);
UPDATE "broker_applications"
SET "application_id_new" = substring(
        encode(gen_random_bytes(16), 'base64')
        from 1 for 21
    );
ALTER TABLE "broker_applications"
ALTER COLUMN "application_id_new"
SET NOT NULL;
-- 2. DEPENDENT TABLES (Level 1)
-- Brokers (Depends on Users)
ALTER TABLE "brokers"
ADD COLUMN "broker_id_new" VARCHAR(21);
UPDATE "brokers" b
SET "broker_id_new" = (
        SELECT "user_id_new"
        FROM "users"
        WHERE "user_id" = b."broker_id"
    );
-- If broker exists without user (shouldn't happen), generate new? No, safer to fail or assume valid data.
ALTER TABLE "brokers"
ALTER COLUMN "broker_id_new"
SET NOT NULL;
-- Projects (Depends on Areas)
ALTER TABLE "projects"
ADD COLUMN "project_id_new" VARCHAR(21);
ALTER TABLE "projects"
ADD COLUMN "area_id_new" VARCHAR(21);
UPDATE "projects" p
SET "project_id_new" = substring(
        encode(gen_random_bytes(16), 'base64')
        from 1 for 21
    ),
    "area_id_new" = (
        SELECT "area_id_new"
        FROM "areas"
        WHERE "area_id" = p."area_id"
    );
ALTER TABLE "projects"
ALTER COLUMN "project_id_new"
SET NOT NULL;
-- 3. DEPENDENT TABLES (Level 2)
-- Units (Depends on Projects)
ALTER TABLE "units"
ADD COLUMN "unit_id_new" VARCHAR(21);
ALTER TABLE "units"
ADD COLUMN "project_id_new" VARCHAR(21);
UPDATE "units" u
SET "unit_id_new" = substring(
        encode(gen_random_bytes(16), 'base64')
        from 1 for 21
    ),
    "project_id_new" = (
        SELECT "project_id_new"
        FROM "projects"
        WHERE "project_id" = u."project_id"
    );
ALTER TABLE "units"
ALTER COLUMN "unit_id_new"
SET NOT NULL;
-- Broker Areas (Depends on Brokers, Areas)
ALTER TABLE "broker_areas"
ADD COLUMN "broker_id_new" VARCHAR(21);
ALTER TABLE "broker_areas"
ADD COLUMN "area_id_new" VARCHAR(21);
UPDATE "broker_areas" ba
SET "broker_id_new" = (
        SELECT "broker_id_new"
        FROM "brokers"
        WHERE "broker_id" = ba."broker_id"
    ),
    "area_id_new" = (
        SELECT "area_id_new"
        FROM "areas"
        WHERE "area_id" = ba."area_id"
    );
-- PKs cannot be null
ALTER TABLE "broker_areas"
ALTER COLUMN "broker_id_new"
SET NOT NULL;
ALTER TABLE "broker_areas"
ALTER COLUMN "area_id_new"
SET NOT NULL;
-- Requests (Depends on Customers, Brokers, Areas)
ALTER TABLE "requests"
ADD COLUMN "request_id_new" VARCHAR(21);
ALTER TABLE "requests"
ADD COLUMN "customer_id_new" VARCHAR(21);
ALTER TABLE "requests"
ADD COLUMN "assigned_broker_id_new" VARCHAR(21);
ALTER TABLE "requests"
ADD COLUMN "area_id_new" VARCHAR(21);
UPDATE "requests" r
SET "request_id_new" = substring(
        encode(gen_random_bytes(16), 'base64')
        from 1 for 21
    ),
    "customer_id_new" = (
        SELECT "customer_id_new"
        FROM "customers"
        WHERE "customer_id" = r."customer_id"
    ),
    "assigned_broker_id_new" = (
        SELECT "broker_id_new"
        FROM "brokers"
        WHERE "broker_id" = r."assigned_broker_id"
    ),
    "area_id_new" = (
        SELECT "area_id_new"
        FROM "areas"
        WHERE "area_id" = r."area_id"
    );
ALTER TABLE "requests"
ALTER COLUMN "request_id_new"
SET NOT NULL;
-- 4. DEPENDENT TABLES (Level 3 - Depends on Requests, etc.)
-- Request Status History
ALTER TABLE "request_status_history"
ADD COLUMN "id_new" VARCHAR(21);
ALTER TABLE "request_status_history"
ADD COLUMN "request_id_new" VARCHAR(21);
ALTER TABLE "request_status_history"
ADD COLUMN "from_broker_id_new" VARCHAR(21);
ALTER TABLE "request_status_history"
ADD COLUMN "to_broker_id_new" VARCHAR(21);
UPDATE "request_status_history" rh
SET "id_new" = substring(
        encode(gen_random_bytes(16), 'base64')
        from 1 for 21
    ),
    "request_id_new" = (
        SELECT "request_id_new"
        FROM "requests"
        WHERE "request_id" = rh."request_id"
    ),
    "from_broker_id_new" = (
        SELECT "broker_id_new"
        FROM "brokers"
        WHERE "broker_id" = rh."from_broker_id"
    ),
    "to_broker_id_new" = (
        SELECT "broker_id_new"
        FROM "brokers"
        WHERE "broker_id" = rh."to_broker_id"
    );
ALTER TABLE "request_status_history"
ALTER COLUMN "id_new"
SET NOT NULL;
-- Reservations (Depends on Requests, Units, Brokers)
ALTER TABLE "reservations"
ADD COLUMN "reservation_id_new" VARCHAR(21);
ALTER TABLE "reservations"
ADD COLUMN "request_id_new" VARCHAR(21);
ALTER TABLE "reservations"
ADD COLUMN "unit_id_new" VARCHAR(21);
ALTER TABLE "reservations"
ADD COLUMN "broker_id_new" VARCHAR(21);
UPDATE "reservations" r
SET "reservation_id_new" = substring(
        encode(gen_random_bytes(16), 'base64')
        from 1 for 21
    ),
    "request_id_new" = (
        SELECT "request_id_new"
        FROM "requests"
        WHERE "request_id" = r."request_id"
    ),
    "unit_id_new" = (
        SELECT "unit_id_new"
        FROM "units"
        WHERE "unit_id" = r."unit_id"
    ),
    "broker_id_new" = (
        SELECT "broker_id_new"
        FROM "brokers"
        WHERE "broker_id" = r."broker_id"
    );
ALTER TABLE "reservations"
ALTER COLUMN "reservation_id_new"
SET NOT NULL;
-- Conversations (Depends on Requests, Actors)
ALTER TABLE "conversations"
ADD COLUMN "conversation_id_new" VARCHAR(21);
ALTER TABLE "conversations"
ADD COLUMN "related_request_id_new" VARCHAR(21);
ALTER TABLE "conversations"
ADD COLUMN "actor_id_new" VARCHAR(21);
UPDATE "conversations" c
SET "conversation_id_new" = substring(
        encode(gen_random_bytes(16), 'base64')
        from 1 for 21
    ),
    "related_request_id_new" = (
        SELECT "request_id_new"
        FROM "requests"
        WHERE "request_id" = c."related_request_id"
    ),
    "actor_id_new" = CASE
        WHEN "actor_type" = 'customer' THEN (
            SELECT "customer_id_new"
            FROM "customers"
            WHERE "customer_id" = c."actor_id"::int
        ) -- Assuming actor_id was varchar/int, need cast if it was string already? No, old was integer.
        WHEN "actor_type" = 'broker' THEN (
            SELECT "user_id_new"
            FROM "users"
            WHERE "user_id" = c."actor_id"::int
        ) -- Broker/User generic ID
        ELSE "actor_id"::varchar -- AI or other
    END;
ALTER TABLE "conversations"
ALTER COLUMN "conversation_id_new"
SET NOT NULL;
-- 5. APPLY SCHEMA CHANGES (Drop old columns, rename new ones)
-- Users
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "PK_cace4a159ff9f2512dd42373760" CASCADE;
ALTER TABLE "users" DROP COLUMN "user_id" CASCADE;
ALTER TABLE "users"
    RENAME COLUMN "user_id_new" TO "user_id";
ALTER TABLE "users"
ADD PRIMARY KEY ("user_id");
-- Areas
ALTER TABLE "areas" DROP CONSTRAINT IF EXISTS "PK_area_id" CASCADE;
ALTER TABLE "areas" DROP COLUMN "area_id" CASCADE;
ALTER TABLE "areas"
    RENAME COLUMN "area_id_new" TO "area_id";
ALTER TABLE "areas"
ADD PRIMARY KEY ("area_id");
-- Customers
ALTER TABLE "customers" DROP CONSTRAINT IF EXISTS "customers_pkey" CASCADE;
ALTER TABLE "customers" DROP CONSTRAINT IF EXISTS "PK_customer_id" CASCADE;
ALTER TABLE "customers" DROP COLUMN "customer_id" CASCADE;
ALTER TABLE "customers"
    RENAME COLUMN "customer_id_new" TO "customer_id";
ALTER TABLE "customers"
ADD PRIMARY KEY ("customer_id");
-- Brokers
ALTER TABLE "brokers" DROP CONSTRAINT IF EXISTS "brokers_pkey" CASCADE;
ALTER TABLE "brokers" DROP COLUMN "broker_id" CASCADE;
ALTER TABLE "brokers"
    RENAME COLUMN "broker_id_new" TO "broker_id";
ALTER TABLE "brokers"
ADD PRIMARY KEY ("broker_id");
ALTER TABLE "brokers"
ADD CONSTRAINT "FK_broker_user" FOREIGN KEY ("broker_id") REFERENCES "users"("user_id") ON DELETE CASCADE;
-- Projects
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_pkey" CASCADE;
ALTER TABLE "projects" DROP COLUMN "project_id" CASCADE;
ALTER TABLE "projects"
    RENAME COLUMN "project_id_new" TO "project_id";
ALTER TABLE "projects"
ADD PRIMARY KEY ("project_id");
ALTER TABLE "projects" DROP COLUMN "area_id" CASCADE;
ALTER TABLE "projects"
    RENAME COLUMN "area_id_new" TO "area_id";
ALTER TABLE "projects"
ADD CONSTRAINT "FK_project_area" FOREIGN KEY ("area_id") REFERENCES "areas"("area_id");
-- Units
ALTER TABLE "units" DROP CONSTRAINT IF EXISTS "units_pkey" CASCADE;
ALTER TABLE "units" DROP COLUMN "unit_id" CASCADE;
ALTER TABLE "units"
    RENAME COLUMN "unit_id_new" TO "unit_id";
ALTER TABLE "units"
ADD PRIMARY KEY ("unit_id");
ALTER TABLE "units" DROP COLUMN "project_id" CASCADE;
ALTER TABLE "units"
    RENAME COLUMN "project_id_new" TO "project_id";
ALTER TABLE "units"
ADD CONSTRAINT "FK_unit_project" FOREIGN KEY ("project_id") REFERENCES "projects"("project_id");
-- Broker Areas
ALTER TABLE "broker_areas" DROP CONSTRAINT IF EXISTS "broker_areas_pkey" CASCADE;
ALTER TABLE "broker_areas" DROP COLUMN "broker_id" CASCADE;
ALTER TABLE "broker_areas"
    RENAME COLUMN "broker_id_new" TO "broker_id";
ALTER TABLE "broker_areas" DROP COLUMN "area_id" CASCADE;
ALTER TABLE "broker_areas"
    RENAME COLUMN "area_id_new" TO "area_id";
ALTER TABLE "broker_areas"
ADD PRIMARY KEY ("broker_id", "area_id");
ALTER TABLE "broker_areas"
ADD CONSTRAINT "FK_ba_broker" FOREIGN KEY ("broker_id") REFERENCES "brokers"("broker_id") ON DELETE CASCADE;
ALTER TABLE "broker_areas"
ADD CONSTRAINT "FK_ba_area" FOREIGN KEY ("area_id") REFERENCES "areas"("area_id");
-- onDelete?
-- Requests
ALTER TABLE "requests" DROP CONSTRAINT IF EXISTS "requests_pkey" CASCADE;
ALTER TABLE "requests" DROP COLUMN "request_id" CASCADE;
ALTER TABLE "requests"
    RENAME COLUMN "request_id_new" TO "request_id";
ALTER TABLE "requests"
ADD PRIMARY KEY ("request_id");
ALTER TABLE "requests" DROP COLUMN "customer_id" CASCADE;
ALTER TABLE "requests"
    RENAME COLUMN "customer_id_new" TO "customer_id";
ALTER TABLE "requests"
ADD CONSTRAINT "FK_request_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id");
ALTER TABLE "requests" DROP COLUMN "assigned_broker_id" CASCADE;
ALTER TABLE "requests"
    RENAME COLUMN "assigned_broker_id_new" TO "assigned_broker_id";
ALTER TABLE "requests"
ADD CONSTRAINT "FK_request_broker" FOREIGN KEY ("assigned_broker_id") REFERENCES "brokers"("broker_id") ON DELETE
SET NULL;
ALTER TABLE "requests" DROP COLUMN "area_id" CASCADE;
ALTER TABLE "requests"
    RENAME COLUMN "area_id_new" TO "area_id";
ALTER TABLE "requests"
ADD CONSTRAINT "FK_request_area" FOREIGN KEY ("area_id") REFERENCES "areas"("area_id");
-- Broker Applications
ALTER TABLE "broker_applications" DROP CONSTRAINT IF EXISTS "broker_applications_pkey" CASCADE;
ALTER TABLE "broker_applications" DROP COLUMN "application_id" CASCADE;
ALTER TABLE "broker_applications"
    RENAME COLUMN "application_id_new" TO "application_id";
ALTER TABLE "broker_applications"
ADD PRIMARY KEY ("application_id");
-- Request Status History
ALTER TABLE "request_status_history" DROP CONSTRAINT IF EXISTS "request_status_history_pkey" CASCADE;
ALTER TABLE "request_status_history" DROP COLUMN "id" CASCADE;
ALTER TABLE "request_status_history"
    RENAME COLUMN "id_new" TO "id";
ALTER TABLE "request_status_history"
ADD PRIMARY KEY ("id");
ALTER TABLE "request_status_history" DROP COLUMN "request_id" CASCADE;
ALTER TABLE "request_status_history"
    RENAME COLUMN "request_id_new" TO "request_id";
ALTER TABLE "request_status_history"
ADD CONSTRAINT "FK_rsh_request" FOREIGN KEY ("request_id") REFERENCES "requests"("request_id");
ALTER TABLE "request_status_history" DROP COLUMN "from_broker_id" CASCADE;
ALTER TABLE "request_status_history"
    RENAME COLUMN "from_broker_id_new" TO "from_broker_id";
-- Foreign keys for brokers? Usually yes.
-- ALTER TABLE "request_status_history" ADD CONSTRAINT "FK_rsh_from_broker" FOREIGN KEY ("from_broker_id") REFERENCES "brokers"("broker_id");
ALTER TABLE "request_status_history" DROP COLUMN "to_broker_id" CASCADE;
ALTER TABLE "request_status_history"
    RENAME COLUMN "to_broker_id_new" TO "to_broker_id";
-- Reservations
ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "reservations_pkey" CASCADE;
ALTER TABLE "reservations" DROP COLUMN "reservation_id" CASCADE;
ALTER TABLE "reservations"
    RENAME COLUMN "reservation_id_new" TO "reservation_id";
ALTER TABLE "reservations"
ADD PRIMARY KEY ("reservation_id");
ALTER TABLE "reservations" DROP COLUMN "request_id" CASCADE;
ALTER TABLE "reservations"
    RENAME COLUMN "request_id_new" TO "request_id";
ALTER TABLE "reservations"
ADD CONSTRAINT "FK_reservation_request" FOREIGN KEY ("request_id") REFERENCES "requests"("request_id");
ALTER TABLE "reservations" DROP COLUMN "unit_id" CASCADE;
ALTER TABLE "reservations"
    RENAME COLUMN "unit_id_new" TO "unit_id";
ALTER TABLE "reservations"
ADD CONSTRAINT "FK_reservation_unit" FOREIGN KEY ("unit_id") REFERENCES "units"("unit_id");
ALTER TABLE "reservations" DROP COLUMN "broker_id" CASCADE;
ALTER TABLE "reservations"
    RENAME COLUMN "broker_id_new" TO "broker_id";
ALTER TABLE "reservations"
ADD CONSTRAINT "FK_reservation_broker" FOREIGN KEY ("broker_id") REFERENCES "brokers"("broker_id") ON DELETE
SET NULL;
-- Conversations
ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "conversations_pkey" CASCADE;
ALTER TABLE "conversations" DROP COLUMN "conversation_id" CASCADE;
ALTER TABLE "conversations"
    RENAME COLUMN "conversation_id_new" TO "conversation_id";
ALTER TABLE "conversations"
ADD PRIMARY KEY ("conversation_id");
ALTER TABLE "conversations" DROP COLUMN "related_request_id" CASCADE;
ALTER TABLE "conversations"
    RENAME COLUMN "related_request_id_new" TO "related_request_id";
ALTER TABLE "conversations"
ADD CONSTRAINT "FK_conversation_request" FOREIGN KEY ("related_request_id") REFERENCES "requests"("request_id");
ALTER TABLE "conversations" DROP COLUMN "actor_id" CASCADE;
ALTER TABLE "conversations"
    RENAME COLUMN "actor_id_new" TO "actor_id";
-- Restore strictness
SET session_replication_role = 'origin';
COMMIT;
-- Phase 3: Database Migrations for Embeddings
-- Add FK constraints and triggers for embedding tables
-- ================================================
-- Create pgvector extension if not exists
-- ================================================
CREATE EXTENSION IF NOT EXISTS vector;
-- ================================================
-- Create embedding tables if not exists
-- ================================================
CREATE TABLE IF NOT EXISTS areas_embeddings (
    area_id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    embedding vector(768),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS projects_embeddings (
    project_id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    area_id INTEGER,
    embedding vector(768),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS unit_types_embeddings (
    unit_type_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    name_ar VARCHAR(100),
    embedding vector(768),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- ================================================
-- Add Foreign Key constraints (with CASCADE delete)
-- ================================================
-- Note: Only add FK if the areas table exists
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE tablename = 'areas'
) THEN -- Check if constraint already exists
IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_areas_embeddings_area_id'
) THEN
ALTER TABLE areas_embeddings
ADD CONSTRAINT fk_areas_embeddings_area_id FOREIGN KEY (area_id) REFERENCES areas(area_id) ON DELETE CASCADE;
RAISE NOTICE 'Added FK constraint for areas_embeddings.area_id';
END IF;
END IF;
END $$;
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE tablename = 'projects'
) THEN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_projects_embeddings_project_id'
) THEN
ALTER TABLE projects_embeddings
ADD CONSTRAINT fk_projects_embeddings_project_id FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE;
RAISE NOTICE 'Added FK constraint for projects_embeddings.project_id';
END IF;
END IF;
END $$;
-- ================================================
-- Create updated_at trigger function
-- ================================================
CREATE OR REPLACE FUNCTION update_embedding_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- ================================================
-- Add updated_at triggers
-- ================================================
DROP TRIGGER IF EXISTS trigger_areas_embeddings_updated_at ON areas_embeddings;
CREATE TRIGGER trigger_areas_embeddings_updated_at BEFORE
UPDATE ON areas_embeddings FOR EACH ROW EXECUTE FUNCTION update_embedding_timestamp();
DROP TRIGGER IF EXISTS trigger_projects_embeddings_updated_at ON projects_embeddings;
CREATE TRIGGER trigger_projects_embeddings_updated_at BEFORE
UPDATE ON projects_embeddings FOR EACH ROW EXECUTE FUNCTION update_embedding_timestamp();
-- ================================================
-- Create indexes for faster similarity search (if not exists)
-- ================================================
-- Note: ivfflat indexes work best with >1000 rows
-- For smaller datasets, use regular btree or GIN indexes
CREATE INDEX IF NOT EXISTS idx_areas_embeddings_name ON areas_embeddings (name);
CREATE INDEX IF NOT EXISTS idx_projects_embeddings_name ON projects_embeddings (name);
CREATE INDEX IF NOT EXISTS idx_projects_embeddings_area_id ON projects_embeddings (area_id);
CREATE INDEX IF NOT EXISTS idx_unit_types_embeddings_name ON unit_types_embeddings (name);
-- ================================================
-- Insert default unit types (if not exists)
-- ================================================
INSERT INTO unit_types_embeddings (name, name_ar)
VALUES ('Apartment', 'شقة'),
    ('Villa', 'فيلا'),
    ('Duplex', 'دوبلكس'),
    ('Studio', 'استوديو'),
    ('Penthouse', 'بنتهاوس'),
    ('Townhouse', 'تاون هاوس'),
    ('Chalet', 'شاليه'),
    ('Twin House', 'توين هاوس') ON CONFLICT (name) DO NOTHING;
-- ================================================
-- Verification queries
-- ================================================
SELECT 'areas_embeddings' as table_name,
    count(*) as row_count
FROM areas_embeddings
UNION ALL
SELECT 'projects_embeddings',
    count(*)
FROM projects_embeddings
UNION ALL
SELECT 'unit_types_embeddings',
    count(*)
FROM unit_types_embeddings;
-- Show constraints
SELECT tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name LIKE '%embeddings%';
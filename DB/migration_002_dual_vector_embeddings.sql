-- Migration 002: Add Dual-Vector Embedding Columns
-- Prerequisites: migration_001_add_arabic_names.sql must be run first
-- Run with: psql -U admin -d real_estate_crm -f migration_002_dual_vector_embeddings.sql
-- Step 1: Add dual embedding columns to areas_embeddings
ALTER TABLE areas_embeddings
ADD COLUMN IF NOT EXISTS embedding_en vector(1024),
    ADD COLUMN IF NOT EXISTS embedding_ar vector(1024);
-- Step 2: Add dual embedding columns to projects_embeddings  
ALTER TABLE projects_embeddings
ADD COLUMN IF NOT EXISTS embedding_en vector(1024),
    ADD COLUMN IF NOT EXISTS embedding_ar vector(1024);
-- Step 3: Add dual embedding columns to unit_types_embeddings
ALTER TABLE unit_types_embeddings
ADD COLUMN IF NOT EXISTS embedding_en vector(1024),
    ADD COLUMN IF NOT EXISTS embedding_ar vector(1024);
-- Step 4: Create indexes for efficient vector search
-- Note: ivfflat indexes require training data, created after embedding population
-- Placeholder for future index creation (after data population):
-- CREATE INDEX idx_areas_emb_en ON areas_embeddings USING ivfflat (embedding_en vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX idx_areas_emb_ar ON areas_embeddings USING ivfflat (embedding_ar vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX idx_projects_emb_en ON projects_embeddings USING ivfflat (embedding_en vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX idx_projects_emb_ar ON projects_embeddings USING ivfflat (embedding_ar vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX idx_unit_types_emb_en ON unit_types_embeddings USING ivfflat (embedding_en vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX idx_unit_types_emb_ar ON unit_types_embeddings USING ivfflat (embedding_ar vector_cosine_ops) WITH (lists = 100);
-- Step 5: Verify schema changes
\ d areas_embeddings \ d projects_embeddings \ d unit_types_embeddings -- Step 6: Show migration summary
SELECT 'Migration 002 completed successfully' as status;
SELECT 'Next step: Re-sync all entities via embedding service to populate dual vectors' as next_action;
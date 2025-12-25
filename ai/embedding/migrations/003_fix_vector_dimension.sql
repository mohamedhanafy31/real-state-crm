-- Phase 3.1: Update Embedding Dimensions to 1024
-- The Muffakir_Embedding_V2 model actually uses 1024 dimensions.
-- 1. Drop existing indexes that depend on the old dimension
DROP INDEX IF EXISTS areas_embedding_idx;
DROP INDEX IF EXISTS projects_embedding_idx;
DROP INDEX IF EXISTS unit_types_embedding_idx;
-- 2. Alter column types to vector(1024)
ALTER TABLE areas_embeddings
ALTER COLUMN embedding TYPE vector(1024);
ALTER TABLE projects_embeddings
ALTER COLUMN embedding TYPE vector(1024);
ALTER TABLE unit_types_embeddings
ALTER COLUMN embedding TYPE vector(1024);
-- 3. Re-create indexes
CREATE INDEX areas_embedding_idx ON areas_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
CREATE INDEX projects_embedding_idx ON projects_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
CREATE INDEX unit_types_embedding_idx ON unit_types_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
-- 4. Verify
SELECT column_name,
    data_type,
    character_maximum_length,
    udt_name
FROM information_schema.columns
WHERE table_name IN (
        'areas_embeddings',
        'projects_embeddings',
        'unit_types_embeddings'
    )
    AND column_name = 'embedding';
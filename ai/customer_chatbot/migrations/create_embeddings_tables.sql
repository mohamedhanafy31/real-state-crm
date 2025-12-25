-- Create pgvector tables for fast semantic search
-- Areas and Projects with pre-computed embeddings
-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;
-- Create areas_embeddings table
CREATE TABLE IF NOT EXISTS areas_embeddings (
    area_id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    embedding vector(768),
    -- Muffakir_Embedding_V2 dimension
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Create projects_embeddings table
CREATE TABLE IF NOT EXISTS projects_embeddings (
    project_id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    area_id INTEGER,
    embedding vector(768),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Create unit_types_embeddings table
CREATE TABLE IF NOT EXISTS unit_types_embeddings (
    unit_type_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    embedding vector(768),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Create indexes for fast similarity search
CREATE INDEX IF NOT EXISTS areas_embedding_idx ON areas_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
CREATE INDEX IF NOT EXISTS projects_embedding_idx ON projects_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS unit_types_embedding_idx ON unit_types_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 5);
-- Insert unit types with bilingual names
INSERT INTO unit_types_embeddings (name, name_ar)
VALUES ('Apartment', 'شقة'),
    ('Villa', 'فيلا'),
    ('Duplex', 'دوبلكس'),
    ('Studio', 'استوديو'),
    ('Penthouse', 'بنتهاوس'),
    ('Townhouse', 'تاون هاوس') ON CONFLICT (unit_type_id) DO NOTHING;
COMMENT ON TABLE areas_embeddings IS 'Pre-computed embeddings for areas for fast semantic search';
COMMENT ON TABLE projects_embeddings IS 'Pre-computed embeddings for projects for fast semantic search';
COMMENT ON TABLE unit_types_embeddings IS 'Pre-computed embeddings for unit types for fast semantic search';
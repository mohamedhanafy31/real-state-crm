import { Pool } from 'pg';

/**
 * Initialize test database with required seed data
 * This runs before all E2E tests to ensure foreign key references work
 */
export default async function globalSetup() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5433'),
        database: process.env.DB_DATABASE || 'real_estate_crm',
        user: process.env.DB_USERNAME || 'admin',
        password: process.env.DB_PASSWORD || 'password',
    });

    try {
        console.log('🔧 Initializing test database...');

        // Seed areas table - critical for FK constraints
        await pool.query(`
            INSERT INTO areas (area_id, name) VALUES 
              (1, 'Cairo'),
              (2, 'Giza'),
              (3, 'Alexandria'),
              (4, 'Sharm El Sheikh'),
              (5, 'Hurghada')
            ON CONFLICT (area_id) DO NOTHING;
        `);

        // Reset sequence
        await pool.query(`
            SELECT setval('areas_area_id_seq', (SELECT MAX(area_id) FROM areas));
        `);

        console.log('✅ Test database seeded successfully');
    } catch (error) {
        console.error('❌ Test database seeding failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

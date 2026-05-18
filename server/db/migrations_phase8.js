import pool from '../config/db.js';

const runPhase8Migrations = async () => {
  console.log('🚀 [Migrations] Starting Phase 8: Grievance Form Upgrades (Name, Mobile, Address)...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🔹 Adding complainant_name column to complaints table...');
    await client.query(`
      ALTER TABLE complaints 
      ADD COLUMN IF NOT EXISTS complainant_name VARCHAR(255);
    `);

    console.log('🔹 Adding complainant_mobile column to complaints table...');
    await client.query(`
      ALTER TABLE complaints 
      ADD COLUMN IF NOT EXISTS complainant_mobile VARCHAR(20);
    `);

    console.log('🔹 Adding college_school_address column to complaints table...');
    await client.query(`
      ALTER TABLE complaints 
      ADD COLUMN IF NOT EXISTS college_school_address TEXT;
    `);

    await client.query('COMMIT');
    console.log('✅ [Migrations] Phase 8 Database Schema Upgrades Applied Successfully!');
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [Migrations] Phase 8 Error during migration:', error.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
};

runPhase8Migrations();

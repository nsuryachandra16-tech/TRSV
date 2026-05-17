import { query } from '../config/db.js';

async function runMigrations() {
  console.log('🚀 [Migrations] Starting Phase 3 Database Schema Upgrades...');

  try {
    // 1. Alter Complaints Table
    console.log('🔹 Updating complaints table schema...');
    await query(`
      ALTER TABLE complaints 
      ADD COLUMN IF NOT EXISTS anonymous BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS emergency_flag BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS escalation_level INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS current_handler VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
    `);

    // 2. Create complaint_files Table
    console.log('🔹 Creating complaint_files table...');
    await query(`
      CREATE TABLE IF NOT EXISTS complaint_files (
        id SERIAL PRIMARY KEY,
        complaint_id INT REFERENCES complaints(id) ON DELETE CASCADE,
        file_url TEXT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create complaint_discussions Table
    console.log('🔹 Creating complaint_discussions table...');
    await query(`
      CREATE TABLE IF NOT EXISTS complaint_discussions (
        id SERIAL PRIMARY KEY,
        complaint_id INT REFERENCES complaints(id) ON DELETE CASCADE,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create complaint_timeline Table
    console.log('🔹 Creating complaint_timeline table...');
    await query(`
      CREATE TABLE IF NOT EXISTS complaint_timeline (
        id SERIAL PRIMARY KEY,
        complaint_id INT REFERENCES complaints(id) ON DELETE CASCADE,
        action_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Create complaint_escalations Table
    console.log('🔹 Creating complaint_escalations table...');
    await query(`
      CREATE TABLE IF NOT EXISTS complaint_escalations (
        id SERIAL PRIMARY KEY,
        complaint_id INT REFERENCES complaints(id) ON DELETE CASCADE,
        escalated_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        level_from INT NOT NULL,
        level_to INT NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Create emergency_cases Table
    console.log('🔹 Creating emergency_cases table...');
    await query(`
      CREATE TABLE IF NOT EXISTS emergency_cases (
        id SERIAL PRIMARY KEY,
        complaint_id INT REFERENCES complaints(id) ON DELETE CASCADE,
        severity_score VARCHAR(50) DEFAULT 'high',
        dispatched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolution_status VARCHAR(50) DEFAULT 'active'
      );
    `);

    // 7. Create complaint_categories Table
    console.log('🔹 Creating complaint_categories table...');
    await query(`
      CREATE TABLE IF NOT EXISTS complaint_categories (
        id SERIAL PRIMARY KEY,
        category_name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Create realtime_activity_logs Table
    console.log('🔹 Creating realtime_activity_logs table...');
    await query(`
      CREATE TABLE IF NOT EXISTS realtime_activity_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        activity_type VARCHAR(100) NOT NULL,
        details TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Seed categories
    console.log('🌱 Seeding complaint categories...');
    const categories = [
      ['Ragging', 'Zero-tolerance campus anti-ragging security dispatch'],
      ['Harassment', 'Confidential campus harassment protection and advice'],
      ['Faculty Issues', 'Resolution of unfair marking, classroom disputes or misconduct'],
      ['Infrastructure Problems', 'Campus outages, transport, and basic student amenities'],
      ['Fee Issues', 'Scholarship delays, direct payment disputes, or processing blocks'],
      ['Hostel Issues', 'Living conditions, mess quality, or warden administration disputes'],
      ['Transport Problems', 'Bus route connectivity, timing issues, or student transit passes'],
      ['Safety Issues', 'Escalations of campus security risks, dangerous areas, or lighting'],
      ['Administration Problems', 'Delays in certificates, registry issues, or staff response time'],
      ['Abuse', 'Escalations of physical, verbal, or mental intimidation on campus'],
      ['Other', 'Miscellaneous advocate grievances under state board jurisdiction']
    ];

    for (const [name, desc] of categories) {
      await query(
        'INSERT INTO complaint_categories (category_name, description) VALUES ($1, $2) ON CONFLICT (category_name) DO NOTHING',
        [name, desc]
      );
    }

    console.log('✅ [Migrations] Phase 3 Database Upgrades Applied Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('🚨 [Migrations] Failed to run database schema upgrades:', error.message);
    process.exit(1);
  }
}

runMigrations();

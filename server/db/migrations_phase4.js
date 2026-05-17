import { query } from '../config/db.js';

async function runPhase4Migrations() {
  console.log('🚀 [Migrations] Starting Phase 4 Database Schema Upgrades...');

  try {
    // 1. Create analytics_logs Table (For aggregated trend charts and Recharts)
    console.log('🔹 Creating analytics_logs table...');
    await query(`
      CREATE TABLE IF NOT EXISTS analytics_logs (
        id SERIAL PRIMARY KEY,
        metric_name VARCHAR(100) NOT NULL,
        metric_value NUMERIC DEFAULT 0,
        constituency_id INT REFERENCES constituencies(id) ON DELETE CASCADE,
        recorded_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(metric_name, constituency_id, recorded_date)
      );
    `);

    // 2. Create emergency_alerts Table (For the Command Center red-pulse queues)
    console.log('🔹 Creating emergency_alerts table...');
    await query(`
      CREATE TABLE IF NOT EXISTS emergency_alerts (
        id SERIAL PRIMARY KEY,
        complaint_id INT REFERENCES complaints(id) ON DELETE CASCADE,
        alert_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        triggered_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        acknowledged_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create leadership_activity Table (For Leader Profiles and ranking scores)
    console.log('🔹 Creating leadership_activity table...');
    await query(`
      CREATE TABLE IF NOT EXISTS leadership_activity (
        id SERIAL PRIMARY KEY,
        leader_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        action_type VARCHAR(100) NOT NULL,
        complaint_id INT REFERENCES complaints(id) ON DELETE SET NULL,
        impact_score INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create transparency_metrics Table (Cached materialized views for fast public portal load)
    console.log('🔹 Creating transparency_metrics table...');
    await query(`
      CREATE TABLE IF NOT EXISTS transparency_metrics (
        id SERIAL PRIMARY KEY,
        total_resolved INT DEFAULT 0,
        average_resolution_hours NUMERIC DEFAULT 0,
        emergency_response_minutes NUMERIC DEFAULT 0,
        last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Create constituency_rankings Table (Leaderboards)
    console.log('🔹 Creating constituency_rankings table...');
    await query(`
      CREATE TABLE IF NOT EXISTS constituency_rankings (
        id SERIAL PRIMARY KEY,
        constituency_id INT REFERENCES constituencies(id) ON DELETE CASCADE,
        performance_score NUMERIC DEFAULT 0,
        resolution_rate NUMERIC DEFAULT 0,
        rank_position INT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Create audit_logs Table (Immutable governance ledger)
    console.log('🔹 Creating audit_logs table...');
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        action_context VARCHAR(100) NOT NULL,
        previous_state TEXT,
        new_state TEXT,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Create realtime_feeds Table (For the live scrolling ticker system)
    console.log('🔹 Creating realtime_feeds table...');
    await query(`
      CREATE TABLE IF NOT EXISTS realtime_feeds (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        event_message TEXT NOT NULL,
        severity VARCHAR(50) DEFAULT 'info',
        source_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Create announcement_categories Table (Tags for state notices)
    console.log('🔹 Creating announcement_categories table...');
    await query(`
      CREATE TABLE IF NOT EXISTS announcement_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        priority_level INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add priority_level to existing announcements if missing
    console.log('🔹 Updating announcements table...');
    await query(`
      ALTER TABLE announcements 
      ADD COLUMN IF NOT EXISTS category_id INT REFERENCES announcement_categories(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'Normal';
    `);

    console.log('✅ [Migrations] Phase 4 Database Upgrades Applied Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('🚨 [Migrations] Failed to run database schema upgrades:', error.message);
    process.exit(1);
  }
}

runPhase4Migrations();

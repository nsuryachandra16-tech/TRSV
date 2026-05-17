import pool from '../config/db.js';

const runPhase5Migrations = async () => {
  console.log('🚀 [Migrations] Starting Phase 5 Enterprise Security & Presence Upgrades...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Audit Security Logs
    // Tracks critical security events, failed auths, overrides, and role changes
    console.log('🔹 Creating audit_security_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_security_logs (
        id SERIAL PRIMARY KEY,
        action_type VARCHAR(100) NOT NULL,
        actor_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        actor_role VARCHAR(50),
        target_id VARCHAR(255),
        ip_address VARCHAR(45),
        details JSONB,
        severity VARCHAR(20) DEFAULT 'info',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Notification History
    // Robust, categorized notification timeline for users
    console.log('🔹 Creating notification_history table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_history (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL, -- e.g., 'system', 'complaint', 'emergency', 'broadcast'
        priority VARCHAR(20) DEFAULT 'normal', -- 'normal', 'important', 'critical'
        read_status BOOLEAN DEFAULT FALSE,
        reference_id INTEGER, -- e.g., complaint_id
        reference_type VARCHAR(50), -- e.g., 'complaint'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. User Presence
    // Live tracking of which leaders are online
    console.log('🔹 Creating user_presence table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_presence (
        user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'offline', -- 'online', 'away', 'offline'
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        current_session_id VARCHAR(255),
        ip_address VARCHAR(45)
      );
    `);

    // 4. System Health Logs
    // Monitors API latency, database connection health
    console.log('🔹 Creating system_health_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_health_logs (
        id SERIAL PRIMARY KEY,
        metric_name VARCHAR(100) NOT NULL,
        metric_value NUMERIC NOT NULL,
        node_id VARCHAR(100),
        status VARCHAR(20) DEFAULT 'healthy',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Verification Logs
    // Cryptographic-like logs for verifying leader actions
    console.log('🔹 Creating verification_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_logs (
        id SERIAL PRIMARY KEY,
        verified_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        target_type VARCHAR(50) NOT NULL, -- 'complaint', 'user_profile', 'announcement'
        target_id INTEGER NOT NULL,
        verification_hash VARCHAR(255) UNIQUE,
        verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Search Index Cache
    // Materialized-view style table for rapid Ctrl+K global lookups
    console.log('🔹 Creating search_index_cache table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_index_cache (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL, -- 'complaint', 'user', 'announcement', 'constituency'
        entity_id INTEGER NOT NULL,
        search_vector TSVECTOR,
        title VARCHAR(255),
        subtitle VARCHAR(255),
        url_path VARCHAR(255),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create GIN Index for blazing fast text searches
      CREATE INDEX IF NOT EXISTS search_idx ON search_index_cache USING GIN(search_vector);
    `);

    await client.query('COMMIT');
    console.log('✅ [Migrations] Phase 5 Enterprise Upgrades Applied Successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [Migrations] Phase 5 Error during migration:', error);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
};

runPhase5Migrations();

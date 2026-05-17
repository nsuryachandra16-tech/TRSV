import pool from '../config/db.js';

const runPhase6Migrations = async () => {
  console.log('🚀 [Migrations] Starting Phase 6 Advanced Telemetry & Automation Upgrades...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Backup Logs
    console.log('🔹 Creating backup_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS backup_logs (
        id SERIAL PRIMARY KEY,
        backup_name VARCHAR(255) NOT NULL,
        backup_type VARCHAR(50) DEFAULT 'manual', -- 'scheduled', 'manual'
        file_size INTEGER,
        created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'success', -- 'success', 'failed'
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Telemetry Metrics
    console.log('🔹 Creating telemetry_metrics table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS telemetry_metrics (
        id SERIAL PRIMARY KEY,
        metric_name VARCHAR(100) NOT NULL,
        metric_value NUMERIC NOT NULL,
        category VARCHAR(50), -- 'api', 'db', 'emergency', 'websocket'
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Governance Insights
    console.log('🔹 Creating governance_insights table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS governance_insights (
        id SERIAL PRIMARY KEY,
        constituency_id INTEGER REFERENCES constituencies(id) ON DELETE CASCADE,
        insight_type VARCHAR(100) NOT NULL, -- 'cluster_alert', 'escalation_risk', 'resolution_delay'
        severity VARCHAR(20) DEFAULT 'medium',
        insight_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Automation Logs
    console.log('🔹 Creating automation_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS automation_logs (
        id SERIAL PRIMARY KEY,
        job_name VARCHAR(100) NOT NULL, -- 'auto_escalate', 'reminders_dispatch'
        records_affected INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'success',
        error_message TEXT,
        triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. System Recovery Logs
    console.log('🔹 Creating system_recovery_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_recovery_logs (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL, -- 'reconnect_success', 'failed_upload_recovered', 'failover'
        node_name VARCHAR(100) DEFAULT 'core_backend',
        details JSONB,
        severity VARCHAR(20) DEFAULT 'info',
        logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Deployment Health Logs
    console.log('🔹 Creating deployment_health_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS deployment_health_logs (
        id SERIAL PRIMARY KEY,
        env_mode VARCHAR(20) DEFAULT 'production',
        cpu_usage NUMERIC,
        memory_usage NUMERIC,
        uptime_seconds BIGINT,
        checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('✅ [Migrations] Phase 6 Database Topology Deployed Successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [Migrations] Phase 6 Error during migration:', error);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
};

runPhase6Migrations();

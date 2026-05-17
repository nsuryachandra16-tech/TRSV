import pool from '../config/db.js';

const runIdentityMigrations = async () => {
  console.log('🚀 [Migrations] Initializing Digital Identity & QR Verification Infrastructure...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create verification_status lookup table
    console.log('🔹 Creating verification_status table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_status (
        status_code VARCHAR(50) PRIMARY KEY,
        status_label VARCHAR(100) NOT NULL,
        status_color VARCHAR(50) NOT NULL
      );
    `);

    // Seed base verification statuses
    await client.query(`
      INSERT INTO verification_status (status_code, status_label, status_color)
      VALUES 
        ('Verified', 'Verified Official', 'emerald'),
        ('Active', 'Active Member', 'cyan'),
        ('Suspended', 'Suspended Pending Audit', 'amber'),
        ('Inactive', 'Inactive Cardholder', 'slate'),
        ('Revoked', 'Revoked Cardholder', 'rose')
      ON CONFLICT (status_code) DO NOTHING;
    `);

    // 2. Create member_identities table
    console.log('🔹 Creating member_identities table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS member_identities (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        tsrv_member_id VARCHAR(100) UNIQUE NOT NULL,
        qr_token VARCHAR(255) UNIQUE NOT NULL,
        verification_status VARCHAR(50) REFERENCES verification_status(status_code) DEFAULT 'Active',
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 year'),
        revoked BOOLEAN DEFAULT FALSE,
        active BOOLEAN DEFAULT TRUE
      );
    `);

    // 3. Create id_generation_logs table
    console.log('🔹 Creating id_generation_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS id_generation_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        generated_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        member_id VARCHAR(100) NOT NULL
      );
    `);

    // 4. Create qr_verification_logs table
    console.log('🔹 Creating qr_verification_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS qr_verification_logs (
        id SERIAL PRIMARY KEY,
        member_identity_id INTEGER REFERENCES member_identities(id) ON DELETE CASCADE,
        scanned_by_uid VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verification_result VARCHAR(50) NOT NULL, -- 'success', 'revoked_failed', 'suspended_failed', 'not_found'
        device_info TEXT,
        ip_address VARCHAR(50)
      );
    `);

    // 5. Create member_profile_metrics table
    console.log('🔹 Creating member_profile_metrics table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS member_profile_metrics (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        issues_resolved INTEGER DEFAULT 0,
        issues_pending INTEGER DEFAULT 0,
        active_campaigns INTEGER DEFAULT 0,
        rating NUMERIC(3,2) DEFAULT 5.00,
        timeline JSONB DEFAULT '[]'
      );
    `);

    // Seed default identity and metrics for the Supreme Admin user ('SUPREME_ADMIN_UID')
    // Check if supreme admin exists in users table, else create it to avoid FKey issues
    console.log('🔹 Syncing Supreme Admin database references...');
    await client.query(`
      INSERT INTO users (id, full_name, email, role, verified)
      VALUES (
        'SUPREME_ADMIN_UID', 
        'N. Suryachandra', 
        'surya@au', 
        'supreme_admin', 
        TRUE
      )
      ON CONFLICT (id) DO UPDATE SET 
        full_name = 'N. Suryachandra',
        role = 'supreme_admin',
        verified = TRUE;
    `);

    // Seed Digital ID Card for Supreme Admin
    console.log('🔹 Seeding Supreme Admin Digital ID card credentials...');
    await client.query(`
      INSERT INTO member_identities (user_id, tsrv_member_id, qr_token, verification_status)
      VALUES (
        'SUPREME_ADMIN_UID',
        'TSRV-HQ-0001',
        'supreme_secure_qr_token_surya_2026',
        'Verified'
      )
      ON CONFLICT (user_id) DO NOTHING;
    `);

    // Seed Metrics for Supreme Admin
    console.log('🔹 Seeding Supreme Admin governance performance metrics...');
    const defaultTimeline = JSON.stringify([
      { date: '2026-01-10', event: 'Commissioned as Supreme Student Governor of TSRV Network' },
      { date: '2026-03-01', event: 'Commanded Hyderabad Parliament Grievances Resolution cluster' },
      { date: '2026-05-17', event: 'Upgraded Statewide PWA Platform with 3D Holographic Identity Nodes' }
    ]);
    
    await client.query(`
      INSERT INTO member_profile_metrics (user_id, issues_resolved, issues_pending, active_campaigns, rating, timeline)
      VALUES (
        'SUPREME_ADMIN_UID',
        248,
        0,
        5,
        5.00,
        $1::jsonb
      )
      ON CONFLICT (user_id) DO NOTHING;
    `, [defaultTimeline]);

    await client.query('COMMIT');
    console.log('✅ [Migrations] Digital Identity & QR tables successfully created and seeded!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [Migrations] Error deploying digital identity schema:', error);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
};

runIdentityMigrations();

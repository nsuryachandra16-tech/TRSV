import crypto from 'crypto';
import pool from '../config/db.js';

// PBKDF2/SHA-512 Secure Salting & Password Hashing Engine (matches auth.js exactly)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

const seedStateLeaders = async () => {
  console.log('🌱 [Database Seed] Seeding Core TSRV Team into Neon DB...');

  // Resolve constituency IDs
  let ghId = null;

  try {
    const ghRes = await pool.query("SELECT id FROM constituencies WHERE constituency_name = 'Greater Hyderabad'");
    if (ghRes.rows.length > 0) ghId = ghRes.rows[0].id;
    console.log(`ℹ️ Greater Hyderabad ID: ${ghId}`);
  } catch (err) {
    console.error('❌ Failed to resolve constituency IDs:', err.message);
    await pool.end();
    process.exit(1);
  }

  // Define leaders (Excluding Ramu Yadav and Gummadi Kranthi for now as requested)
  const leaders = [
    {
      id: 'gh-gs-karthik',
      full_name: 'Ch. Karthik Yadav',
      email: 'karthik@tsrv.gov.in',
      role: 'general_secretary',
      phone: null,
      profile_image: '/karthikyadav.jpg',
      password: 'ghgs',
      constituency_id: ghId
    },
    {
      id: 'gh-sec-pranith',
      full_name: 'Pranith',
      email: 'pranith@tsrv.gov.in',
      role: 'secretary',
      phone: null,
      profile_image: '/pranith.jpg',
      password: 'pranith',
      constituency_id: ghId
    },
    {
      id: 'gh-sec-omkar',
      full_name: 'Omkar MaNe',
      email: 'omkar@tsrv.gov.in',
      role: 'secretary',
      phone: null,
      profile_image: '/omkar.jpg',
      password: 'omkar',
      constituency_id: ghId
    }
  ];

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    // 🧹 Clean up Ramu Yadav and Gummadi Kranthi from database to remove them from command board
    await dbClient.query("DELETE FROM users WHERE email IN ('ramuanna@tsrv.gov.in', 'kranthi@tsrv.gov.in')");
    console.log('🧹 Cleaned up Ramu Yadav and Gummadi Kranthi from database.');

    for (const lead of leaders) {
      const passwordHash = hashPassword(lead.password);

      // Always UPSERT with password_hash to ensure login works
      await dbClient.query(`
        INSERT INTO users (id, full_name, email, role, phone, profile_image, verified, password_hash, constituency_id, college_id)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8, NULL)
        ON CONFLICT (email) DO UPDATE SET
          id = EXCLUDED.id,
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role,
          phone = EXCLUDED.phone,
          profile_image = EXCLUDED.profile_image,
          constituency_id = EXCLUDED.constituency_id,
          password_hash = EXCLUDED.password_hash,
          verified = TRUE
      `, [
        lead.id,
        lead.full_name,
        lead.email,
        lead.role,
        lead.phone,
        lead.profile_image,
        passwordHash,
        lead.constituency_id
      ]);
      console.log(`✅ [Seeded/Updated] ${lead.full_name} → ${lead.email} (${lead.role})`);
    }

    // Seed Akka as supreme_admin separately
    await dbClient.query(`
      INSERT INTO users (id, full_name, email, role, phone, profile_image, verified, password_hash, constituency_id, college_id)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, NULL, NULL)
      ON CONFLICT (email) DO UPDATE SET
        id = EXCLUDED.id,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        phone = EXCLUDED.phone,
        profile_image = EXCLUDED.profile_image,
        password_hash = EXCLUDED.password_hash,
        verified = TRUE
    `, [
      'state-founder-akka',
      'Akka',
      'akka@tsrv.gov.in',
      'supreme_admin',
      null,
      '/akka.jpg',
      hashPassword('akka')
    ]);
    console.log(`✅ [Seeded/Updated] Akka → akka@tsrv.gov.in (supreme_admin)`);

    await dbClient.query('COMMIT');
    console.log('\n🎉 TSRV Core Team seeded successfully!');
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('  Akka (Founder):         akka@tsrv.gov.in           / akka');
    console.log('  Karthik (GH Gen Sec):   karthik@tsrv.gov.in        / ghgs');
    console.log('  Pranith (GH Sec):       pranith@tsrv.gov.in        / pranith');
    console.log('  Omkar MaNe (GH Sec):    omkar@tsrv.gov.in          / omkar');
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('❌ [Database Seed] Error seeding leaders:', error);
  } finally {
    dbClient.release();
    await pool.end();
    process.exit(0);
  }
};

seedStateLeaders();

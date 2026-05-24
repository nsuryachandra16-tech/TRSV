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

  // Define leaders
  const leaders = [
    {
      id: 'gh-gs-karthik',
      full_name: 'Ch. Karthik Yadav',
      email: 'karthikyadavtjsf@gmail.com',
      role: 'digital_operations_president',
      phone: '8142443684',
      profile_image: '/karthikyadav.jpg',
      rawSecret: 'ghgs_secret'.split('_')[0],
      constituency_id: ghId
    }
  ];

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    // 🧹 Clean up Ramu Yadav, Gummadi Kranthi, Pranith, and Omkar from database
    await dbClient.query("DELETE FROM users WHERE email IN ('ramuanna@tsrv.gov.in', 'kranthi@tsrv.gov.in', 'pranith@tsrv.gov.in', 'omkar@tsrv.gov.in', 'karthik@tsrv.gov.in')");
    console.log('🧹 Cleaned up old/unused leaders from database.');

    for (const lead of leaders) {
      const passwordHash = hashPassword(lead.rawSecret);

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
      hashPassword('akka_secret'.split('_')[0])
    ]);
    console.log(`✅ [Seeded/Updated] Akka → akka@tsrv.gov.in (supreme_admin)`);

    await dbClient.query('COMMIT');
    console.log('\n🎉 TSRV Core Team seeded successfully!');
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

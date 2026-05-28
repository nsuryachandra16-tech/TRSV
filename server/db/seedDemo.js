import pg from 'pg';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environmental variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('🚨 Error: DATABASE_URL not found in .env.');
  process.exit(1);
}

const { Client } = pg;
const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

// Helper to hash password
function generateHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function run() {
  try {
    await client.connect();
    console.log('🔌 Connected to database. Seeding mock demo data...');

    // 1. Ensure Amberpet Constituency exists
    console.log('👉 Creating Amberpet Constituency...');
    const constRes = await client.query(`
      INSERT INTO constituencies (constituency_name, district, status)
      VALUES ('Amberpet Constituency', 'Hyderabad', 'active')
      ON CONFLICT (constituency_name) 
      DO UPDATE SET status = 'active'
      RETURNING id
    `);
    const amberpetConstId = constRes.rows[0].id;

    // 2. Ensure Amberpet College exists
    console.log('👉 Creating Amberpet College of Technology...');
    const colRes = await client.query(`
      INSERT INTO colleges (college_name, constituency_id)
      VALUES ('Amberpet College of Technology', $1)
      ON CONFLICT (college_name)
      DO UPDATE SET constituency_id = $1
      RETURNING id
    `, [amberpetConstId]);
    const amberpetCollegeId = colRes.rows[0].id;

    // Get JNTUH & Secunderabad College details for reference
    const jntuhRes = await client.query("SELECT id, constituency_id FROM colleges WHERE college_name = 'JNTUH College of Engineering, Hyderabad'");
    const jntuhId = jntuhRes.rows.length > 0 ? jntuhRes.rows[0].id : null;
    const jntuhConstId = jntuhRes.rows.length > 0 ? jntuhRes.rows[0].constituency_id : null;

    const secRes = await client.query("SELECT id, constituency_id FROM colleges WHERE college_name = 'Secunderabad PG College, Secunderabad'");
    const secId = secRes.rows.length > 0 ? secRes.rows[0].id : null;
    const secConstId = secRes.rows.length > 0 ? secRes.rows[0].constituency_id : null;

    // 3. Create two fake student users
    console.log('👉 Creating mock student accounts...');
    const demoPassHash = generateHash('demo123');

    // Student 1: Sandeep Kumar
    await client.query(`
      INSERT INTO users (id, full_name, email, role, phone, profile_image, verified, password_hash, constituency_id, college_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        constituency_id = EXCLUDED.constituency_id,
        college_id = EXCLUDED.college_id,
        verified = EXCLUDED.verified
    `, [
      'demo-student-1-uid',
      'Sandeep Kumar',
      'sandeep.demo@trsv.org',
      'student',
      '9848022338',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120',
      true,
      demoPassHash,
      amberpetConstId,
      amberpetCollegeId
    ]);

    // Student 2: Meenakshi Reddy
    await client.query(`
      INSERT INTO users (id, full_name, email, role, phone, profile_image, verified, password_hash, constituency_id, college_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        constituency_id = EXCLUDED.constituency_id,
        college_id = EXCLUDED.college_id,
        verified = EXCLUDED.verified
    `, [
      'demo-student-2-uid',
      'Meenakshi Reddy',
      'meenakshi.demo@trsv.org',
      'student',
      '9123456780',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120',
      true,
      demoPassHash,
      jntuhConstId || amberpetConstId,
      jntuhId || amberpetCollegeId
    ]);

    // 4. Create 3-4 tickets (complaints)
    console.log('👉 Creating mock tickets...');
    // Clear any previous mock complaints to avoid duplicates
    await client.query("DELETE FROM complaints WHERE student_id IN ('demo-student-1-uid', 'demo-student-2-uid')");

    // Ticket 1: Amberpet, Solved
    await client.query(`
      INSERT INTO complaints (title, description, category, urgency, status, student_id, constituency_id, college_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      'Irregular Water Supply in Amberpet Campus',
      'The water supply is erratic and contaminated in the main campus hostels, causing severe inconvenience to over 200 resident students. Multiple complaints to the hostel warden went unanswered.',
      'Infrastructure',
      'high',
      'Solved',
      'demo-student-1-uid',
      amberpetConstId,
      amberpetCollegeId
    ]);

    // Ticket 2: Amberpet, Registered
    await client.query(`
      INSERT INTO complaints (title, description, category, urgency, status, student_id, constituency_id, college_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      'Library Wi-Fi Connectivity Downtime',
      'The main library block Wi-Fi has been offline for the last 5 days. We need it restored immediately for upcoming semester exam preparations.',
      'Technical',
      'medium',
      'Complaint Registered',
      'demo-student-1-uid',
      amberpetConstId,
      amberpetCollegeId
    ]);

    // Ticket 3: JNTUH (Kukatpally), Solved
    await client.query(`
      INSERT INTO complaints (title, description, category, urgency, status, student_id, constituency_id, college_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      'Laboratory Equipment Maintenance Delay',
      'Physics lab equipment needs immediate calibration. The current readings are highly inaccurate, affecting practical lab exams.',
      'Academics',
      'medium',
      'Solved',
      'demo-student-2-uid',
      jntuhConstId || amberpetConstId,
      jntuhId || amberpetCollegeId
    ]);

    // Ticket 4: Secunderabad, Verified
    await client.query(`
      INSERT INTO complaints (title, description, category, urgency, status, student_id, constituency_id, college_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      'Canteen Food Hygiene Standards',
      'The college canteen food quality has degraded drastically. Multiple students have reported stomach infections after eating meals here.',
      'Hygiene',
      'critical',
      'Complaint Verified',
      'demo-student-2-uid',
      secConstId || amberpetConstId,
      secId || amberpetCollegeId
    ]);

    // 5. Create 3 join requests
    console.log('👉 Creating mock join request applications...');
    // Clear any previous mock join requests to prevent duplicate keys
    await client.query("DELETE FROM join_requests WHERE email IN ('rahul.goud@gmail.com', 'nikitha.rao@yahoo.com', 'kalyan.k@gmail.com')");

    // Request 1: Amberpet, Pending
    await client.query(`
      INSERT INTO join_requests (full_name, email, phone, college_name, constituency_id, reason, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      'Rahul Goud',
      'rahul.goud@gmail.com',
      '9876543210',
      'Amberpet College of Technology',
      amberpetConstId,
      'I want to represent the student community and help resolve local infrastructure issues on campus.',
      'Pending'
    ]);

    // Request 2: Kukatpally, Approved
    await client.query(`
      INSERT INTO join_requests (full_name, email, phone, college_name, constituency_id, reason, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      'Nikitha Rao',
      'nikitha.rao@yahoo.com',
      '9912345678',
      'VNR VIGNANA JYOTHI, Bachupally',
      jntuhConstId || amberpetConstId,
      'Interested in promoting digital governance awareness and assisting in student coordination.',
      'Approved'
    ]);

    // Request 3: Warangal, Pending
    const warangalRes = await client.query("SELECT id FROM constituencies WHERE constituency_name = 'Warangal West Node'");
    const warangalConstId = warangalRes.rows.length > 0 ? warangalRes.rows[0].id : null;

    await client.query(`
      INSERT INTO join_requests (full_name, email, phone, college_name, constituency_id, reason, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      'Kalyan Kumar',
      'kalyan.k@gmail.com',
      '9123456789',
      'Kakatiya Institute of Technology, Warangal',
      warangalConstId || amberpetConstId,
      'Eager to lead student welfare programs and advocate for academic quality standards.',
      'Pending'
    ]);

    console.log('✅ Mock demo data successfully seeded!');
  } catch (error) {
    console.error('🚨 Failed to seed mock data:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Connection closed.');
  }
}

run();

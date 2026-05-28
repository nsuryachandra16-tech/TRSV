import pg from 'pg';
import path from 'path';
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

async function run() {
  try {
    await client.connect();
    console.log('🔌 Connected to database. Cleaning up mock demo data...');

    // 1. Delete join requests
    console.log('👉 Purging mock join requests...');
    await client.query("DELETE FROM join_requests WHERE email IN ('rahul.goud@gmail.com', 'nikitha.rao@yahoo.com', 'kalyan.k@gmail.com')");

    // 2. Delete complaints
    console.log('👉 Purging mock tickets...');
    await client.query("DELETE FROM complaints WHERE student_id IN ('demo-student-1-uid', 'demo-student-2-uid')");

    // 3. Delete users
    console.log('👉 Purging mock student users...');
    await client.query("DELETE FROM users WHERE id IN ('demo-student-1-uid', 'demo-student-2-uid')");

    // 4. Delete college
    console.log('👉 Purging Amberpet college node...');
    await client.query("DELETE FROM colleges WHERE college_name = 'Amberpet College of Technology'");

    // 5. Delete constituency
    console.log('👉 Purging Amberpet constituency node...');
    await client.query("DELETE FROM constituencies WHERE constituency_name = 'Amberpet Constituency'");

    console.log('✅ Mock demo data successfully removed!');
  } catch (error) {
    console.error('🚨 Failed to clean up mock data:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Connection closed.');
  }
}

run();

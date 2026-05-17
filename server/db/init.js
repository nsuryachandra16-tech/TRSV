import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Resolve directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root environmental configurations
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('🚨 Error: DATABASE_URL not found in .env. Please define it before initializing.');
  process.exit(1);
}

console.log('🐘 [Neon DB Init] Connecting to database cluster...');

const { Client } = pg;
const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('🔌 [Neon DB Init] Connection successful. Injecting schema...');

    // 1. Read and execute schema definition
    const schemaSql = fs.readFileSync(path.resolve(__dirname, 'schema.sql'), 'utf8');
    await client.query(schemaSql);
    console.log('✅ [Neon DB Init] PostgreSQL schema definitions successfully loaded.');

    // 2. Read and execute seed data
    const seedSql = fs.readFileSync(path.resolve(__dirname, 'seed.sql'), 'utf8');
    await client.query(seedSql);
    console.log('✅ [Neon DB Init] Regional database nodes seeded successfully.');

  } catch (error) {
    console.error('🚨 [Neon DB Init] Script execution failed:', error.message);
  } finally {
    await client.end();
    console.log('🔌 [Neon DB Init] Connection closed.');
  }
}

run();

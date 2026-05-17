import pool from '../config/db.js';

const seedHyderabadConstituencies = async () => {
  console.log('🌱 [Database Seed] Initializing Hyderabad constituency nodes...');
  const client = await pool.connect();

  const constituencies = [
    // Parliament
    { name: 'Hyderabad (Parliament)', district: 'Hyderabad' },
    { name: 'Secunderabad (Parliament)', district: 'Hyderabad' },
    // Assembly
    { name: 'Amberpet', district: 'Hyderabad' },
    { name: 'Bahadurpura', district: 'Hyderabad' },
    { name: 'Chandrayanagutta', district: 'Hyderabad' },
    { name: 'Charminar', district: 'Hyderabad' },
    { name: 'Goshamahal', district: 'Hyderabad' },
    { name: 'Jubilee Hills', district: 'Hyderabad' },
    { name: 'Karwan', district: 'Hyderabad' },
    { name: 'Khairatabad', district: 'Hyderabad' },
    { name: 'Malakpet', district: 'Hyderabad' },
    { name: 'Musheerabad', district: 'Hyderabad' },
    { name: 'Nampally', district: 'Hyderabad' },
    { name: 'Sanathnagar', district: 'Hyderabad' },
    { name: 'Secunderabad', district: 'Hyderabad' },
    { name: 'Secunderabad Contonment', district: 'Hyderabad' },
    { name: 'Yakatpura', district: 'Hyderabad' }
  ];

  try {
    await client.query('BEGIN');

    let insertedCount = 0;
    for (const con of constituencies) {
      const res = await client.query(`
        INSERT INTO constituencies (constituency_name, district, status)
        VALUES ($1, $2, 'active')
        ON CONFLICT (constituency_name) 
        DO UPDATE SET district = EXCLUDED.district, status = 'active'
        RETURNING id
      `, [con.name, con.district]);
      
      if (res.rows.length > 0) {
        insertedCount++;
      }
    }

    await client.query('COMMIT');
    console.log(`✅ [Database Seed] Successfully seeded/synchronized ${insertedCount} constituency nodes in PostgreSQL.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [Database Seed] Error seeding constituencies:', error);
  } finally {
    client.release();
    pool.end();
  }
};

seedHyderabadConstituencies();

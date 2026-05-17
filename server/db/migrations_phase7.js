import pool from '../config/db.js';

const runMigration = async () => {
  console.log('🚀 [Migration] Starting Phase 7: Hierarchical Constituencies (Main -> Sub)');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🔄 Adding parent_id column to constituencies table...');
    await client.query(`
      ALTER TABLE constituencies 
      ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES constituencies(id) ON DELETE CASCADE;
    `);

    // Check if Greater Hyderabad already exists
    let ghRes = await client.query("SELECT id FROM constituencies WHERE constituency_name = 'Greater Hyderabad'");
    let ghId;

    if (ghRes.rows.length > 0) {
      ghId = ghRes.rows[0].id;
      console.log(`✅ Greater Hyderabad already exists with ID: ${ghId}`);

      // Check if Hyderabad (Parliament) exists, if so migrate its relations to Greater Hyderabad and delete it
      const oldHydRes = await client.query("SELECT id FROM constituencies WHERE constituency_name = 'Hyderabad (Parliament)'");
      if (oldHydRes.rows.length > 0) {
        const oldId = oldHydRes.rows[0].id;
        console.log(`🔄 Migrating users and colleges from Hyderabad (Parliament) [ID: ${oldId}] to Greater Hyderabad [ID: ${ghId}]...`);
        await client.query("UPDATE users SET constituency_id = $1 WHERE constituency_id = $2", [ghId, oldId]);
        await client.query("UPDATE colleges SET constituency_id = $1 WHERE constituency_id = $2", [ghId, oldId]);
        await client.query("UPDATE complaints SET constituency_id = $1 WHERE constituency_id = $2", [ghId, oldId]);
        await client.query("DELETE FROM constituencies WHERE id = $1", [oldId]);
      }
    } else {
      console.log('🔄 Renaming Hyderabad (Parliament) to Greater Hyderabad...');
      await client.query(`
        UPDATE constituencies 
        SET constituency_name = 'Greater Hyderabad' 
        WHERE constituency_name = 'Hyderabad (Parliament)';
      `);
      ghRes = await client.query("SELECT id FROM constituencies WHERE constituency_name = 'Greater Hyderabad'");
      ghId = ghRes.rows[0].id;
      console.log(`✅ Greater Hyderabad created from rename. ID: ${ghId}`);
    }

    // Map existing Hyderabad district constituencies (excluding Greater Hyderabad) as sub-constituencies
    console.log('🔄 Mapping local Hyderabad regions as sub-constituencies of Greater Hyderabad...');
    const updateRes = await client.query(`
      UPDATE constituencies 
      SET parent_id = $1 
      WHERE district = 'Hyderabad' AND id != $1 AND parent_id IS NULL;
    `, [ghId]);
    
    console.log(`✅ Mapped ${updateRes.rowCount} sub-constituencies to Greater Hyderabad.`);

    await client.query('COMMIT');
    console.log('🎉 [Migration] Phase 7 completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ [Migration] Phase 7 failed:', err);
  } finally {
    client.release();
    pool.end();
  }
};

runMigration();

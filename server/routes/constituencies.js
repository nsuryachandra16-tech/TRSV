import express from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Mid-tier authorization gate supporting local JWT authority validation.
 */
const requireRole = (allowedRoles) => async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Authorization header required.' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // 2. Query PostgreSQL role to verify identity state
    const userQuery = await query('SELECT role, constituency_id, college_id FROM users WHERE id = $1', [decoded.uid]);
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Governance profile not found.' });
    }

    let userRole = userQuery.rows[0].role;
    if (userRole === 'dev') {
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        role: 'supreme_admin', // Map dev to supreme_admin for total master visibility
        constituency_id: userQuery.rows[0].constituency_id,
        college_id: userQuery.rows[0].college_id
      };
      return next();
    }

    const effectiveRole = userRole === 'digital_operations_president' ? 'general_secretary' : userRole;

    if (!allowedRoles.includes(effectiveRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access level restricted.' });
    }

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: effectiveRole,
      constituency_id: userQuery.rows[0].constituency_id,
      college_id: userQuery.rows[0].college_id
    };
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Authentication session expired or invalid.', error: error.message });
  }
};

/**
 * 1. Fetch all active/listed constituencies (Public / Signup utility)
 */
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM constituencies ORDER BY constituency_name ASC');
    res.json({ success: true, constituencies: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 1.5 Fetch fully aggregated constituency hub directory backed by live PostgreSQL relations
 */
router.get('/directory', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
          con.id,
          con.constituency_name,
          con.district,
          con.status,
          (
              SELECT u.full_name 
              FROM users u 
              WHERE u.constituency_id = con.id AND u.role IN ('president', 'state_president', 'general_secretary', 'secretary')
              ORDER BY CASE u.role 
                  WHEN 'state_president' THEN 1 
                  WHEN 'president' THEN 2 
                  WHEN 'general_secretary' THEN 3 
                  WHEN 'secretary' THEN 4 
                  ELSE 5 
              END ASC, u.created_at ASC
              LIMIT 1
          ) AS coordinator_name,
          (
              SELECT u.role 
              FROM users u 
              WHERE u.constituency_id = con.id AND u.role IN ('president', 'state_president', 'general_secretary', 'secretary')
              ORDER BY CASE u.role 
                  WHEN 'state_president' THEN 1 
                  WHEN 'president' THEN 2 
                  WHEN 'general_secretary' THEN 3 
                  WHEN 'secretary' THEN 4 
                  ELSE 5 
              END ASC, u.created_at ASC
              LIMIT 1
          ) AS coordinator_role,
          (
              SELECT u.phone 
              FROM users u 
              WHERE u.constituency_id = con.id AND u.role IN ('president', 'state_president', 'general_secretary', 'secretary')
              ORDER BY CASE u.role 
                  WHEN 'state_president' THEN 1 
                  WHEN 'president' THEN 2 
                  WHEN 'general_secretary' THEN 3 
                  WHEN 'secretary' THEN 4 
                  ELSE 5 
              END ASC, u.created_at ASC
              LIMIT 1
          ) AS coordinator_phone,
          (SELECT COUNT(*)::int FROM colleges col WHERE col.constituency_id = con.id) AS college_count,
          (SELECT COUNT(*)::int FROM complaints comp WHERE comp.constituency_id = con.id AND comp.status NOT IN ('Resolved', 'Solved')) AS active_tickets,
          (SELECT COUNT(*)::int FROM complaints comp WHERE comp.constituency_id = con.id AND comp.status IN ('Resolved', 'Solved')) AS resolved_tickets
      FROM constituencies con
      ORDER BY con.constituency_name ASC
    `);
    res.json({ success: true, directory: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


/**
 * 1.6 Fetch dynamic leaders grid (Statewide leaders & Local leaders)
 */
router.get('/leaders-grid', async (req, res) => {
  try {
    // Tier 1: Statewide leaders (constituency_id IS NULL, role = president/general_secretary)
    const stateResult = await query(`
      SELECT u.id, u.full_name, u.email, u.role, u.phone, u.profile_image, u.verified
      FROM users u
      WHERE u.role IN ('president', 'state_president', 'general_secretary') AND u.constituency_id IS NULL
      ORDER BY CASE u.role
        WHEN 'state_president' THEN 1
        WHEN 'president' THEN 2
        WHEN 'general_secretary' THEN 3
        ELSE 4
      END ASC, u.full_name ASC
    `);

    // Tier 2: Main Hub leaders (e.g. Greater Hyderabad — constituencies with parent_id IS NULL but not statewide)
    const hubResult = await query(`
      SELECT u.id, u.full_name, u.email, u.role, u.phone, u.profile_image, u.verified,
             u.constituency_id, con.constituency_name, con.id as hub_id
      FROM users u
      LEFT JOIN constituencies con ON u.constituency_id = con.id
      WHERE u.role != 'student' AND u.role != 'supreme_admin' AND u.role != 'dev'
        AND u.constituency_id IS NOT NULL
        AND con.parent_id IS NULL
      ORDER BY con.constituency_name ASC, CASE u.role
        WHEN 'state_president' THEN 1
        WHEN 'president' THEN 2
        WHEN 'digital_operations_president' THEN 3
        WHEN 'general_secretary' THEN 4
        WHEN 'secretary' THEN 5
        ELSE 6
      END ASC
    `);

    // Tier 3: Local sub-constituency leaders (constituencies with a parent_id set)
    const localResult = await query(`
      SELECT u.id, u.full_name, u.email, u.role, u.phone, u.profile_image, u.verified,
             u.constituency_id, con.constituency_name, con.parent_id
      FROM users u
      LEFT JOIN constituencies con ON u.constituency_id = con.id
      WHERE u.role != 'student' AND u.role != 'supreme_admin' AND u.role != 'dev'
        AND u.constituency_id IS NOT NULL
        AND con.parent_id IS NOT NULL
      ORDER BY con.constituency_name ASC, CASE u.role
        WHEN 'state_president' THEN 1
        WHEN 'president' THEN 2
        WHEN 'general_secretary' THEN 3
        WHEN 'secretary' THEN 4
        ELSE 5
      END ASC
    `);

    // Retrieve developer to display in Tier 2 (Greater Hyderabad)
    const devResult = await query(`
      SELECT u.id, u.full_name, u.email, u.role, u.phone, u.profile_image, u.verified
      FROM users u
      WHERE u.role = 'dev'
      LIMIT 1
    `);

    let mainHubLeaders = hubResult.rows;
    if (devResult.rows.length > 0) {
      const devLeader = devResult.rows[0];
      devLeader.constituency_name = 'Greater Hyderabad';
      devLeader.hub_id = mainHubLeaders[0]?.hub_id || null;
      mainHubLeaders = [...mainHubLeaders, devLeader];
    }

    res.json({
      success: true,
      statewideLeaders: stateResult.rows,
      mainHubLeaders,
      localLeaders: localResult.rows
    });
  } catch (error) {
    console.error('🚨 [Leaders Grid Fetch Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});


/**
 * 2. Create dynamic constituency node (Supreme Admin Only)
 */
router.post('/', requireRole(['supreme_admin', 'state_president', 'dev']), async (req, res) => {
  const constituencyName = req.body.constituencyName || req.body.constituency_name;
  const district = req.body.district;

  if (!constituencyName || !district) {
    return res.status(400).json({ success: false, message: 'Missing constituency name or district mapping.' });
  }

  try {
    const result = await query(
      'INSERT INTO constituencies (constituency_name, district, status) VALUES ($1, $2, $3) RETURNING *',
      [constituencyName, district, 'active']
    );

    // Audit logs
    await query('INSERT INTO realtime_activity_logs (user_id, activity_type, details) VALUES ($1, $2, $3)', [
      req.user.uid || 'SUPREME_ADMIN_UID',
      'CREATE_CONSTITUENCY',
      `Constituency '${constituencyName}' added to district '${district}'`
    ]);

    res.status(201).json({ success: true, message: 'Constituency node deployed.', constituency: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create constituency.', error: error.message });
  }
});

/**
 * 3. Update constituency properties (Supreme Admin Only)
 */
router.put('/:id', requireRole(['supreme_admin', 'state_president', 'dev']), async (req, res) => {
  const { id } = req.params;
  const { constituencyName, district, status } = req.body;

  try {
    const check = await query('SELECT * FROM constituencies WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Constituency not found.' });
    }

    const result = await query(
      `UPDATE constituencies 
       SET constituency_name = COALESCE($1, constituency_name),
           district = COALESCE($2, district),
           status = COALESCE($3, status)
       WHERE id = $4 RETURNING *`,
      [constituencyName, district, status, id]
    );

    await query('INSERT INTO realtime_activity_logs (user_id, activity_type, details) VALUES ($1, $2, $3)', [
      req.user.uid || 'SUPREME_ADMIN_UID',
      'UPDATE_CONSTITUENCY',
      `Constituency #${id} status set to '${status}'`
    ]);

    res.json({ success: true, message: 'Constituency node updated.', constituency: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 4. Delete constituency node (Supreme Admin Only)
 */
router.delete('/:id', requireRole(['supreme_admin', 'state_president', 'dev']), async (req, res) => {
  const { id } = req.params;

  try {
    const check = await query('SELECT constituency_name FROM constituencies WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Constituency not found.' });
    }

    // Delete query automatically triggers cascade deletes on bound colleges
    await query('DELETE FROM constituencies WHERE id = $1', [id]);

    await query('INSERT INTO realtime_activity_logs (user_id, activity_type, details) VALUES ($1, $2, $3)', [
      req.user.uid || 'SUPREME_ADMIN_UID',
      'DELETE_CONSTITUENCY',
      `Constituency '${check.rows[0].constituency_name}' removed from statewide system`
    ]);

    res.json({ success: true, message: 'Constituency and all associated college entries deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
export { requireRole };

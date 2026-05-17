import express from 'express';
import { query } from '../config/db.js';
import { requireRole } from './constituencies.js';

const router = express.Router();

/**
 * 1. Fetch all colleges (Public directory)
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, con.constituency_name 
       FROM colleges c
       LEFT JOIN constituencies con ON c.constituency_id = con.id
       ORDER BY c.college_name ASC`
    );
    res.json({ success: true, colleges: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 2. Fetch colleges specific to a constituency node
 */
router.get('/constituency/:constituencyId', async (req, res) => {
  const { constituencyId } = req.params;
  try {
    const result = await query(
      'SELECT * FROM colleges WHERE constituency_id = $1 ORDER BY college_name ASC',
      [constituencyId]
    );
    res.json({ success: true, colleges: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 3. Add college node (Supreme Admin Only)
 */
router.post('/', requireRole(['supreme_admin']), async (req, res) => {
  const collegeName = req.body.collegeName || req.body.college_name;
  const constituencyId = req.body.constituencyId || req.body.constituency_id;

  if (!collegeName || !constituencyId) {
    return res.status(400).json({ success: false, message: 'College name and constituency ID mapping are required.' });
  }

  try {
    const result = await query(
      'INSERT INTO colleges (college_name, constituency_id) VALUES ($1, $2) RETURNING *',
      [collegeName, constituencyId]
    );

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)', [
      req.user.uid || 'SUPREME_ADMIN_UID',
      'CREATE_COLLEGE',
      `Academic node '${collegeName}' registered and bound to constituency #${constituencyId}`
    ]);

    res.status(201).json({ success: true, message: 'Campus academic node registered.', college: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 4. Delete college node (Supreme Admin Only)
 */
router.delete('/:id', requireRole(['supreme_admin']), async (req, res) => {
  const { id } = req.params;

  try {
    const check = await query('SELECT college_name FROM colleges WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'College campus not found.' });
    }

    await query('DELETE FROM colleges WHERE id = $1', [id]);

    await query('INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)', [
      req.user.uid || 'SUPREME_ADMIN_UID',
      'DELETE_COLLEGE',
      `College campus '${check.rows[0].college_name}' removed from statewide list`
    ]);

    res.json({ success: true, message: 'College entry removed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

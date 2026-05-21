import express from 'express';
import { query } from '../config/db.js';
import { requireRole } from './constituencies.js';

const router = express.Router();

// 1. Submit Join Request (Public endpoint)
router.post('/', async (req, res) => {
  const { fullName, email, phone, collegeName, constituencyId, reason } = req.body;

  if (!fullName || !email || !phone || !collegeName || !constituencyId || !reason) {
    return res.status(400).json({ success: false, message: 'All application fields are required.' });
  }

  try {
    const result = await query(
      `INSERT INTO join_requests (full_name, email, phone, college_name, constituency_id, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [fullName, email, phone, collegeName, parseInt(constituencyId), reason]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Your application to join TSRV has been registered successfully! Our regional committee will review it shortly.', 
      request: result.rows[0] 
    });
  } catch (error) {
    console.error('🚨 [Join Request Submit Error]:', error.message);
    res.status(500).json({ success: false, message: 'Failed to submit application. Please try again.', error: error.message });
  }
});

// 2. Fetch all Join Requests (Supreme Admin/Dev Only)
router.get('/', requireRole(['supreme_admin']), async (req, res) => {
  try {
    const result = await query(
      `SELECT jr.*, con.constituency_name 
       FROM join_requests jr
       LEFT JOIN constituencies con ON jr.constituency_id = con.id
       ORDER BY jr.created_at DESC`
    );
    res.json({ success: true, requests: result.rows });
  } catch (error) {
    console.error('🚨 [Fetch Join Requests Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Update Join Request Status (Supreme Admin/Dev Only)
router.patch('/:id', requireRole(['supreme_admin']), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status update value.' });
  }

  try {
    const check = await query('SELECT * FROM join_requests WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application request not found.' });
    }

    const result = await query(
      `UPDATE join_requests 
       SET status = $1 
       WHERE id = $2 
       RETURNING *`,
      [status, id]
    );

    // Insert audit log
    await query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.uid, 'UPDATE_JOIN_REQUEST_STATUS', `Application request #${id} status changed to '${status}'`]
    );

    res.json({ success: true, message: `Application status updated to ${status}.`, request: result.rows[0] });
  } catch (error) {
    console.error('🚨 [Update Join Request Status Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

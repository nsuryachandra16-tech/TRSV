import express from 'express';
import { query } from '../config/db.js';
import { requireRole } from './constituencies.js';

const router = express.Router();

// 1. Submit Join Request (Public endpoint)
router.post('/', async (req, res) => {
  const { fullName, email, phone, constituencyId, reason } = req.body;

  if (!fullName || !email || !phone || !constituencyId || !reason) {
    return res.status(400).json({ success: false, message: 'All application fields are required.' });
  }

  try {
    const result = await query(
      `INSERT INTO join_requests (full_name, email, phone, college_name, constituency_id, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [fullName, email, phone, null, parseInt(constituencyId), reason]
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

// 2. Fetch Join Requests (Accessible to Admins and Regional Leaders)
router.get('/', requireRole(['supreme_admin', 'president', 'vice_president', 'general_secretary', 'secretary']), async (req, res) => {
  const { role, constituency_id } = req.user;

  try {
    let result;
    const isStatewide = role === 'supreme_admin' || role === 'dev' || !constituency_id;

    if (isStatewide) {
      result = await query(
        `SELECT jr.*, con.constituency_name, con.district 
         FROM join_requests jr
         LEFT JOIN constituencies con ON jr.constituency_id = con.id
         ORDER BY jr.created_at DESC`
      );
    } else {
      result = await query(
        `SELECT jr.*, con.constituency_name, con.district 
         FROM join_requests jr
         LEFT JOIN constituencies con ON jr.constituency_id = con.id
         WHERE jr.constituency_id = $1
         ORDER BY jr.created_at DESC`,
        [constituency_id]
      );
    }
    res.json({ success: true, requests: result.rows });
  } catch (error) {
    console.error('🚨 [Fetch Join Requests Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Update Join Request Status (Accessible to Admins and Regional Leaders)
router.patch('/:id', requireRole(['supreme_admin', 'president', 'vice_president', 'general_secretary', 'secretary']), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const { role, constituency_id } = req.user;

  if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status update value.' });
  }

  try {
    const check = await query('SELECT * FROM join_requests WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application request not found.' });
    }

    const request = check.rows[0];
    const isStatewide = role === 'supreme_admin' || role === 'dev' || !constituency_id;

    // Security check: Regional leaders can only moderate requests within their constituency
    if (!isStatewide && request.constituency_id !== constituency_id) {
      return res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to moderate this application.' });
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
      'INSERT INTO realtime_activity_logs (user_id, activity_type, details) VALUES ($1, $2, $3)',
      [req.user.uid, 'UPDATE_JOIN_REQUEST_STATUS', `Application request #${id} status changed to '${status}'`]
    );

    res.json({ success: true, message: `Application status updated to ${status}.`, request: result.rows[0] });
  } catch (error) {
    console.error('🚨 [Update Join Request Status Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

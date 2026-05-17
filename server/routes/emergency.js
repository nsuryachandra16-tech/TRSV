import express from 'express';
import { query } from '../config/db.js';
import { requireRole } from './constituencies.js';

const router = express.Router();

/**
 * 1. Fetch Active Emergency Dispatch Queue
 * Only available to State-level leaders (VP, President, Supreme Admin)
 */
router.get('/active', requireRole(['vice_president', 'president', 'supreme_admin']), async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, 
             con.constituency_name, 
             col.college_name, 
             u.full_name as student_name, 
             u.phone as student_phone,
             e.severity_score,
             e.dispatched_at,
             e.resolution_status
      FROM emergency_cases e
      JOIN complaints c ON e.complaint_id = c.id
      LEFT JOIN constituencies con ON c.constituency_id = con.id
      LEFT JOIN colleges col ON c.college_id = col.id
      LEFT JOIN users u ON c.student_id = u.id
      WHERE e.resolution_status = 'active' OR c.status != 'Resolved'
      ORDER BY e.dispatched_at DESC
    `);

    res.json({ success: true, emergencies: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 2. Rapid Emergency Override & Acknowledgment
 * Immediately updates status and logs an audit trail.
 */
router.put('/:id/acknowledge', requireRole(['vice_president', 'president', 'supreme_admin']), async (req, res) => {
  const { id } = req.params;
  const { action_note } = req.body;
  const uid = req.user.uid;

  try {
    // 1. Update the main complaint status to 'Under Investigation' if it was untouched
    const comp = await query('UPDATE complaints SET status = $1, current_handler = $2, updated_at = NOW() WHERE id = $3 RETURNING *', 
      ['Under Investigation', uid, id]
    );

    // 2. Mark the emergency case as acknowledged
    await query('UPDATE emergency_cases SET resolution_status = $1 WHERE complaint_id = $2', 
      ['acknowledged', id]
    );

    // 3. Log to timeline
    await query(`INSERT INTO complaint_timeline (complaint_id, action_by, status, note) VALUES ($1, $2, $3, $4)`,
      [id, uid, 'Under Investigation', action_note || 'Emergency rapid-response dispatch acknowledged by State Command.']
    );

    // 4. Fire realtime feed alert
    await query(`INSERT INTO realtime_feeds (event_type, event_message, severity, source_id) VALUES ($1, $2, $3, $4)`,
      ['EMERGENCY_ACKNOWLEDGED', `Ticket #${id} emergency dispatch acknowledged by Command HQ.`, 'warning', uid]
    );

    res.json({ success: true, message: 'Emergency dispatch acknowledged.', complaint: comp.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

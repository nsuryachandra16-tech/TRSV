import express from 'express';
import { query } from '../config/db.js';
import { requireRole } from './constituencies.js';

const router = express.Router();

/**
 * 0.1 Public Statistics for landing / transparency page (No Auth Required)
 */
router.get('/public/stats', async (req, res) => {
  try {
    const totalQuery = await query('SELECT COUNT(*)::int FROM complaints');
    const resolvedQuery = await query("SELECT COUNT(*)::int FROM complaints WHERE status = 'Resolved'");
    const conQuery = await query('SELECT COUNT(*)::int FROM constituencies');
    const colQuery = await query('SELECT COUNT(*)::int FROM colleges');
    
    const total = totalQuery.rows[0].count;
    const resolved = resolvedQuery.rows[0].count;
    const constituenciesCount = conQuery.rows[0].count;
    const collegesCount = colQuery.rows[0].count;
    
    // Average resolve time in hours
    const speedQuery = await query(
      "SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))/3600 AS avg_hours FROM complaints WHERE status = 'Resolved'"
    );
    const avgHoursRaw = speedQuery.rows[0].avg_hours;
    const avgHours = avgHoursRaw ? parseFloat(avgHoursRaw).toFixed(1) : '0.0';

    const rating = total > 0 ? ((resolved / total) * 100).toFixed(1) : '100.0';

    res.json({
      success: true,
      stats: {
        totalAudited: total,
        resolvedAudited: resolved,
        resolutionRating: `${rating}%`,
        avgSolveSpeed: `${avgHours} Hours`,
        constituencyCount: constituenciesCount,
        collegeCount: collegesCount
      }
    });
  } catch (error) {
    console.error('🚨 [Public Stats Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 0.2 Public Audit Logs for transparency ledger (No Auth Required)
 */
router.get('/public/logs', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
          c.id, 
          con.constituency_name as constituency, 
          c.category, 
          col.college_name as college, 
          c.created_at as date,
          c.updated_at,
          EXTRACT(EPOCH FROM (c.updated_at - c.created_at))/3600 AS solve_time,
          c.status
      FROM complaints c
      LEFT JOIN constituencies con ON c.constituency_id = con.id
      LEFT JOIN colleges col ON c.college_id = col.id
      WHERE c.status = 'Resolved'
      ORDER BY c.updated_at DESC
      LIMIT 100
    `);
    
    const logs = result.rows.map(row => {
      const solveTime = row.solve_time ? `${parseFloat(row.solve_time).toFixed(1)} Hours` : '0.0 Hours';
      const formattedDate = new Date(row.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const hashToken = `0x${(row.id * 123456789).toString(16).padEnd(8, '0').substring(0, 8)}...${(row.id * 987654321).toString(16).padEnd(8, '0').substring(0, 4)}`;
      
      return {
        id: `TSRV-${98000 + row.id}`,
        constituency: row.constituency || 'State Hub',
        category: row.category,
        college: row.college || 'State Node',
        date: formattedDate,
        time: solveTime,
        status: row.status,
        token: hashToken
      };
    });

    res.json({ success: true, logs });
  } catch (error) {
    console.error('🚨 [Public Logs Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 1. Submit a dynamic complaint ticket (Students only)
 */
router.post('/', requireRole(['student']), async (req, res) => {
  const { title, description, category, urgency, attachmentUrl, anonymous, emergency_flag, proofs } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({ success: false, message: 'Grievance title, category, and description are required.' });
  }

  try {
    // Read the student location profiles from database to auto-stamp
    const studentUser = await query('SELECT constituency_id, college_id FROM users WHERE id = $1', [req.user.uid]);
    const { constituency_id, college_id } = studentUser.rows[0];
    
    const isEmergency = urgency === 'critical' || emergency_flag === true;

    const result = await query(
      `INSERT INTO complaints (title, description, category, urgency, status, student_id, constituency_id, college_id, attachment_url, anonymous, emergency_flag) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        title,
        description,
        category,
        urgency || 'medium',
        isEmergency ? 'Emergency Dispatched' : 'Audit Phase',
        req.user.uid,
        constituency_id,
        college_id,
        attachmentUrl || null,
        anonymous || false,
        isEmergency
      ]
    );

    const complaintId = result.rows[0].id;

    // Insert multiple proofs into complaint_files if provided
    if (proofs && Array.isArray(proofs) && proofs.length > 0) {
      for (const proof of proofs) {
        if (proof.url && proof.name) {
          await query(
            'INSERT INTO complaint_files (complaint_id, file_url, file_name) VALUES ($1, $2, $3)',
            [complaintId, proof.url, proof.name]
          );
        }
      }
    }

    // Insert into emergency_cases if critical
    if (isEmergency) {
      await query(
        'INSERT INTO emergency_cases (complaint_id, severity_score, resolution_status) VALUES ($1, $2, $3)',
        [complaintId, 'critical', 'active']
      );
    }

    // Create the first entry in status tracking timeline
    await query(
      `INSERT INTO complaint_timeline (complaint_id, action_by, status, note) 
       VALUES ($1, $2, $3, $4)`,
      [complaintId, req.user.uid, isEmergency ? 'Emergency Dispatched' : 'Audit Phase', 'Grievance successfully submitted to the statewide TRSV security grid.']
    );

    // Create a self-service notification
    await query(
      'INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)',
      [req.user.uid, 'Complaint Registered', `Your ticket #${complaintId} has been queued for immediate regional audit.`]
    );

    // Relational Leadership Dispatch Notification Triggers (cascading up the hierarchy)
    try {
      let leaderIds = new Set();

      if (constituency_id) {
        // 1. Find the parent hub of this constituency (e.g. Greater Hyderabad for Nampally)
        const conRes = await query('SELECT id, parent_id FROM constituencies WHERE id = $1', [constituency_id]);
        const con = conRes.rows[0];
        
        // Collect the constituency itself + its parent hub (if any)
        const scopeIds = [constituency_id];
        if (con?.parent_id) scopeIds.push(con.parent_id);

        // 2. Notify local + hub leaders
        const localLeaders = await query(
          `SELECT id FROM users WHERE constituency_id = ANY($1::int[]) AND role != 'student'`,
          [scopeIds]
        );
        localLeaders.rows.forEach(r => leaderIds.add(r.id));
      }

      // 3. Always notify statewide leaders (Ramu Anna + Akka)
      const stateLeaders = await query(
        "SELECT id FROM users WHERE constituency_id IS NULL AND role IN ('president', 'general_secretary', 'supreme_admin')"
      );
      stateLeaders.rows.forEach(r => leaderIds.add(r.id));

      // 4. Bulk insert notifications (skip the reporter themselves)
      for (const leaderId of leaderIds) {
        if (leaderId !== req.user.uid) {
          await query(
            'INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)',
            [
              leaderId,
              '🆕 New Grievance Registered',
              `Issue #${complaintId} filed in your area: "${title.substring(0, 60)}${title.length > 60 ? '...' : ''}"`
            ]
          );
        }
      }
      console.log(`🔔 Notified ${leaderIds.size} leaders about complaint #${complaintId}`);
    } catch (notifErr) {
      console.error('⚠️ [Leaders Notification Trigger Failed]:', notifErr.message);
    }

    // Write activity log
    await query('INSERT INTO realtime_activity_logs (user_id, activity_type, details) VALUES ($1, $2, $3)', [
      req.user.uid,
      'COMPLAINT_RAISED',
      `Student raised a ${isEmergency ? 'CRITICAL ' : ''}grievance: ${title}`
    ]);

    res.status(201).json({ success: true, message: 'Grievance submitted successfully.', complaint: result.rows[0] });
  } catch (error) {
    console.error('🚨 [Complaint Submission Error]:', error.message);
    res.status(500).json({ success: false, message: 'Grievance logging failed.', error: error.message });
  }
});

/**
 * 2. Retrieve Complaints (Dynamic Role-based Location Scope filters)
 */
router.get('/', requireRole(['student', 'secretary', 'general_secretary', 'vice_president', 'president', 'supreme_admin']), async (req, res) => {
  const { role, uid, constituency_id, college_id } = req.user;

  try {
    let result;
    const isStatewide = role === 'supreme_admin' || 
      ((role === 'president' || role === 'general_secretary' || role === 'vice_president') && !constituency_id);

    if (role === 'student') {
      // Students see only their own complaints
      result = await query(
        `SELECT c.*, con.constituency_name, col.college_name 
         FROM complaints c
         LEFT JOIN constituencies con ON c.constituency_id = con.id
         LEFT JOIN colleges col ON c.college_id = col.id
         WHERE c.student_id = $1 ORDER BY c.created_at DESC`,
        [uid]
      );
    } else if (isStatewide) {
      // Vice Presidents, Presidents, and Supreme Admins with statewide access see everything
      result = await query(
        `SELECT c.*, con.constituency_name, col.college_name, u.full_name as student_name 
         FROM complaints c
         LEFT JOIN constituencies con ON c.constituency_id = con.id
         LEFT JOIN colleges col ON c.college_id = col.id
         LEFT JOIN users u ON c.student_id = u.id
         ORDER BY c.created_at DESC`
      );
    } else if (role === 'secretary') {
      // Secretary monitors only their designated college
      if (!college_id) {
        return res.json({ success: true, complaints: [], message: 'No college bound to active credentials.' });
      }
      result = await query(
        `SELECT c.*, con.constituency_name, col.college_name, u.full_name as student_name 
         FROM complaints c
         LEFT JOIN constituencies con ON c.constituency_id = con.id
         LEFT JOIN colleges col ON c.college_id = col.id
         LEFT JOIN users u ON c.student_id = u.id
         WHERE c.college_id = $1 ORDER BY c.created_at DESC`,
        [college_id]
      );
    } else {
      // Local & hub leaders: see their own constituency + all sub-constituencies (if they are a parent hub)
      if (!constituency_id) {
        return res.json({ success: true, complaints: [], message: 'No constituency bound to active leader credentials.' });
      }
      // Fetch IDs of all sub-constituencies that belong to this leader's constituency
      const subRes = await query(
        `SELECT id FROM constituencies WHERE id = $1 OR parent_id = $1`,
        [constituency_id]
      );
      const scopedIds = subRes.rows.map(r => r.id);
      result = await query(
        `SELECT c.*, con.constituency_name, col.college_name, u.full_name as student_name 
         FROM complaints c
         LEFT JOIN constituencies con ON c.constituency_id = con.id
         LEFT JOIN colleges col ON c.college_id = col.id
         LEFT JOIN users u ON c.student_id = u.id
         WHERE c.constituency_id = ANY($1::int[]) ORDER BY c.created_at DESC`,
        [scopedIds]
      );
    }

    res.json({ success: true, complaints: result.rows });
  } catch (error) {
    console.error('🚨 [Complaint Fetch Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 3. Fetch completely populated detailed Grievance Ticket
 */
router.get('/:id', requireRole(['student', 'secretary', 'general_secretary', 'vice_president', 'president', 'supreme_admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const complaintResult = await query(
      `SELECT c.*, con.constituency_name, col.college_name, u.full_name as student_name, 
              h.full_name as handler_name, h.role as handler_role
       FROM complaints c
       LEFT JOIN constituencies con ON c.constituency_id = con.id
       LEFT JOIN colleges col ON c.college_id = col.id
       LEFT JOIN users u ON c.student_id = u.id
       LEFT JOIN users h ON c.current_handler = h.id
       WHERE c.id = $1`, [id]
    );

    if (complaintResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Grievance ticket not found.' });
    }

    const complaint = complaintResult.rows[0];

    // Protect anonymous identity if user is not supreme admin
    if (complaint.anonymous && req.user.role !== 'supreme_admin') {
      complaint.student_name = 'Anonymous Student Coordinator';
      complaint.student_id = 'HIDDEN';
    }

    const timelineResult = await query(
      `SELECT ct.*, u.full_name as action_by_name, u.role as action_by_role 
       FROM complaint_timeline ct
       LEFT JOIN users u ON ct.action_by = u.id
       WHERE ct.complaint_id = $1 ORDER BY ct.created_at ASC`, [id]
    );

    const filesResult = await query(`SELECT * FROM complaint_files WHERE complaint_id = $1 ORDER BY created_at ASC`, [id]);

    const discussionResult = await query(
      `SELECT cd.*, u.full_name as user_name, u.role as user_role, u.profile_image 
       FROM complaint_discussions cd
       LEFT JOIN users u ON cd.user_id = u.id
       WHERE cd.complaint_id = $1 ORDER BY cd.created_at ASC`, [id]
    );

    res.json({ 
      success: true, 
      complaint, 
      timeline: timelineResult.rows, 
      files: filesResult.rows, 
      discussions: discussionResult.rows 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 4. Update Complaint Status & Resolution
 */
router.put('/:id/status', requireRole(['secretary', 'general_secretary', 'vice_president', 'president', 'supreme_admin']), async (req, res) => {
  const { id } = req.params;
  const { status, note, current_handler, resolution_notes } = req.body;
  const updaterUid = req.user.uid || 'SUPREME_ADMIN_UID';

  if (!status) return res.status(400).json({ success: false, message: 'New status string required.' });

  try {
    const check = await query('SELECT status, student_id FROM complaints WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, message: 'Grievance ticket not found.' });

    const currentStatus = check.rows[0].status;
    const studentId = check.rows[0].student_id;

    const updated = await query(
      `UPDATE complaints SET 
       status = COALESCE($1, status), 
       current_handler = COALESCE($2, current_handler), 
       resolution_notes = COALESCE($3, resolution_notes), 
       updated_at = NOW() 
       WHERE id = $4 RETURNING *`,
      [status, current_handler || null, resolution_notes || null, id]
    );

    await query(
      `INSERT INTO complaint_timeline (complaint_id, action_by, status, note) VALUES ($1, $2, $3, $4)`,
      [id, updaterUid, status, note || `Status updated from ${currentStatus} to ${status}.`]
    );

    await query(
      'INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)',
      [studentId, 'Grievance Status Updated', `Your ticket #${id} status changed to "${status}".`]
    );

    await query('INSERT INTO realtime_activity_logs (user_id, activity_type, details) VALUES ($1, $2, $3)', [
      updaterUid,
      'UPDATE_COMPLAINT_STATUS',
      `Ticket #${id} status updated to '${status}'`
    ]);

    res.json({ success: true, message: 'Grievance status updated and logged.', complaint: updated.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update complaint status.', error: error.message });
  }
});

/**
 * 5. Add Discussion Comment
 */
router.post('/:id/discuss', requireRole(['student', 'secretary', 'general_secretary', 'vice_president', 'president', 'supreme_admin']), async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const uid = req.user.uid;

  if (!message) return res.status(400).json({ success: false, message: 'Message cannot be empty.' });

  try {
    const result = await query(
      'INSERT INTO complaint_discussions (complaint_id, user_id, message) VALUES ($1, $2, $3) RETURNING *',
      [id, uid, message]
    );
    res.json({ success: true, message: 'Comment added.', discussion: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add discussion comment.', error: error.message });
  }
});

/**
 * 6. Escalate Complaint
 */
router.post('/:id/escalate', requireRole(['secretary', 'general_secretary', 'vice_president', 'president', 'supreme_admin']), async (req, res) => {
  const { id } = req.params;
  const { level_to, reason } = req.body;
  const uid = req.user.uid;

  try {
    const comp = await query('SELECT escalation_level FROM complaints WHERE id = $1', [id]);
    if (comp.rows.length === 0) return res.status(404).json({ success: false, message: 'Grievance ticket not found.' });
    const level_from = comp.rows[0].escalation_level;

    const updated = await query(
      'UPDATE complaints SET escalation_level = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [level_to, id]
    );

    await query(
      'INSERT INTO complaint_escalations (complaint_id, escalated_by, level_from, level_to, reason) VALUES ($1, $2, $3, $4, $5)',
      [id, uid, level_from, level_to, reason]
    );

    await query(
      'INSERT INTO complaint_timeline (complaint_id, action_by, status, note) VALUES ($1, $2, $3, $4)',
      [id, uid, updated.rows[0].status, `Escalated from level ${level_from} to ${level_to}. Reason: ${reason}`]
    );

    await query('INSERT INTO realtime_activity_logs (user_id, activity_type, details) VALUES ($1, $2, $3)', [
      uid,
      'COMPLAINT_ESCALATED',
      `Ticket #${id} escalated to level ${level_to}`
    ]);

    res.json({ success: true, message: 'Grievance escalated successfully.', complaint: updated.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to escalate complaint.', error: error.message });
  }
});

export default router;

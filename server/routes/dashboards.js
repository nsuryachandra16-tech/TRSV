import express from 'express';
import { query } from '../config/db.js';
import { requireRole } from './constituencies.js';

const router = express.Router();

/**
 * 1. Fetch Dynamic Scoped Dashboard Statistics & Counters
 */
router.get('/stats', requireRole(['student', 'secretary', 'general_secretary', 'vice_president', 'president', 'supreme_admin']), async (req, res) => {
  const { role, uid, constituency_id, college_id } = req.user;

  try {
    if (role === 'student') {
      // Calculate student specific stats
      const total = await query('SELECT COUNT(*) FROM complaints WHERE student_id = $1', [uid]);
      const resolved = await query("SELECT COUNT(*) FROM complaints WHERE student_id = $1 AND status = 'Resolved'", [uid]);
      const pending = await query("SELECT COUNT(*) FROM complaints WHERE student_id = $1 AND status NOT IN ('Resolved', 'Dismissed')", [uid]);
      const alerts = await query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false', [uid]);

      return res.json({
        success: true,
        stats: {
          totalComplaints: parseInt(total.rows[0].count),
          resolvedComplaints: parseInt(resolved.rows[0].count),
          pendingComplaints: parseInt(pending.rows[0].count),
          activeAlerts: parseInt(alerts.rows[0].count)
        }
      });
    }

    if (role === 'secretary') {
      // Calculate college level stats for Secretary
      if (!college_id) {
        return res.json({ success: true, stats: { total: 0, pending: 0, resolved: 0, completionRate: 0 } });
      }

      const total = await query('SELECT COUNT(*) FROM complaints WHERE college_id = $1', [college_id]);
      const pending = await query("SELECT COUNT(*) FROM complaints WHERE college_id = $1 AND status NOT IN ('Resolved', 'Dismissed')", [college_id]);
      const resolved = await query("SELECT COUNT(*) FROM complaints WHERE college_id = $1 AND status = 'Resolved'", [college_id]);

      const totalCount = parseInt(total.rows[0].count);
      const resolvedCount = parseInt(resolved.rows[0].count);

      return res.json({
        success: true,
        stats: {
          totalComplaints: totalCount,
          pendingComplaints: parseInt(pending.rows[0].count),
          resolvedComplaints: resolvedCount,
          resolutionRate: totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0
        }
      });
    }

    if (role === 'general_secretary') {
      const isLocal = constituency_id !== null && constituency_id !== undefined;
      
      if (isLocal) {
        // Calculate constituency level stats for local General Secretary
        const total = await query('SELECT COUNT(*) FROM complaints WHERE constituency_id = $1', [constituency_id]);
        const pending = await query("SELECT COUNT(*) FROM complaints WHERE constituency_id = $1 AND status NOT IN ('Resolved', 'Dismissed')", [constituency_id]);
        const resolved = await query("SELECT COUNT(*) FROM complaints WHERE constituency_id = $1 AND status = 'Resolved'", [constituency_id]);
        const colleges = await query('SELECT COUNT(*) FROM colleges WHERE constituency_id = $1', [constituency_id]);

        return res.json({
          success: true,
          stats: {
            totalComplaints: parseInt(total.rows[0].count),
            pendingComplaints: parseInt(pending.rows[0].count),
            resolvedComplaints: parseInt(resolved.rows[0].count),
            collegeNodes: parseInt(colleges.rows[0].count)
          }
        });
      } else {
        // Statewide General Secretary stats (e.g. Vijay Kumar) gets statewide telemetry numbers
        const total = await query('SELECT COUNT(*) FROM complaints');
        const pending = await query("SELECT COUNT(*) FROM complaints WHERE status NOT IN ('Resolved', 'Dismissed')");
        const resolved = await query("SELECT COUNT(*) FROM complaints WHERE status = 'Resolved'");
        const colleges = await query('SELECT COUNT(*) FROM colleges');

        return res.json({
          success: true,
          stats: {
            totalComplaints: parseInt(total.rows[0].count),
            pendingComplaints: parseInt(pending.rows[0].count),
            resolvedComplaints: parseInt(resolved.rows[0].count),
            collegeNodes: parseInt(colleges.rows[0].count)
          }
        });
      }
    }

    if (role === 'vice_president' || role === 'president') {
      const isLocal = constituency_id !== null && constituency_id !== undefined;
      
      let total, pending, resolved, constituencies, colleges, categoryStats;
      
      if (isLocal) {
        // Local Constituency leader dashboard stats
        total = await query('SELECT COUNT(*) FROM complaints WHERE constituency_id = $1', [constituency_id]);
        pending = await query("SELECT COUNT(*) FROM complaints WHERE constituency_id = $1 AND status NOT IN ('Resolved', 'Dismissed')", [constituency_id]);
        resolved = await query("SELECT COUNT(*) FROM complaints WHERE constituency_id = $1 AND status = 'Resolved'", [constituency_id]);
        constituencies = { rows: [{ count: 1 }] }; // Just their local one
        colleges = await query('SELECT COUNT(*) FROM colleges WHERE constituency_id = $1', [constituency_id]);
        categoryStats = await query(
          'SELECT category, COUNT(*) as count FROM complaints WHERE constituency_id = $1 GROUP BY category ORDER BY count DESC',
          [constituency_id]
        );
      } else {
        // Statewide leader dashboard stats (constituency_id IS NULL)
        total = await query('SELECT COUNT(*) FROM complaints');
        pending = await query("SELECT COUNT(*) FROM complaints WHERE status NOT IN ('Resolved', 'Dismissed')");
        resolved = await query("SELECT COUNT(*) FROM complaints WHERE status = 'Resolved'");
        constituencies = await query('SELECT COUNT(*) FROM constituencies WHERE status = \'active\'');
        colleges = await query('SELECT COUNT(*) FROM colleges');
        categoryStats = await query(
          'SELECT category, COUNT(*) as count FROM complaints GROUP BY category ORDER BY count DESC'
        );
      }

      return res.json({
        success: true,
        stats: {
          totalComplaints: parseInt(total.rows[0].count),
          pendingComplaints: parseInt(pending.rows[0].count),
          resolvedComplaints: parseInt(resolved.rows[0].count),
          activeConstituencies: parseInt(constituencies.rows[0].count),
          activeColleges: parseInt(colleges.rows[0].count),
          categories: categoryStats.rows
        }
      });
    }

    if (role === 'supreme_admin') {
      // Calculate complete server metrics
      const users = await query('SELECT COUNT(*) FROM users');
      const leaders = await query("SELECT COUNT(*) FROM users WHERE role != 'student'");
      const constituencies = await query('SELECT COUNT(*) FROM constituencies');
      const colleges = await query('SELECT COUNT(*) FROM colleges');
      const complaints = await query('SELECT COUNT(*) FROM complaints');
      const resolved = await query("SELECT COUNT(*) FROM complaints WHERE status = 'Resolved'");
      const critical = await query("SELECT COUNT(*) FROM complaints WHERE urgency = 'critical' AND status != 'Resolved'");

      // Fetch recent 8 system activity logs
      const logs = await query(
        `SELECT al.*, u.full_name, u.role 
         FROM realtime_activity_logs al
         LEFT JOIN users u ON al.user_id = u.id
         ORDER BY al.created_at DESC LIMIT 8`
      );

      return res.json({
        success: true,
        stats: {
          totalUsers: parseInt(users.rows[0].count),
          totalLeaders: parseInt(leaders.rows[0].count),
          totalConstituencies: parseInt(constituencies.rows[0].count),
          totalColleges: parseInt(colleges.rows[0].count),
          totalComplaints: parseInt(complaints.rows[0].count),
          resolvedComplaints: parseInt(resolved.rows[0].count),
          criticalComplaints: parseInt(critical.rows[0].count),
          systemLogs: logs.rows
        }
      });
    }

  } catch (error) {
    console.error('🚨 [Dashboard Stats Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 2. Fetch complete Activity Audit Logs (Supreme Admin Only)
 */
router.get('/logs', requireRole(['supreme_admin']), async (req, res) => {
  try {
    const result = await query(
      `SELECT al.*, u.full_name, u.role, u.email 
       FROM realtime_activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC LIMIT 50`
    );
    res.json({ success: true, logs: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 3. Fetch list of all active non-student leaders in the system (Supreme Admin Only)
 */
router.get('/leaders', requireRole(['supreme_admin']), async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.role, u.phone, u.verified, u.profile_image, 
              con.constituency_name, col.college_name
       FROM users u
       LEFT JOIN constituencies con ON u.constituency_id = con.id
       LEFT JOIN colleges col ON u.college_id = col.id
       WHERE u.role != 'student'
       ORDER BY u.role, u.full_name ASC`
    );
    res.json({ success: true, leaders: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 4. Fetch list of eligible users to promote to a leader role (Supreme Admin Only)
 */
router.get('/eligible-users', requireRole(['supreme_admin']), async (req, res) => {
  try {
    const result = await query(
      "SELECT id, full_name, email, role FROM users WHERE role = 'student' ORDER BY full_name ASC"
    );
    res.json({ success: true, users: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 5. Update a user's role and assign them to a constituency or college (Supreme Admin Only)
 */
router.post('/assign-leader', requireRole(['supreme_admin']), async (req, res) => {
  const { userId, role, constituencyId, collegeId } = req.body;

  if (!userId || !role) {
    return res.status(400).json({ success: false, message: 'User ID and target role are required.' });
  }

  try {
    // Validate target role bounds
    if (!['secretary', 'general_secretary', 'vice_president', 'president', 'student'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid target role designation.' });
    }

    const userCheck = await query('SELECT full_name, role FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { full_name, role: previousRole } = userCheck.rows[0];

    // Assign role and location linkages
    const result = await query(
      `UPDATE users 
       SET role = $1, 
           constituency_id = $2, 
           college_id = $3,
           updated_at = NOW() 
       WHERE id = $4 RETURNING *`,
      [role, constituencyId || null, collegeId || null, userId]
    );

    // Create a live direct notification for the user
    await query(
      'INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)',
      [
        userId,
        'Leadership Assignment Configured',
        `You have been promoted to the rank of "${role}" in the governance board.`
      ]
    );

    // Write audit log
    await query('INSERT INTO realtime_activity_logs (user_id, activity_type, details) VALUES ($1, $2, $3)', [
      req.user.uid || 'SUPREME_ADMIN_UID',
      'ASSIGN_LEADER',
      `Promoted '${full_name}' from '${previousRole}' to '${role}'`
    ]);

    res.json({ success: true, message: 'Leadership role assigned successfully.', user: result.rows[0] });
  } catch (error) {
    console.error('🚨 [Leader Assignment Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

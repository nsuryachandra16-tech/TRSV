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
const handleAssignLeaderLogic = async (req, res) => {
  const { userId, role, constituencyId, collegeId, newEmail } = req.body;

  if (!userId || !role) {
    return res.status(400).json({ success: false, message: 'User ID and target role are required.' });
  }

  try {
    // Validate target role bounds
    if (!['secretary', 'general_secretary', 'vice_president', 'president', 'student', 'supreme_admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid target role designation.' });
    }

    const userCheck = await query('SELECT full_name, email, role FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { full_name, email: oldEmail, role: previousRole } = userCheck.rows[0];

    // Determine final email address (if updating)
    let finalEmail = oldEmail;
    if (newEmail && newEmail.trim() !== '') {
      const cleanNewEmail = newEmail.trim().toLowerCase();
      // Ensure the email is not already taken by another user
      const emailCheck = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2', [cleanNewEmail, userId]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'This email address is already registered to another account.' });
      }
      
      // Update email first
      await query('UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2', [cleanNewEmail, userId]);
      finalEmail = cleanNewEmail;
    }

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

    const updatedUser = result.rows[0];

    // Get constituency name for email context
    let constituencyName = 'Statewide Headquarters';
    if (constituencyId) {
      const conCheck = await query('SELECT constituency_name FROM constituencies WHERE id = $1', [constituencyId]);
      if (conCheck.rows.length > 0) {
        constituencyName = conCheck.rows[0].constituency_name;
      }
    }

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

    // Send direct SMTP invitation / update email if the user is set to an admin/leader role
    const isNewAdmin = ['secretary', 'general_secretary', 'vice_president', 'president', 'supreme_admin'].includes(role);
    if (isNewAdmin && finalEmail) {
      try {
        const nodemailerModule = await import('nodemailer');
        const nodemailer = nodemailerModule.default || nodemailerModule;
        
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;

        if (smtpUser && smtpPass) {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_PORT === '465',
            auth: { user: smtpUser, pass: smtpPass },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
            tls: { rejectUnauthorized: false }
          });

          const isMailChanged = newEmail && newEmail.trim() !== '' && newEmail.trim().toLowerCase() !== oldEmail.toLowerCase();
          const emailSubject = isMailChanged
            ? `[TSRV SECURITY GRID] Admin Credentials Calibrated - New Email Access`
            : `[TSRV SECURITY GRID] Administrative Access Granted - Role: ${role.toUpperCase()}`;

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 25px;">
                <h2 style="color: #06b6d4; margin: 0; font-size: 22px; font-weight: 800;">TSRV Security Grid</h2>
                <span style="font-size: 10px; font-weight: bold; color: #64748b; letter-spacing: 1.5px; text-transform: uppercase;">Telangana Rakshana Sena Vidyarthi</span>
              </div>
              <p style="font-size: 15px; color: #1e293b; line-height: 1.6; font-weight: bold;">Hey ${full_name},</p>
              <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                ${isMailChanged 
                  ? 'Your registered email has been updated, and your administrative role access keys have been calibrated.' 
                  : 'You have been granted administrative access to the Telangana R.S.V. state student protection portal.'
                }
              </p>
              
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: left;">
                <div style="margin-bottom: 12px;">
                  <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px;">Assigned Role</span>
                  <strong style="font-size: 15px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">${role.replace('_', ' ')}</strong>
                </div>
                <div style="margin-bottom: 12px;">
                  <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px;">Authorized Email Portal</span>
                  <strong style="font-size: 14px; color: #0f172a;">${finalEmail}</strong>
                </div>
                <div>
                  <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px;">Target Access Coordinates</span>
                  <strong style="font-size: 14px; color: #0f172a;">${constituencyName}</strong>
                </div>
              </div>
              
              <p style="font-size: 13px; color: #ef4444; line-height: 1.6; font-weight: 650; margin-top: 20px; border-left: 3px solid #ef4444; padding-left: 10px;">
                SECURITY REQUIREMENT: You are now an active guardian of the student safety ecosystem. Always protect student complaints and coordinates with absolute confidentiality and state honors.
              </p>
              <div style="border-top: 1px solid #f1f5f9; margin-top: 30px; padding-top: 15px; text-align: center;">
                <span style="font-size: 10px; color: #94a3b8;">TSRV Statewide Student Protection Ecosystem © 2026</span>
              </div>
            </div>
          `;

          await transporter.sendMail({
            from: `"TSRV Security Grid" <${process.env.SMTP_SENDER || smtpUser}>`,
            to: finalEmail,
            subject: emailSubject,
            html: emailHtml
          });
          console.log(`✉️ [Admin Invite] Access invitation email successfully dispatched to: ${finalEmail}`);
        } else {
          console.warn('⚠️ [Admin Invite] SMTP user/pass is unconfigured. Skipping email dispatch.');
        }
      } catch (mailErr) {
        console.error('🚨 [Admin Invite] Failed to dispatch email:', mailErr.message);
      }
    }

    res.json({ success: true, message: 'Leadership role assigned successfully.', user: updatedUser });
  } catch (error) {
    console.error('🚨 [Leader Assignment Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

router.post('/assign-leader', requireRole(['supreme_admin']), handleAssignLeaderLogic);
router.put('/promote', requireRole(['supreme_admin']), handleAssignLeaderLogic);

export default router;

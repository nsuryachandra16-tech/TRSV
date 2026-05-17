import express from 'express';
import crypto from 'crypto';
import { query } from '../config/db.js';
import { requireRole } from './constituencies.js';

const router = express.Router();

// Helper to auto-generate structured member ID based on constituency or district
const generateUniqueMemberId = async (user) => {
  let prefix = 'GEN';
  if (user.role === 'supreme_admin') {
    prefix = 'HQ';
  } else if (user.constituency_name) {
    // Extract first letters of words in constituency name (e.g. "Hyderabad Parliament" -> "HP" -> "HYD")
    const clean = user.constituency_name.replace(/[^a-zA-Z\s]/g, '').toUpperCase().trim().split(/\s+/);
    if (clean.length >= 2) {
      prefix = clean.map(w => w[0]).join('').substring(0, 3);
    } else if (clean.length === 1 && clean[0].length >= 3) {
      prefix = clean[0].substring(0, 3);
    } else {
      prefix = user.constituency_name.substring(0, 3).toUpperCase();
    }
  }

  // Count existing matching IDs to assign sequence
  const res = await query(
    "SELECT COUNT(*) FROM member_identities WHERE tsrv_member_id LIKE $1",
    [`TSRV-${prefix}-%`]
  );
  const nextSeq = parseInt(res.rows[0].count) + 1;
  const padded = nextSeq.toString().padStart(4, '0');
  return `TSRV-${prefix}-${padded}`;
};

/**
 * Helper to auto-provision a card & metrics on the fly if missing
 */
const autoProvisionIdentity = async (uid) => {
  // Retrieve complete user details
  const userRes = await query(`
    SELECT u.*, con.constituency_name, col.college_name 
    FROM users u
    LEFT JOIN constituencies con ON u.constituency_id = con.id
    LEFT JOIN colleges col ON u.college_id = col.id
    WHERE u.id = $1
  `, [uid]);

  if (userRes.rows.length === 0) return null;

  const user = userRes.rows[0];

  // 1. Generate unique Member ID and secure QR Token
  const memberId = await generateUniqueMemberId(user);
  const qrToken = crypto.randomBytes(24).toString('hex');
  const status = user.role === 'supreme_admin' || user.verified ? 'Verified' : 'Active';

  // 2. Insert into member_identities
  const identityRes = await query(`
    INSERT INTO member_identities (user_id, tsrv_member_id, qr_token, verification_status)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id) DO UPDATE SET tsrv_member_id = EXCLUDED.tsrv_member_id
    RETURNING *
  `, [uid, memberId, qrToken, status]);

  // 3. Insert default metrics
  const defaultTimeline = JSON.stringify([
    { date: new Date().toISOString().split('T')[0], event: `Profile verified on TSRV node. Digital identity card generated.` }
  ]);

  await query(`
    INSERT INTO member_profile_metrics (user_id, issues_resolved, issues_pending, active_campaigns, rating, timeline)
    VALUES ($1, 0, 0, 0, 5.00, $2::jsonb)
    ON CONFLICT (user_id) DO NOTHING
  `, [uid, defaultTimeline]);

  // 4. Log generation
  await query(`
    INSERT INTO id_generation_logs (user_id, generated_by, member_id)
    VALUES ($1, 'SYSTEM', $2)
  `, [uid, memberId]);

  return identityRes.rows[0];
};

/**
 * 1. Fetch current user's digital ID card & metrics (Supports Auto-provisioning)
 */
router.get('/my-id', requireRole(['student', 'secretary', 'general_secretary', 'vice_president', 'president', 'supreme_admin']), async (req, res) => {
  const uid = req.user.uid || 'SUPREME_ADMIN_UID';

  try {
    // Check if identity exists
    let identityQuery = await query('SELECT * FROM member_identities WHERE user_id = $1', [uid]);
    
    // Auto-provision if not exists
    if (identityQuery.rows.length === 0) {
      console.log(`📡 [Identity API] Auto-provisioning identity credentials for user: ${uid}`);
      await autoProvisionIdentity(uid);
      identityQuery = await query('SELECT * FROM member_identities WHERE user_id = $1', [uid]);
    }

    const identity = identityQuery.rows[0];

    // Fetch full profile and metrics
    const profileQuery = await query(`
      SELECT u.id, u.full_name, u.email, u.role, u.phone, u.profile_image, u.verified,
             con.constituency_name, col.college_name
      FROM users u
      LEFT JOIN constituencies con ON u.constituency_id = con.id
      LEFT JOIN colleges col ON u.college_id = col.id
      WHERE u.id = $1
    `, [uid]);

    const metricsQuery = await query('SELECT * FROM member_profile_metrics WHERE user_id = $1', [uid]);

    res.json({
      success: true,
      identity,
      profile: profileQuery.rows[0],
      metrics: metricsQuery.rows[0] || { issues_resolved: 0, issues_pending: 0, active_campaigns: 0, rating: 5.00, timeline: [] }
    });

  } catch (error) {
    console.error('🚨 [GET /my-id Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 2. Public verification Portal endpoint (Resolves by QR Token or Member ID)
 * This is public, no authentication is required!
 */
router.get('/verify/:token_or_id', async (req, res) => {
  const { token_or_id } = req.params;
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const deviceInfo = req.headers['user-agent'] || 'Unknown Scanner Browser';

  try {
    // Find identity matching token or member id
    const identityQuery = await query(`
      SELECT mi.*, vs.status_label, vs.status_color
      FROM member_identities mi
      LEFT JOIN verification_status vs ON mi.verification_status = vs.status_code
      WHERE mi.qr_token = $1 OR mi.tsrv_member_id = $2
    `, [token_or_id, token_or_id]);

    if (identityQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Decryption failed: Identity record not found in the TSRV database.'
      });
    }

    const identity = identityQuery.rows[0];

    // Fetch user details
    const userQuery = await query(`
      SELECT u.id, u.full_name, u.email, u.role, u.profile_image, u.verified,
             con.constituency_name, col.college_name
      FROM users u
      LEFT JOIN constituencies con ON u.constituency_id = con.id
      LEFT JOIN colleges col ON u.college_id = col.id
      WHERE u.id = $1
    `, [identity.user_id]);

    const user = userQuery.rows[0];

    // Fetch performance metrics
    const metricsQuery = await query('SELECT * FROM member_profile_metrics WHERE user_id = $1', [identity.user_id]);

    // Check validation bounds
    let result = 'success';
    if (identity.revoked) {
      result = 'revoked_failed';
    } else if (identity.verification_status === 'Suspended') {
      result = 'suspended_failed';
    } else if (!identity.active) {
      result = 'inactive_failed';
    }

    // Write audit log of scan
    await query(`
      INSERT INTO qr_verification_logs (member_identity_id, scanned_by_uid, verification_result, device_info, ip_address)
      VALUES ($1, NULL, $2, $3, $4)
    `, [identity.id, result, deviceInfo, ipAddress]);

    res.json({
      success: true,
      verified: result === 'success',
      result,
      identity,
      profile: user,
      metrics: metricsQuery.rows[0] || { issues_resolved: 0, issues_pending: 0, active_campaigns: 0, rating: 5.00, timeline: [] }
    });

  } catch (error) {
    console.error('🚨 [GET /verify Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 3. Fetch latest 50 security scan audit logs (Supreme Admin Only)
 */
router.get('/logs', requireRole(['supreme_admin']), async (req, res) => {
  try {
    const logsRes = await query(`
      SELECT ql.*, mi.tsrv_member_id, u.full_name, u.role, u.profile_image
      FROM qr_verification_logs ql
      LEFT JOIN member_identities mi ON ql.member_identity_id = mi.id
      LEFT JOIN users u ON mi.user_id = u.id
      ORDER BY ql.scanned_at DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      logs: logsRes.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 4. Update an ID Card's verification status dynamically (Supreme Admin Only)
 */
router.post('/update-status', requireRole(['supreme_admin']), async (req, res) => {
  const { identityId, newStatus } = req.body;

  if (!identityId || !newStatus) {
    return res.status(400).json({ success: false, message: 'Identity ID and target status are required.' });
  }

  try {
    // Validate target status bounds
    if (!['Verified', 'Active', 'Suspended', 'Inactive', 'Revoked'].includes(newStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid target status code designation.' });
    }

    const active = newStatus === 'Verified' || newStatus === 'Active';
    const revoked = newStatus === 'Revoked';

    // Retrieve active record details for audit logging
    const identityCheck = await query(`
      SELECT mi.*, u.full_name 
      FROM member_identities mi
      LEFT JOIN users u ON mi.user_id = u.id
      WHERE mi.id = $1
    `, [identityId]);

    if (identityCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Identity record not found.' });
    }

    const record = identityCheck.rows[0];

    // Perform atomic transaction
    const updateRes = await query(`
      UPDATE member_identities
      SET verification_status = $1,
          active = $2,
          revoked = $3
      WHERE id = $4
      RETURNING *
    `, [newStatus, active, revoked, identityId]);

    // Insert Direct system Notification
    await query(`
      INSERT INTO notifications (user_id, title, message)
      VALUES ($1, 'Identity Credentials Modified', $2)
    `, [record.user_id, `Your digital governance ID status has been changed to "${newStatus}" by the Supreme Command.`]);

    // Create system audit activity log
    await query('INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)', [
      req.user.uid || 'SUPREME_ADMIN_UID',
      'MODIFY_IDENTITY',
      `Modified identity state of '${record.full_name}' (${record.tsrv_member_id}) to '${newStatus}'`
    ]);

    res.json({
      success: true,
      message: 'Digital credentials updated successfully.',
      identity: updateRes.rows[0]
    });

  } catch (error) {
    console.error('🚨 [POST /update-status Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 5. Manual provision Request Trigger (Supreme Admin Only)
 */
router.post('/generate', requireRole(['supreme_admin']), async (req, res) => {
  const { targetUserId } = req.body;

  if (!targetUserId) {
    return res.status(400).json({ success: false, message: 'Target User ID is required.' });
  }

  try {
    const userCheck = await query('SELECT full_name FROM users WHERE id = $1', [targetUserId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Selected member node not found.' });
    }

    const provisioned = await autoProvisionIdentity(targetUserId);

    if (!provisioned) {
      return res.status(500).json({ success: false, message: 'Identity provisioning transaction failed.' });
    }

    res.json({
      success: true,
      message: `Digital identity successfully provisioned for ${userCheck.rows[0].full_name}.`,
      identity: provisioned
    });

  } catch (error) {
    console.error('🚨 [POST /generate Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

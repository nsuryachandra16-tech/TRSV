import express from 'express';
import { query } from '../config/db.js';
import { requireRole } from './constituencies.js';

const router = express.Router();

/**
 * 1. Fetch announcements based on user role audience filters
 */
router.get('/', requireRole(['student', 'secretary', 'general_secretary', 'vice_president', 'president', 'state_president', 'supreme_admin', 'dev']), async (req, res) => {
  const { role } = req.user;

  try {
    let result;

    if (role === 'student') {
      // Students see only 'all' or 'student' announcements
      result = await query(
        `SELECT a.*, u.full_name as author_name, u.role as author_role, con.constituency_name as author_constituency 
         FROM announcements a
         LEFT JOIN users u ON a.author_id = u.id
         LEFT JOIN constituencies con ON u.constituency_id = con.id
         WHERE a.target_audience IN ('all', 'student') 
         ORDER BY a.created_at DESC`
      );
    } else if (['secretary', 'general_secretary', 'vice_president', 'president'].includes(role)) {
      // Leaders see 'all', 'leader', and their specific role announcements
      result = await query(
        `SELECT a.*, u.full_name as author_name, u.role as author_role, con.constituency_name as author_constituency 
         FROM announcements a
         LEFT JOIN users u ON a.author_id = u.id
         LEFT JOIN constituencies con ON u.constituency_id = con.id
         WHERE a.target_audience IN ('all', 'leader', $1) 
         ORDER BY a.created_at DESC`,
        [role]
      );
    } else {
      // Supreme Admin (supreme_admin, state_president, dev) sees all circulars
      result = await query(
        `SELECT a.*, u.full_name as author_name, u.role as author_role, con.constituency_name as author_constituency 
         FROM announcements a
         LEFT JOIN users u ON a.author_id = u.id
         LEFT JOIN constituencies con ON u.constituency_id = con.id
         ORDER BY a.created_at DESC`
      );
    }

    res.json({ success: true, announcements: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 2. Create statewide announcement circulars (General Secretary, President, and Supreme Admin/State President/Dev only)
 */
router.post('/', requireRole(['general_secretary', 'president', 'state_president', 'supreme_admin', 'dev']), async (req, res) => {
  const { title, content, targetAudience, imageUrl } = req.body;
  const authorUid = req.user.uid || 'SUPREME_ADMIN_UID';

  if (!title || !content) {
    return res.status(400).json({ success: false, message: 'Circular title and content are required.' });
  }

  try {
    const result = await query(
      `INSERT INTO announcements (title, content, target_audience, author_id, image_url) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, content, targetAudience || 'all', authorUid, imageUrl || null]
    );

    const announcementId = result.rows[0].id;

    // Trigger mass system notification for matching target audience users
    let targetUsersQuery = 'SELECT id FROM users';
    let queryParams = [];

    if (targetAudience === 'student') {
      targetUsersQuery += " WHERE role = 'student'";
    } else if (targetAudience === 'leader') {
      targetUsersQuery += " WHERE role IN ('secretary', 'general_secretary', 'vice_president', 'president')";
    }

    const matchedUsers = await query(targetUsersQuery, queryParams);

    // Bulk push notifications (simulated bulk insert)
    if (matchedUsers.rows.length > 0) {
      const values = matchedUsers.rows.map((u, idx) => `($${idx * 3 + 1}, $${idx * 3 + 2}, $${idx * 3 + 3})`).join(', ');
      const params = [];
      matchedUsers.rows.forEach(u => {
        params.push(u.id);
        params.push('New State Circular Published');
        params.push(`Circular bulletin: "${title}" is now active in your portal.`);
      });

      await query(
        `INSERT INTO notifications (user_id, title, message) VALUES ${values}`,
        params
      );
    }

    await query('INSERT INTO realtime_activity_logs (user_id, activity_type, details) VALUES ($1, $2, $3)', [
      authorUid,
      'CREATE_ANNOUNCEMENT',
      `Circular bulletin '${title}' published targeting audience '${targetAudience || 'all'}'`
    ]);

    res.status(201).json({ success: true, message: 'Statewide circular published successfully.', announcement: result.rows[0] });
  } catch (error) {
    console.error('🚨 [Announcement Post Error]:', error.message);
    res.status(500).json({ success: false, message: 'Failed to publish circular.', error: error.message });
  }
});

/**
 * 3. Delete circular (General Secretary, President, and Supreme Admin/Dev only)
 */
router.delete('/:id', requireRole(['supreme_admin', 'state_president', 'dev']), async (req, res) => {
  const { id } = req.params;
  const authorUid = req.user.uid || 'SUPREME_ADMIN_UID';

  try {
    const check = await query('SELECT id, title FROM announcements WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Circular not found.' });
    }

    const title = check.rows[0].title;

    await query('DELETE FROM announcements WHERE id = $1', [id]);

    await query('INSERT INTO realtime_activity_logs (user_id, activity_type, details) VALUES ($1, $2, $3)', [
      authorUid,
      'DELETE_ANNOUNCEMENT',
      `Circular bulletin '${title}' (ID: ${id}) deleted by admin/dev`
    ]);

    res.json({ success: true, message: 'Circular deleted successfully.' });
  } catch (error) {
    console.error('🚨 [Announcement Delete Error]:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete circular.', error: error.message });
  }
});

export default router;

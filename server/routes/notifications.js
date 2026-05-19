import express from 'express';
import { query } from '../config/db.js';
import { requireRole } from './constituencies.js';

const router = express.Router();

// GET /api/notifications -> fetch last 15 notifications for the user
router.get('/', requireRole(['student', 'secretary', 'general_secretary', 'vice_president', 'president', 'supreme_admin', 'dev']), async (req, res) => {
  const userId = req.user.uid;
  try {
    const result = await query(
      `SELECT id, title, message, read, created_at 
       FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 15`,
      [userId]
    );
    res.json({ success: true, notifications: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/notifications/mark-read/:id -> mark specific notification as read
router.post('/mark-read/:id', requireRole(['student', 'secretary', 'general_secretary', 'vice_president', 'president', 'supreme_admin', 'dev']), async (req, res) => {
  const { id } = req.params;
  const userId = req.user.uid;
  try {
    await query(
      `UPDATE notifications 
       SET read = TRUE 
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/notifications/mark-all-read -> mark all notifications as read
router.post('/mark-all-read', requireRole(['student', 'secretary', 'general_secretary', 'vice_president', 'president', 'supreme_admin', 'dev']), async (req, res) => {
  const userId = req.user.uid;
  try {
    await query(
      `UPDATE notifications 
       SET read = TRUE 
       WHERE user_id = $1`,
      [userId]
    );
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(550).json({ success: false, error: error.message });
  }
});

export default router;

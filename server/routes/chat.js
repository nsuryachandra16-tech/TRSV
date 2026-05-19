import express from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'tsrv_quantum_super_secure_secret_hash_key_2026';

// Mid-tier authorization middleware
const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Authorization header required.' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Query user profile from database to get live role and constituency
    const userQuery = await query(
      'SELECT id, role, full_name, email, (SELECT name FROM constituencies WHERE id = users.constituency_id) as constituency_name FROM users WHERE id = $1', 
      [decoded.uid]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Governance profile not found.' });
    }

    const user = userQuery.rows[0];
    
    // Check if the user is an admin or dev
    const allowedRoles = ['dev', 'supreme_admin', 'president', 'vice_president', 'general_secretary', 'secretary'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied. Administrator clearance required.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
};

/**
 * GET /history/:channel_id
 * Fetches the last 50 messages for a specific channel
 */
router.get('/history/:channel_id', authenticateAdmin, async (req, res) => {
  const { channel_id } = req.params;
  const user = req.user;

  // Authorization Check:
  // - 'dev' and 'supreme_admin' roles have access to ALL channels
  // - Other roles can only access 'GH-Global' OR 'GH-Constituency-[Their Constituency Name]'
  const isGlobal = channel_id === 'GH-Global';
  const myConstituencyChannel = `GH-Constituency-${user.constituency_name}`;
  
  const isAuthorized = 
    user.role === 'dev' || 
    user.role === 'supreme_admin' || 
    isGlobal || 
    channel_id === myConstituencyChannel;

  if (!isAuthorized) {
    return res.status(403).json({ 
      success: false, 
      message: `Access denied. You do not have permissions to view chat room: ${channel_id}` 
    });
  }

  try {
    // Fetch last 50 messages, ordered ascending by time so they render top-to-bottom
    const messagesQuery = await query(`
      SELECT 
        m.id, 
        m.channel_id, 
        m.message_text, 
        m.created_at, 
        m.sender_id, 
        u.full_name as sender_name, 
        u.role as sender_role
      FROM chat_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.channel_id = $1
      ORDER BY m.created_at ASC
      LIMIT 50
    `, [channel_id]);

    res.json({ success: true, messages: messagesQuery.rows });
  } catch (err) {
    console.error('🚨 [Chat API Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

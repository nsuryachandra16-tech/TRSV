import express from 'express';
import { query } from '../config/db.js';
import { requireRole } from './constituencies.js';

const router = express.Router();

/**
 * 1. Fetch Complaint Growth Trends (For Area/Line Charts)
 */
router.get('/trends', requireRole(['secretary', 'general_secretary', 'vice_president', 'president', 'supreme_admin']), async (req, res) => {
  const { role, constituency_id, college_id } = req.user;

  try {
    let result;
    if (role === 'secretary' && college_id) {
      result = await query(`
        SELECT DATE(created_at) as date, COUNT(*) as count 
        FROM complaints 
        WHERE college_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at) ORDER BY date ASC
      `, [college_id]);
    } else if (role === 'general_secretary' && constituency_id) {
      result = await query(`
        SELECT DATE(created_at) as date, COUNT(*) as count 
        FROM complaints 
        WHERE constituency_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at) ORDER BY date ASC
      `, [constituency_id]);
    } else {
      // Supreme / State level
      result = await query(`
        SELECT DATE(created_at) as date, COUNT(*) as count 
        FROM complaints 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at) ORDER BY date ASC
      `);
    }

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 2. Fetch Category Distribution (For Pie/Radar Charts)
 */
router.get('/categories', requireRole(['secretary', 'general_secretary', 'vice_president', 'president', 'supreme_admin']), async (req, res) => {
  const { role, constituency_id, college_id } = req.user;

  try {
    let result;
    if (role === 'secretary' && college_id) {
      result = await query(`
        SELECT category as name, COUNT(*) as value 
        FROM complaints 
        WHERE college_id = $1 GROUP BY category ORDER BY value DESC
      `, [college_id]);
    } else if (role === 'general_secretary' && constituency_id) {
      result = await query(`
        SELECT category as name, COUNT(*) as value 
        FROM complaints 
        WHERE constituency_id = $1 GROUP BY category ORDER BY value DESC
      `, [constituency_id]);
    } else {
      result = await query(`
        SELECT category as name, COUNT(*) as value 
        FROM complaints 
        GROUP BY category ORDER BY value DESC
      `);
    }

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 3. Fetch Active Emergency Heatmap
 */
router.get('/emergency-heatmap', requireRole(['secretary', 'general_secretary', 'vice_president', 'president', 'supreme_admin']), async (req, res) => {
  try {
    const result = await query(`
      SELECT con.constituency_name as name, COUNT(c.id) as emergencies 
      FROM complaints c
      JOIN constituencies con ON c.constituency_id = con.id
      WHERE c.emergency_flag = TRUE AND c.status != 'Resolved'
      GROUP BY con.constituency_name 
      ORDER BY emergencies DESC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 4. Constituency Performance Rankings
 */
router.get('/rankings', requireRole(['vice_president', 'president', 'supreme_admin']), async (req, res) => {
  try {
    const result = await query(`
      SELECT con.constituency_name as name, 
             COUNT(c.id) as total_tickets,
             SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved_tickets,
             ROUND(
               (SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(c.id), 0)) * 100, 2
             ) as resolution_rate
      FROM constituencies con
      LEFT JOIN complaints c ON c.constituency_id = con.id
      WHERE con.status = 'active'
      GROUP BY con.constituency_name
      ORDER BY resolution_rate DESC NULLS LAST, resolved_tickets DESC
      LIMIT 20
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

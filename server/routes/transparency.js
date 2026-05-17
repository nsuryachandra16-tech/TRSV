import express from 'express';
import { query } from '../config/db.js';

const router = express.Router();

/**
 * 1. Fetch Public Transparency Metrics
 * Completely open endpoint for the Public Transparency Portal.
 */
router.get('/metrics', async (req, res) => {
  try {
    const total = await query('SELECT COUNT(*) FROM complaints');
    const resolved = await query("SELECT COUNT(*) FROM complaints WHERE status = 'Resolved'");
    const active = await query("SELECT COUNT(*) FROM complaints WHERE status != 'Resolved' AND status != 'Dismissed'");
    const emergencies = await query("SELECT COUNT(*) FROM complaints WHERE emergency_flag = TRUE");
    
    // Calculate average resolution time (rough estimate)
    const avgRes = await query(`
      SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours 
      FROM complaints 
      WHERE status = 'Resolved'
    `);

    res.json({
      success: true,
      metrics: {
        totalComplaints: parseInt(total.rows[0].count),
        resolvedComplaints: parseInt(resolved.rows[0].count),
        activeComplaints: parseInt(active.rows[0].count),
        criticalEmergencies: parseInt(emergencies.rows[0].count),
        averageResolutionHours: avgRes.rows[0].avg_hours ? Math.round(parseFloat(avgRes.rows[0].avg_hours)) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 2. Fetch Public Constituency Rankings
 * Drives healthy competition and transparency among state leaders.
 */
router.get('/rankings', async (req, res) => {
  try {
    const result = await query(`
      SELECT con.constituency_name as name, 
             COUNT(c.id) as total_tickets,
             SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved_tickets,
             ROUND(
               (SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(c.id), 0)) * 100, 1
             ) as resolution_rate
      FROM constituencies con
      LEFT JOIN complaints c ON c.constituency_id = con.id
      WHERE con.status = 'active'
      GROUP BY con.constituency_name
      ORDER BY resolution_rate DESC NULLS LAST, resolved_tickets DESC
      LIMIT 10
    `);

    res.json({ success: true, rankings: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 3. Fetch Recent Public Operations (Anonymized)
 */
router.get('/activity', async (req, res) => {
  try {
    const result = await query(`
      SELECT c.id, c.category, c.status, con.constituency_name, c.created_at, c.updated_at
      FROM complaints c
      LEFT JOIN constituencies con ON c.constituency_id = con.id
      WHERE c.anonymous = FALSE
      ORDER BY c.updated_at DESC
      LIMIT 20
    `);

    res.json({ success: true, activity: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

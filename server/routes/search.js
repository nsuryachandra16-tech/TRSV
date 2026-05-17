import express from 'express';
import { query } from '../config/db.js';
import { requireRole } from './constituencies.js';

const router = express.Router();

/**
 * Global Omnisearch Endpoint
 * Indexes Complaints, Announcements, and Governance Regions based on a single query string.
 */
router.get('/', async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.json({ success: true, results: [] });
  }

  const searchTerm = `%${q}%`;

  try {
    // 1. Search Complaints (Titles, Categories, Urgency)
    const complaintsQuery = await query(`
      SELECT 'complaint' as type, id, title as primary_text, category || ' • ' || status as secondary_text, urgency as tag
      FROM complaints
      WHERE title ILIKE $1 OR category ILIKE $1
      LIMIT 5
    `, [searchTerm]);

    // 2. Search Announcements
    const announcementsQuery = await query(`
      SELECT 'announcement' as type, id, title as primary_text, priority as tag, content as secondary_text
      FROM announcements
      WHERE title ILIKE $1
      LIMIT 3
    `, [searchTerm]);

    // 3. Search Constituencies (Governance Regions)
    const regionsQuery = await query(`
      SELECT 'region' as type, id, constituency_name as primary_text, district as secondary_text, status as tag
      FROM constituencies
      WHERE constituency_name ILIKE $1 OR district ILIKE $1
      LIMIT 3
    `, [searchTerm]);

    const results = [
      ...complaintsQuery.rows,
      ...announcementsQuery.rows,
      ...regionsQuery.rows
    ];

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

import express from 'express';
import { query } from '../config/db.js';
import { broadcastEvent } from './realtime.js';

const router = express.Router();

/**
 * Perform Auto-Escalation Engine checks
 * Loops through active tickets and escalates their statuses if they are stagnant.
 */
export const runAutoEscalationJob = async () => {
  console.log('🤖 [Automation Engine] Running Governance check cycle...');
  
  try {
    // 1. Fetch tickets pending for over 7 days (mocked as 48 hours for immediate testing in command terminal)
    const stagnantTickets = await query(`
      SELECT c.id, c.title, c.urgency, c.status, c.constituency_id
      FROM complaints c
      WHERE c.status = 'Pending' AND c.created_at < NOW() - INTERVAL '2 days'
    `);

    let affectedCount = 0;

    for (const ticket of stagnantTickets.rows) {
      let nextUrgency = 'high';
      if (ticket.urgency === 'high') nextUrgency = 'critical';
      
      // Update urgency
      await query(`
        UPDATE complaints 
        SET urgency = $1, updated_at = NOW() 
        WHERE id = $2
      `, [nextUrgency, ticket.id]);

      // Add to timeline log
      await query(`
        INSERT INTO complaint_timeline (complaint_id, status, action_taken, processed_by)
        VALUES ($1, $2, $3, $4)
      `, [
        ticket.id, 
        'Escalated', 
        `Governance auto-escalation triggered. Urgency bubbled to [${nextUrgency.toUpperCase()}] due to constituency response inactivity.`, 
        'SYSTEM_CRON_SCHEDULER'
      ]);

      // Write timeline audit record
      await query(`
        INSERT INTO audit_security_logs (action_type, target_id, severity, details)
        VALUES ($1, $2, $3, $4)
      `, [
        'AUTO_ESCALATION',
        ticket.id.toString(),
        'warning',
        JSON.stringify({ title: ticket.title, from: ticket.urgency, to: nextUrgency })
      ]);

      affectedCount++;
      
      // Broadcast this update to live listening clients
      broadcastEvent('NEW_COMPLAINT', { ticketId: ticket.id });
    }

    // Log the automated job run
    await query(`
      INSERT INTO automation_logs (job_name, records_affected, status)
      VALUES ($1, $2, $3)
    `, ['auto_escalate', affectedCount, 'success']);

    console.log(`🤖 [Automation Engine] Job finished. Stagnant ticket count escalated: ${affectedCount}`);
    return affectedCount;
  } catch (error) {
    console.error('❌ [Automation Engine] Auto-escalation error:', error.message);
    await query(`
      INSERT INTO automation_logs (job_name, records_affected, status, error_message)
      VALUES ($1, $2, $3, $4)
    `, ['auto_escalate', 0, 'failed', error.message]);
    throw error;
  }
};

/**
 * POST /api/automation/trigger
 * Manual endpoint trigger accessible from the CommandCenter.
 */
router.post('/trigger', async (req, res) => {
  try {
    const affected = await runAutoEscalationJob();
    res.json({
      success: true,
      message: 'Statewide governance auto-escalation job executed successfully.',
      escalatedCount: affected
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

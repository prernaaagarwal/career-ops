import express from 'express';
import { dbRun, dbGet, dbAll } from '../services/db.mjs';

const router = express.Router();

// Get follow-ups
router.get('/', async (req, res) => {
  try {
    const { skip = 0, limit = 50, overdue_only = false } = req.query;

    let query = `SELECT fu.*, a.company, a.role FROM follow_ups fu
                 JOIN applications a ON fu.application_id = a.id
                 WHERE fu.user_id = ?`;
    const params = [req.userId];

    if (overdue_only === 'true') {
      query += ' AND fu.date < date(\'now\')';
    }

    query += ' ORDER BY fu.date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(skip));

    const followUps = await dbAll(query, params);

    const countResult = await dbGet(
      'SELECT COUNT(*) as count FROM follow_ups WHERE user_id = ?',
      [req.userId]
    );

    res.json({
      data: followUps,
      total: countResult.count,
      skip: parseInt(skip),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Get follow-ups error:', err);
    res.status(500).json({ error: 'Failed to get follow-ups' });
  }
});

// Create follow-up
router.post('/', async (req, res) => {
  try {
    const { application_id, date, channel, contact_name, contact_email, notes } = req.body;

    if (!application_id || !date) {
      return res.status(400).json({ error: 'Application ID and date required' });
    }

    // Verify application belongs to user
    const app = await dbGet(
      'SELECT id FROM applications WHERE id = ? AND user_id = ?',
      [application_id, req.userId]
    );

    if (!app) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const result = await dbRun(
      `INSERT INTO follow_ups (user_id, application_id, date, channel, contact_name, contact_email, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, application_id, date, channel || null, contact_name || null, contact_email || null, notes || null]
    );

    res.status(201).json({
      message: 'Follow-up created',
      id: result.id
    });
  } catch (err) {
    console.error('Create follow-up error:', err);
    res.status(500).json({ error: 'Failed to create follow-up' });
  }
});

// Update follow-up
router.patch('/:id', async (req, res) => {
  try {
    const followUp = await dbGet(
      'SELECT id FROM follow_ups WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!followUp) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }

    const { date, channel, contact_name, contact_email, notes } = req.body;
    const updates = [];
    const params = [];

    if (date !== undefined) {
      updates.push('date = ?');
      params.push(date);
    }
    if (channel !== undefined) {
      updates.push('channel = ?');
      params.push(channel);
    }
    if (contact_name !== undefined) {
      updates.push('contact_name = ?');
      params.push(contact_name);
    }
    if (contact_email !== undefined) {
      updates.push('contact_email = ?');
      params.push(contact_email);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    params.push(req.userId);

    await dbRun(
      `UPDATE follow_ups SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    res.json({ message: 'Follow-up updated' });
  } catch (err) {
    console.error('Update follow-up error:', err);
    res.status(500).json({ error: 'Failed to update follow-up' });
  }
});

// Delete follow-up
router.delete('/:id', async (req, res) => {
  try {
    const followUp = await dbGet(
      'SELECT id FROM follow_ups WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!followUp) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }

    await dbRun(
      'DELETE FROM follow_ups WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    res.json({ message: 'Follow-up deleted' });
  } catch (err) {
    console.error('Delete follow-up error:', err);
    res.status(500).json({ error: 'Failed to delete follow-up' });
  }
});

export default router;

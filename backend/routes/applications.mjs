import express from 'express';
import { dbRun, dbGet, dbAll } from '../services/db.mjs';

const router = express.Router();

// Get all applications with filtering and sorting
router.get('/', async (req, res) => {
  try {
    const { skip = 0, limit = 50, status, score_min, score_max, company, sort_by = 'date' } = req.query;

    let query = 'SELECT * FROM applications WHERE user_id = ?';
    const params = [req.userId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (score_min) {
      query += ' AND score >= ?';
      params.push(parseFloat(score_min));
    }

    if (score_max) {
      query += ' AND score <= ?';
      params.push(parseFloat(score_max));
    }

    if (company) {
      query += ' AND company LIKE ?';
      params.push(`%${company}%`);
    }

    // Sorting
    const sortMap = {
      'date': 'ORDER BY date DESC',
      'score': 'ORDER BY score DESC NULLS LAST',
      'company': 'ORDER BY company ASC',
      'status': 'ORDER BY status ASC'
    };
    query += ' ' + (sortMap[sort_by] || sortMap['date']);

    // Pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(skip));

    const applications = await dbAll(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as count FROM applications WHERE user_id = ?';
    const countParams = [req.userId];

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    if (score_min) {
      countQuery += ' AND score >= ?';
      countParams.push(parseFloat(score_min));
    }
    if (score_max) {
      countQuery += ' AND score <= ?';
      countParams.push(parseFloat(score_max));
    }
    if (company) {
      countQuery += ' AND company LIKE ?';
      countParams.push(`%${company}%`);
    }

    const countResult = await dbGet(countQuery, countParams);

    res.json({
      data: applications,
      total: countResult.count,
      skip: parseInt(skip),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Get applications error:', err);
    res.status(500).json({ error: 'Failed to get applications' });
  }
});

// Get application stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await dbGet(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Applied' THEN 1 ELSE 0 END) as applied,
        SUM(CASE WHEN status = 'Interview' THEN 1 ELSE 0 END) as interview,
        SUM(CASE WHEN status = 'Offer' THEN 1 ELSE 0 END) as offer,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'Evaluated' THEN 1 ELSE 0 END) as evaluated,
        AVG(score) as avg_score,
        MAX(score) as max_score,
        MIN(score) as min_score
      FROM applications WHERE user_id = ?`,
      [req.userId]
    );

    res.json(stats);
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get single application
router.get('/:id', async (req, res) => {
  try {
    const application = await dbGet(
      'SELECT * FROM applications WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(application);
  } catch (err) {
    console.error('Get application error:', err);
    res.status(500).json({ error: 'Failed to get application' });
  }
});

// Create application
router.post('/', async (req, res) => {
  try {
    const { company, role, score, status, pdf_path, report_id, notes, url } = req.body;
    const date = req.body.date || new Date().toISOString().split('T')[0];

    if (!company || !role) {
      return res.status(400).json({ error: 'Company and role required' });
    }

    // Check for duplicate (same company+role for this user) — update instead of insert
    const existing = await dbGet(
      'SELECT id FROM applications WHERE user_id = ? AND company = ? AND role = ?',
      [req.userId, company, role]
    );
    if (existing) {
      const updates = [];
      const params = [];
      if (score !== undefined) { updates.push('score = ?'); params.push(score); }
      if (status !== undefined) { updates.push('status = ?'); params.push(status); }
      if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
      if (url !== undefined) { updates.push('url = ?'); params.push(url); }
      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(existing.id, req.userId);
        await dbRun(`UPDATE applications SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);
      }
      return res.json({ message: 'Application updated (duplicate)', id: existing.id });
    }

    // Get next num value
    const maxNum = await dbGet(
      'SELECT MAX(num) as max_num FROM applications WHERE user_id = ?',
      [req.userId]
    );
    const num = (maxNum.max_num || 0) + 1;

    const result = await dbRun(
      `INSERT INTO applications
        (user_id, num, date, company, role, score, status, pdf_path, report_id, notes, url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, num, date, company, role, score || null, status || 'Evaluated', pdf_path || null, report_id || null, notes || null, url || null]
    );

    res.status(201).json({
      message: 'Application created',
      id: result.id,
      num
    });
  } catch (err) {
    console.error('Create application error:', err);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// Update application
router.patch('/:id', async (req, res) => {
  try {
    const { status, notes, score } = req.body;

    const application = await dbGet(
      'SELECT id FROM applications WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const updates = [];
    const params = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    if (score !== undefined) {
      updates.push('score = ?');
      params.push(score);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);
    params.push(req.userId);

    await dbRun(
      `UPDATE applications SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    res.json({ message: 'Application updated' });
  } catch (err) {
    console.error('Update application error:', err);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// Delete application
router.delete('/:id', async (req, res) => {
  try {
    const application = await dbGet(
      'SELECT id FROM applications WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    await dbRun(
      'UPDATE applications SET status = ? WHERE id = ? AND user_id = ?',
      ['Discarded', req.params.id, req.userId]
    );

    res.json({ message: 'Application discarded' });
  } catch (err) {
    console.error('Delete application error:', err);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

export default router;

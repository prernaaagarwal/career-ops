import express from 'express';
import { dbRun, dbGet, dbAll } from '../services/db.mjs';

const router = express.Router();

// Trigger scan
router.post('/', async (req, res) => {
  try {
    // TODO: Implement scanner logic
    // 1. Load portals.yml for user
    // 2. Run scan.mjs for each enabled portal
    // 3. Deduplicate against scan_history
    // 4. Return new jobs

    res.status(202).json({
      message: 'Scan in progress',
      id: Date.now(),
      status: 'processing'
    });
  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ error: 'Failed to start scan' });
  }
});

// Get scan status
router.get('/status/:id', async (req, res) => {
  try {
    // TODO: Implement status tracking
    res.json({ status: 'completed', id: req.params.id, jobs_found: 0 });
  } catch (err) {
    console.error('Status error:', err);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Get recent jobs
router.get('/jobs', async (req, res) => {
  try {
    const { skip = 0, limit = 20, status = 'pending' } = req.query;

    const jobs = await dbAll(
      `SELECT * FROM pipeline_urls WHERE user_id = ? AND status = ? LIMIT ? OFFSET ?`,
      [req.userId, status, parseInt(limit), parseInt(skip)]
    );

    const countResult = await dbGet(
      'SELECT COUNT(*) as count FROM pipeline_urls WHERE user_id = ? AND status = ?',
      [req.userId, status]
    );

    res.json({
      data: jobs,
      total: countResult.count,
      skip: parseInt(skip),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Get jobs error:', err);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

// Add job to pipeline
router.post('/jobs/:id/add-to-pipeline', async (req, res) => {
  try {
    const job = await dbGet(
      'SELECT * FROM pipeline_urls WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Update status to processed
    await dbRun(
      'UPDATE pipeline_urls SET status = ? WHERE id = ? AND user_id = ?',
      ['processed', req.params.id, req.userId]
    );

    res.json({ message: 'Job added to pipeline' });
  } catch (err) {
    console.error('Add to pipeline error:', err);
    res.status(500).json({ error: 'Failed to add to pipeline' });
  }
});

export default router;

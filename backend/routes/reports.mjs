import express from 'express';
import { dbGet, dbAll, dbRun } from '../services/db.mjs';

const router = express.Router();

// Get all reports
router.get('/', async (req, res) => {
  try {
    const { skip = 0, limit = 20 } = req.query;

    const reports = await dbAll(
      `SELECT id, num, company, role, archetype, score, legitimacy, created_at
      FROM reports WHERE user_id = ? ORDER BY num DESC LIMIT ? OFFSET ?`,
      [req.userId, parseInt(limit), parseInt(skip)]
    );

    const countResult = await dbGet(
      'SELECT COUNT(*) as count FROM reports WHERE user_id = ?',
      [req.userId]
    );

    res.json({
      data: reports,
      total: countResult.count,
      skip: parseInt(skip),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Get reports error:', err);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

// Get single report
router.get('/:id', async (req, res) => {
  try {
    const report = await dbGet(
      `SELECT * FROM reports WHERE id = ? AND user_id = ?`,
      [req.params.id, req.userId]
    );

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Parse blocks if stored as JSON
    if (report.blocks) {
      try {
        report.blocks = JSON.parse(report.blocks);
      } catch (e) {
        // Keep as string if not valid JSON
      }
    }

    res.json(report);
  } catch (err) {
    console.error('Get report error:', err);
    res.status(500).json({ error: 'Failed to get report' });
  }
});

// Get report by number
router.get('/num/:num', async (req, res) => {
  try {
    const report = await dbGet(
      `SELECT * FROM reports WHERE num = ? AND user_id = ?`,
      [req.params.num, req.userId]
    );

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.blocks) {
      try {
        report.blocks = JSON.parse(report.blocks);
      } catch (e) {
        // Keep as string if not valid JSON
      }
    }

    res.json(report);
  } catch (err) {
    console.error('Get report by num error:', err);
    res.status(500).json({ error: 'Failed to get report' });
  }
});

// Create report
router.post('/', async (req, res) => {
  try {
    const {
      company,
      role,
      archetype,
      score,
      legitimacy,
      markdown_content,
      pdf_path,
      cv_match_score,
      level_strategy,
      comp_range,
      interview_prep,
      blocks
    } = req.body;

    if (!company || !role) {
      return res.status(400).json({ error: 'Company and role required' });
    }

    // Get next num value
    const maxNum = await dbGet(
      'SELECT MAX(num) as max_num FROM reports WHERE user_id = ?',
      [req.userId]
    );
    const num = (maxNum.max_num || 0) + 1;

    const result = await dbRun(
      `INSERT INTO reports
        (user_id, num, company, role, archetype, score, legitimacy, markdown_content, pdf_path,
         cv_match_score, level_strategy, comp_range, interview_prep, blocks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId, num, company, role, archetype || null, score || null, legitimacy || null,
        markdown_content || null, pdf_path || null, cv_match_score || null,
        level_strategy || null, comp_range || null, interview_prep || null,
        blocks ? JSON.stringify(blocks) : null
      ]
    );

    res.status(201).json({
      message: 'Report created',
      id: result.id,
      num
    });
  } catch (err) {
    console.error('Create report error:', err);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Update report
router.patch('/:id', async (req, res) => {
  try {
    const report = await dbGet(
      'SELECT id FROM reports WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const {
      markdown_content,
      score,
      legitimacy,
      blocks,
      interview_prep
    } = req.body;

    const updates = [];
    const params = [];

    if (markdown_content !== undefined) {
      updates.push('markdown_content = ?');
      params.push(markdown_content);
    }
    if (score !== undefined) {
      updates.push('score = ?');
      params.push(score);
    }
    if (legitimacy !== undefined) {
      updates.push('legitimacy = ?');
      params.push(legitimacy);
    }
    if (blocks !== undefined) {
      updates.push('blocks = ?');
      params.push(JSON.stringify(blocks));
    }
    if (interview_prep !== undefined) {
      updates.push('interview_prep = ?');
      params.push(interview_prep);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);
    params.push(req.userId);

    await dbRun(
      `UPDATE reports SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    res.json({ message: 'Report updated' });
  } catch (err) {
    console.error('Update report error:', err);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// Get report PDF path
router.get('/:id/pdf', async (req, res) => {
  try {
    const report = await dbGet(
      'SELECT pdf_path FROM reports WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (!report.pdf_path) {
      return res.status(404).json({ error: 'PDF not available' });
    }

    res.json({ pdf_path: report.pdf_path });
  } catch (err) {
    console.error('Get PDF error:', err);
    res.status(500).json({ error: 'Failed to get PDF' });
  }
});

export default router;

import express from 'express';
import { dbRun, dbGet } from '../services/db.mjs';

const router = express.Router();

// Get company-specific prep
router.get('/:company_slug', async (req, res) => {
  try {
    const prep = await dbGet(
      `SELECT * FROM interview_prep WHERE company_slug = ? AND user_id = ?`,
      [req.params.company_slug, req.userId]
    );

    if (!prep) {
      return res.json(null);
    }

    // Parse JSON fields
    if (prep.recommended_stories) {
      prep.recommended_stories = JSON.parse(prep.recommended_stories);
    }
    if (prep.red_flags) {
      prep.red_flags = JSON.parse(prep.red_flags);
    }

    res.json(prep);
  } catch (err) {
    console.error('Get interview prep error:', err);
    res.status(500).json({ error: 'Failed to get interview prep' });
  }
});

// Save company-specific prep
router.post('/:company_slug', async (req, res) => {
  try {
    const { company_name, role, company_research, recommended_stories, case_study_recommendation, red_flags } = req.body;

    const existing = await dbGet(
      'SELECT id FROM interview_prep WHERE company_slug = ? AND user_id = ?',
      [req.params.company_slug, req.userId]
    );

    if (existing) {
      // Update
      await dbRun(
        `UPDATE interview_prep SET
          company_name = ?, role = ?, company_research = ?, recommended_stories = ?,
          case_study_recommendation = ?, red_flags = ?, updated_at = CURRENT_TIMESTAMP
        WHERE company_slug = ? AND user_id = ?`,
        [
          company_name || null,
          role || null,
          company_research || null,
          recommended_stories ? JSON.stringify(recommended_stories) : null,
          case_study_recommendation || null,
          red_flags ? JSON.stringify(red_flags) : null,
          req.params.company_slug,
          req.userId
        ]
      );
    } else {
      // Create
      await dbRun(
        `INSERT INTO interview_prep (user_id, company_slug, company_name, role, company_research, recommended_stories, case_study_recommendation, red_flags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.userId,
          req.params.company_slug,
          company_name || null,
          role || null,
          company_research || null,
          recommended_stories ? JSON.stringify(recommended_stories) : null,
          case_study_recommendation || null,
          red_flags ? JSON.stringify(red_flags) : null
        ]
      );
    }

    res.json({ message: 'Interview prep saved' });
  } catch (err) {
    console.error('Save interview prep error:', err);
    res.status(500).json({ error: 'Failed to save interview prep' });
  }
});

export default router;

import express from 'express';
import { dbRun, dbGet } from '../services/db.mjs';

const router = express.Router();

// Get candidate profile
router.get('/profile', async (req, res) => {
  try {
    const candidate = await dbGet(
      `SELECT id, full_name, email, phone, location, timezone,
        linkedin_url, portfolio_url, github_url, twitter_url,
        cv_markdown, headline, exit_story, superpowers, target_roles,
        compensation_target, compensation_currency, article_digest,
        canva_design_id, created_at, updated_at
      FROM candidates WHERE user_id = ?`,
      [req.userId]
    );

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Parse JSON fields
    if (candidate.superpowers) {
      candidate.superpowers = JSON.parse(candidate.superpowers);
    }
    if (candidate.target_roles) {
      candidate.target_roles = JSON.parse(candidate.target_roles);
    }

    res.json(candidate);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update candidate profile
router.put('/profile', async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone,
      location,
      timezone,
      linkedin_url,
      portfolio_url,
      github_url,
      twitter_url,
      headline,
      exit_story,
      superpowers,
      target_roles,
      compensation_target,
      compensation_currency,
      location_flexibility,
      visa_status,
      onsite_availability
    } = req.body;

    const candidate = await dbGet(
      'SELECT id FROM candidates WHERE user_id = ?',
      [req.userId]
    );

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    await dbRun(
      `UPDATE candidates SET
        full_name = ?, email = ?, phone = ?, location = ?, timezone = ?,
        linkedin_url = ?, portfolio_url = ?, github_url = ?, twitter_url = ?,
        headline = ?, exit_story = ?, superpowers = ?, target_roles = ?,
        compensation_target = ?, compensation_currency = ?,
        location_flexibility = ?, visa_status = ?, onsite_availability = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?`,
      [
        full_name || null, email || null, phone || null, location || null, timezone || null,
        linkedin_url || null, portfolio_url || null, github_url || null, twitter_url || null,
        headline || null, exit_story || null,
        superpowers ? JSON.stringify(superpowers) : null,
        target_roles ? JSON.stringify(target_roles) : null,
        compensation_target || null, compensation_currency || 'USD',
        location_flexibility || null, visa_status || null, onsite_availability || null,
        req.userId
      ]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get CV
router.get('/cv', async (req, res) => {
  try {
    const candidate = await dbGet(
      'SELECT cv_markdown FROM candidates WHERE user_id = ?',
      [req.userId]
    );

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json({ cv_markdown: candidate.cv_markdown || '' });
  } catch (err) {
    console.error('Get CV error:', err);
    res.status(500).json({ error: 'Failed to get CV' });
  }
});

// Update CV
router.put('/cv', async (req, res) => {
  try {
    const { cv_markdown, cv_json } = req.body;

    if (!cv_markdown) {
      return res.status(400).json({ error: 'CV markdown required' });
    }

    const candidate = await dbGet(
      'SELECT id FROM candidates WHERE user_id = ?',
      [req.userId]
    );

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    await dbRun(
      'UPDATE candidates SET cv_markdown = ?, cv_json = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [cv_markdown, cv_json || null, req.userId]
    );

    res.json({ message: 'CV updated successfully' });
  } catch (err) {
    console.error('Update CV error:', err);
    res.status(500).json({ error: 'Failed to update CV' });
  }
});

export default router;

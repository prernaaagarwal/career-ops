import express from 'express';
import { dbRun, dbGet } from '../services/db.mjs';

const router = express.Router();

// Get onboarding status
router.get('/status', async (req, res) => {
  try {
    const candidate = await dbGet(
      'SELECT id, cv_markdown, full_name, email FROM candidates WHERE user_id = ?',
      [req.userId]
    );

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const status = {
      cv_done: !!candidate.cv_markdown,
      profile_done: !!candidate.full_name && !!candidate.email,
      all_done: !!candidate.cv_markdown && !!candidate.full_name && !!candidate.email
    };

    res.json(status);
  } catch (err) {
    console.error('Onboarding status error:', err);
    res.status(500).json({ error: 'Failed to get onboarding status' });
  }
});

// Step 1: Upload CV
router.post('/cv', async (req, res) => {
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
      'UPDATE candidates SET cv_markdown = ?, cv_json = ? WHERE user_id = ?',
      [cv_markdown, cv_json || null, req.userId]
    );

    res.json({ message: 'CV saved successfully' });
  } catch (err) {
    console.error('CV upload error:', err);
    res.status(500).json({ error: 'Failed to save CV' });
  }
});

// Step 2: Save profile
router.post('/profile', async (req, res) => {
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

    if (!full_name || !email) {
      return res.status(400).json({ error: 'Name and email required' });
    }

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
        location_flexibility = ?, visa_status = ?, onsite_availability = ?
      WHERE user_id = ?`,
      [
        full_name, email, phone || null, location || null, timezone || null,
        linkedin_url || null, portfolio_url || null, github_url || null, twitter_url || null,
        headline || null, exit_story || null,
        superpowers ? JSON.stringify(superpowers) : null,
        target_roles ? JSON.stringify(target_roles) : null,
        compensation_target || null, compensation_currency || 'USD',
        location_flexibility || null, visa_status || null, onsite_availability || null,
        req.userId
      ]
    );

    // Update user email too
    await dbRun(
      'UPDATE users SET email = ?, full_name = ? WHERE id = ?',
      [email, full_name, req.userId]
    );

    res.json({ message: 'Profile saved successfully' });
  } catch (err) {
    console.error('Profile save error:', err);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// Step 3: Add proof points / article digest
router.post('/article-digest', async (req, res) => {
  try {
    const { article_digest } = req.body;

    const candidate = await dbGet(
      'SELECT id FROM candidates WHERE user_id = ?',
      [req.userId]
    );

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    await dbRun(
      'UPDATE candidates SET article_digest = ? WHERE user_id = ?',
      [article_digest || null, req.userId]
    );

    res.json({ message: 'Article digest saved successfully' });
  } catch (err) {
    console.error('Article digest save error:', err);
    res.status(500).json({ error: 'Failed to save article digest' });
  }
});

// Complete onboarding
router.post('/complete', async (req, res) => {
  try {
    const candidate = await dbGet(
      'SELECT id, cv_markdown, full_name, email FROM candidates WHERE user_id = ?',
      [req.userId]
    );

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    if (!candidate.cv_markdown || !candidate.full_name || !candidate.email) {
      return res.status(400).json({
        error: 'CV and profile setup required before completing onboarding'
      });
    }

    res.json({ message: 'Onboarding completed successfully' });
  } catch (err) {
    console.error('Onboarding complete error:', err);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

export default router;

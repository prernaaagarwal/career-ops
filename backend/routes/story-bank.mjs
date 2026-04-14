import express from 'express';
import { dbRun, dbGet, dbAll } from '../services/db.mjs';

const router = express.Router();

// Get all stories
router.get('/', async (req, res) => {
  try {
    const { skip = 0, limit = 50, tag } = req.query;

    let query = 'SELECT * FROM story_bank WHERE user_id = ?';
    const params = [req.userId];

    if (tag) {
      query += " AND tags LIKE ?";
      params.push(`%${tag}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(skip));

    const stories = await dbAll(query, params);

    // Parse tags for each story
    stories.forEach(story => {
      if (story.tags) {
        story.tags = JSON.parse(story.tags);
      }
      if (story.relevant_to) {
        story.relevant_to = JSON.parse(story.relevant_to);
      }
    });

    const countResult = await dbGet(
      'SELECT COUNT(*) as count FROM story_bank WHERE user_id = ?',
      [req.userId]
    );

    res.json({
      stories,
      total: countResult.count,
      skip: parseInt(skip),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Get stories error:', err);
    res.status(500).json({ error: 'Failed to get stories' });
  }
});

// Get single story
router.get('/:id', async (req, res) => {
  try {
    const story = await dbGet(
      'SELECT * FROM story_bank WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (story.tags) {
      story.tags = JSON.parse(story.tags);
    }
    if (story.relevant_to) {
      story.relevant_to = JSON.parse(story.relevant_to);
    }

    res.json(story);
  } catch (err) {
    console.error('Get story error:', err);
    res.status(500).json({ error: 'Failed to get story' });
  }
});

// Create story
router.post('/', async (req, res) => {
  try {
    const { title, situation, task, action, result, reflection, tags, relevant_to } = req.body;

    if (!title || !situation || !action || !result) {
      return res.status(400).json({ error: 'Title, situation, action, and result required' });
    }

    const result_obj = await dbRun(
      `INSERT INTO story_bank (user_id, title, situation, task, action, result, reflection, tags, relevant_to)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        title,
        situation,
        task || null,
        action,
        result,
        reflection || null,
        tags ? JSON.stringify(tags) : null,
        relevant_to ? JSON.stringify(relevant_to) : null
      ]
    );

    res.status(201).json({
      message: 'Story created',
      id: result_obj.id
    });
  } catch (err) {
    console.error('Create story error:', err);
    res.status(500).json({ error: 'Failed to create story' });
  }
});

// Update story
router.patch('/:id', async (req, res) => {
  try {
    const story = await dbGet(
      'SELECT id FROM story_bank WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const { title, situation, task, action, result, reflection, tags, relevant_to } = req.body;
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (situation !== undefined) {
      updates.push('situation = ?');
      params.push(situation);
    }
    if (task !== undefined) {
      updates.push('task = ?');
      params.push(task);
    }
    if (action !== undefined) {
      updates.push('action = ?');
      params.push(action);
    }
    if (result !== undefined) {
      updates.push('result = ?');
      params.push(result);
    }
    if (reflection !== undefined) {
      updates.push('reflection = ?');
      params.push(reflection);
    }
    if (tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(tags));
    }
    if (relevant_to !== undefined) {
      updates.push('relevant_to = ?');
      params.push(JSON.stringify(relevant_to));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);
    params.push(req.userId);

    await dbRun(
      `UPDATE story_bank SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    res.json({ message: 'Story updated' });
  } catch (err) {
    console.error('Update story error:', err);
    res.status(500).json({ error: 'Failed to update story' });
  }
});

// Delete story
router.delete('/:id', async (req, res) => {
  try {
    const story = await dbGet(
      'SELECT id FROM story_bank WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    await dbRun(
      'DELETE FROM story_bank WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    res.json({ message: 'Story deleted' });
  } catch (err) {
    console.error('Delete story error:', err);
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

export default router;

import express from 'express';
import bcrypt from 'bcryptjs';
import { dbRun, dbGet } from '../services/db.mjs';
import { generateToken, verifyToken } from '../middleware/auth.mjs';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await dbRun(
      'INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)',
      [email, password_hash, full_name || null]
    );

    // Create candidate record
    await dbRun(
      'INSERT INTO candidates (user_id, email, full_name) VALUES (?, ?, ?)',
      [result.id, email, full_name || null]
    );

    const token = generateToken(result.id);
    res.status(201).json({
      message: 'User registered successfully',
      token,
      userId: result.id,
      email,
      full_name: full_name || null
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await dbGet(
      'SELECT id, password_hash, full_name FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);
    res.json({
      message: 'Login successful',
      token,
      userId: user.id,
      email,
      full_name: user.full_name
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify token
router.post('/verify', verifyToken, async (req, res) => {
  try {
    const user = await dbGet(
      'SELECT id, email, full_name FROM users WHERE id = ?',
      [req.userId]
    );

    res.json({
      valid: true,
      userId: user.id,
      email: user.email,
      full_name: user.full_name
    });
  } catch (err) {
    res.status(401).json({ error: 'Token verification failed' });
  }
});

export default router;

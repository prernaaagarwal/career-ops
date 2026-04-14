import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

import { initDb } from './services/db.mjs';
import { verifyToken } from './middleware/auth.mjs';

// Import routes
import authRoutes from './routes/auth.mjs';
import onboardingRoutes from './routes/onboarding.mjs';
import candidatesRoutes from './routes/candidates.mjs';
import applicationsRoutes from './routes/applications.mjs';
import evaluationsRoutes from './routes/evaluations.mjs';
import scannerRoutes from './routes/scanner.mjs';
import reportsRoutes from './routes/reports.mjs';
import storyBankRoutes from './routes/story-bank.mjs';
import interviewPrepRoutes from './routes/interview-prep.mjs';
import followUpsRoutes from './routes/follow-ups.mjs';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({
  origin: allowedOrigin,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes (no auth required)
app.use('/api/auth', authRoutes);

// Protected routes (auth required)
app.use('/api/onboarding', verifyToken, onboardingRoutes);
app.use('/api/candidates', verifyToken, candidatesRoutes);
app.use('/api/applications', verifyToken, applicationsRoutes);
app.use('/api/evaluate', verifyToken, evaluationsRoutes);
app.use('/api/scan', verifyToken, scannerRoutes);
app.use('/api/reports', verifyToken, reportsRoutes);
app.use('/api/story-bank', verifyToken, storyBankRoutes);
app.use('/api/interview-prep', verifyToken, interviewPrepRoutes);
app.use('/api/follow-ups', verifyToken, followUpsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
async function start() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Career-ops API listening on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

export default app;

#!/usr/bin/env node
/**
 * Career-Ops Web Dashboard — Local server
 *
 * Reads the same data files the CLI writes to and serves them
 * as JSON APIs + a web dashboard frontend.
 *
 * Usage: node site/server.mjs
 * Then open http://localhost:3737
 */

import { createServer } from 'http';
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PORT = parseInt(process.env.PORT || '3737', 10);

// Optional dependency — graceful fallback if not installed
let yaml;
try { yaml = (await import('js-yaml')).default; } catch { yaml = null; }

// ── MIME types ──────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
  '.md': 'text/plain',
};

// ── Helpers ─────────────────────────────────────────────────
function safeRead(path) {
  try { return readFileSync(path, 'utf-8'); } catch { return null; }
}

function resolveAppsFile() {
  const dataPath = join(ROOT, 'data/applications.md');
  const rootPath = join(ROOT, 'applications.md');
  if (existsSync(dataPath)) return dataPath;
  if (existsSync(rootPath)) return rootPath;
  return null;
}

function parseMarkdownTable(content) {
  if (!content) return [];
  const lines = content.split('\n').filter(l => l.trim().startsWith('|'));
  if (lines.length < 3) return []; // header + separator + at least 1 row
  const headers = lines[0].split('|').map(s => s.trim()).filter(Boolean);
  const rows = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i].split('|').map(s => s.trim()).filter(Boolean);
    if (cells.length < headers.length - 1) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h.replace(/[#*]/g, '').trim()] = cells[idx] || ''; });
    rows.push(row);
  }
  return rows;
}

function parseAppRow(row) {
  const num = parseInt(row[''] || row['#'] || '0', 10);
  const scoreMatch = (row['Score'] || '').replace(/\*\*/g, '').match(/([\d.]+)/);
  return {
    num: isNaN(num) ? 0 : num,
    date: row['Date'] || '',
    company: row['Company'] || '',
    role: row['Role'] || '',
    score: scoreMatch ? parseFloat(scoreMatch[1]) : 0,
    scoreRaw: row['Score'] || '',
    status: (row['Status'] || '').replace(/\*\*/g, '').trim(),
    pdf: row['PDF'] || '',
    report: row['Report'] || '',
    notes: row['Notes'] || '',
  };
}

function getApplications() {
  const file = resolveAppsFile();
  const content = file ? safeRead(file) : null;
  const rows = parseMarkdownTable(content);
  return rows.map(parseAppRow).filter(r => r.num > 0);
}

function getStats(apps) {
  const statusCounts = {};
  let totalScore = 0;
  let scoredCount = 0;
  const archetypes = {};
  const scoreBuckets = { '0-2': 0, '2-3': 0, '3-3.5': 0, '3.5-4': 0, '4-4.5': 0, '4.5-5': 0 };

  for (const app of apps) {
    const status = app.status || 'Unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    if (app.score > 0) {
      totalScore += app.score;
      scoredCount++;
      if (app.score < 2) scoreBuckets['0-2']++;
      else if (app.score < 3) scoreBuckets['2-3']++;
      else if (app.score < 3.5) scoreBuckets['3-3.5']++;
      else if (app.score < 4) scoreBuckets['3.5-4']++;
      else if (app.score < 4.5) scoreBuckets['4-4.5']++;
      else scoreBuckets['4.5-5']++;
    }
  }

  return {
    total: apps.length,
    evaluated: statusCounts['Evaluated'] || 0,
    applied: statusCounts['Applied'] || 0,
    responded: statusCounts['Responded'] || 0,
    interview: statusCounts['Interview'] || 0,
    offer: statusCounts['Offer'] || 0,
    rejected: statusCounts['Rejected'] || 0,
    discarded: statusCounts['Discarded'] || 0,
    skip: statusCounts['SKIP'] || 0,
    avgScore: scoredCount > 0 ? Math.round((totalScore / scoredCount) * 100) / 100 : 0,
    scoreBuckets,
    statusCounts,
  };
}

function getReportsList() {
  const dir = join(ROOT, 'reports');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith('.md') && f !== '.gitkeep')
    .map(f => {
      const stat = statSync(join(dir, f));
      const match = f.match(/^(\d+)-(.+?)-(\d{4}-\d{2}-\d{2})\.md$/);
      return {
        filename: f,
        num: match ? parseInt(match[1]) : 0,
        company: match ? match[2].replace(/-/g, ' ') : f,
        date: match ? match[3] : '',
        size: stat.size,
        modified: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.num - a.num);
}

function getReport(filename) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '');
  const path = join(ROOT, 'reports', safe);
  return safeRead(path);
}

function getPipeline() {
  const content = safeRead(join(ROOT, 'data/pipeline.md'));
  if (!content) return [];
  const urls = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      urls.push(trimmed.slice(2).trim());
    } else if (trimmed.match(/^https?:\/\//)) {
      urls.push(trimmed);
    }
  }
  return urls;
}

function getProfile() {
  const content = safeRead(join(ROOT, 'config/profile.yml'));
  if (!content || !yaml) return null;
  try { return yaml.load(content); } catch { return null; }
}

function getScanHistory() {
  const content = safeRead(join(ROOT, 'data/scan-history.tsv'));
  if (!content) return [];
  const lines = content.trim().split('\n').filter(l => l.trim());
  return lines.slice(-50).reverse().map(line => {
    const parts = line.split('\t');
    return { date: parts[0] || '', company: parts[1] || '', role: parts[2] || '', url: parts[3] || '' };
  });
}

// ── Router ──────────────────────────────────────────────────
function handleAPI(path, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (path === '/api/applications') {
    return json(res, getApplications());
  }
  if (path === '/api/stats') {
    return json(res, getStats(getApplications()));
  }
  if (path === '/api/reports') {
    return json(res, getReportsList());
  }
  if (path.startsWith('/api/reports/')) {
    const filename = path.slice('/api/reports/'.length);
    const content = getReport(filename);
    if (content === null) return notFound(res);
    return json(res, { filename, content });
  }
  if (path === '/api/pipeline') {
    return json(res, getPipeline());
  }
  if (path === '/api/profile') {
    const profile = getProfile();
    return json(res, profile || { note: 'No profile configured. Run onboarding first.' });
  }
  if (path === '/api/scan-history') {
    return json(res, getScanHistory());
  }
  return notFound(res);
}

function serveStatic(path, res) {
  // Map URL paths to filesystem paths
  const routes = {
    '/': join(__dirname, 'index.html'),
    '/index.html': join(__dirname, 'index.html'),
  };

  let fsPath = routes[path];

  if (!fsPath) {
    // Serve fonts/ and docs/ from repo root
    if (path.startsWith('/fonts/')) fsPath = join(ROOT, path);
    else if (path.startsWith('/docs/')) fsPath = join(ROOT, path);
    else return false;
  }

  if (!existsSync(fsPath)) return false;

  const ext = extname(fsPath);
  const mime = MIME[ext] || 'application/octet-stream';
  try {
    const content = readFileSync(fsPath);
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

function json(res, data) { res.writeHead(200); res.end(JSON.stringify(data)); }
function notFound(res) { res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' })); }

// ── Server ──────────────────────────────────────────────────
const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (path.startsWith('/api/')) return handleAPI(path, res);
  if (serveStatic(path, res)) return;
  notFound(res);
});

server.listen(PORT, () => {
  console.log(`\n  Career-Ops Dashboard`);
  console.log(`  ────────────────────`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Status:  Reading from ${ROOT}`);
  console.log(`\n  Open in your browser while using Claude Code in another terminal.\n`);
});

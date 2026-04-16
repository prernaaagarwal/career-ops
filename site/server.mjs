#!/usr/bin/env node
/**
 * Career-Ops Web Dashboard — Interactive server
 *
 * Reads the same data files the CLI writes to and serves them
 * as JSON APIs + a web dashboard frontend.
 * Also runs CLI scripts on demand with live SSE streaming.
 *
 * Usage: node site/server.mjs
 * Then open http://localhost:3737
 */

import { createServer } from 'http';
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

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
  const fpath = join(ROOT, 'reports', safe);
  return safeRead(fpath);
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

function getPortalsInfo() {
  const content = safeRead(join(ROOT, 'portals.yml'));
  if (!content || !yaml) return { companies: 0, queries: 0, companyNames: [] };
  try {
    const data = yaml.load(content);
    const enabledCompanies = (data.tracked_companies || []).filter(c => c.enabled !== false);
    return {
      companies: enabledCompanies.length,
      queries: (data.search_queries || []).filter(q => q.enabled !== false).length,
      companyNames: enabledCompanies.map(c => c.name).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    };
  } catch { return { companies: 0, queries: 0, companyNames: [] }; }
}

// ── Job Runner (spawn CLI scripts + SSE) ───────────────────
const jobs = new Map();

const ALLOWED_SCRIPTS = {
  'scan':       { script: 'scan.mjs', args: [] },
  'merge':      { script: 'merge-tracker.mjs', args: [] },
  'liveness':   { script: 'check-liveness.mjs', args: [] },
  'patterns':   { script: 'analyze-patterns.mjs', args: ['--summary'] },
  'followup':   { script: 'followup-cadence.mjs', args: ['--summary'] },
  'normalize':  { script: 'normalize-statuses.mjs', args: [] },
  'verify':     { script: 'verify-pipeline.mjs', args: [] },
  'dedup':      { script: 'dedup-tracker.mjs', args: [] },
};

function runScript(name, extraArgs = []) {
  const config = ALLOWED_SCRIPTS[name];
  if (!config) return null;

  const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const allArgs = [config.script, ...config.args, ...extraArgs];
  const proc = spawn('node', allArgs, { cwd: ROOT, env: { ...process.env, FORCE_COLOR: '0' } });

  const job = { id: jobId, name, output: [], done: false, exitCode: null, listeners: new Set(), proc, stopped: false };
  jobs.set(jobId, job);

  const push = (type, text) => {
    const entry = { type, text, ts: Date.now() };
    job.output.push(entry);
    for (const cb of job.listeners) cb(entry);
  };

  proc.stdout.on('data', d => push('stdout', d.toString()));
  proc.stderr.on('data', d => push('stderr', d.toString()));
  proc.on('close', code => {
    job.done = true;
    job.exitCode = code;
    push('done', `Process exited with code ${code}`);
    // Clean up after 5 minutes
    setTimeout(() => jobs.delete(jobId), 5 * 60 * 1000);
  });
  proc.on('error', err => {
    job.done = true;
    job.exitCode = -1;
    push('error', err.message);
  });

  return jobId;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 1e6) reject(new Error('Too large')); });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
    });
  });
}

// ── Write endpoints ────────────────────────────────────────
function addToPipeline(urls) {
  const pipelinePath = join(ROOT, 'data/pipeline.md');
  let content = safeRead(pipelinePath) || '# Pipeline — Pending URLs\n';
  const toAdd = (Array.isArray(urls) ? urls : [urls]).filter(u => u && typeof u === 'string');
  if (!toAdd.length) return 0;
  for (const url of toAdd) {
    content += `\n- ${url.trim()}`;
  }
  writeFileSync(pipelinePath, content, 'utf-8');
  return toAdd.length;
}

function removeFromPipeline(url) {
  const pipelinePath = join(ROOT, 'data/pipeline.md');
  const content = safeRead(pipelinePath);
  if (!content) return false;
  const lines = content.split('\n');
  const filtered = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return !trimmed.includes(url.trim());
    }
    return true;
  });
  if (filtered.length === lines.length) return false;
  writeFileSync(pipelinePath, filtered.join('\n'), 'utf-8');
  return true;
}

function updateTrackerStatus(num, newStatus) {
  const file = resolveAppsFile();
  if (!file) return false;
  const content = safeRead(file);
  if (!content) return false;

  const VALID = ['Evaluated','Applied','Responded','Interview','Offer','Rejected','Discarded','SKIP'];
  if (!VALID.includes(newStatus)) return false;

  const lines = content.split('\n');
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim().startsWith('|')) continue;
    const cells = lines[i].split('|').map(s => s.trim());
    const rowNum = parseInt(cells[1], 10);
    if (rowNum === num) {
      // Status is column 6 (index 6 in split array, 1-based pipe-delimited)
      // Layout: | # | Date | Company | Role | Score | Status | PDF | Report | Notes |
      // Split:  ['', '#', 'Date', 'Company', 'Role', 'Score', 'Status', 'PDF', 'Report', 'Notes', '']
      cells[6] = ` ${newStatus} `;
      lines[i] = cells.join('|');
      changed = true;
      break;
    }
  }
  if (changed) writeFileSync(file, lines.join('\n'), 'utf-8');
  return changed;
}

// ── Router ──────────────────────────────────────────────────
function handleAPI(path, req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── Read endpoints (GET) ──
  res.setHeader('Content-Type', 'application/json');

  if (path === '/api/applications') return json(res, getApplications());
  if (path === '/api/stats') return json(res, getStats(getApplications()));
  if (path === '/api/reports') return json(res, getReportsList());
  if (path.startsWith('/api/reports/')) {
    const filename = path.slice('/api/reports/'.length);
    const content = getReport(filename);
    if (content === null) return notFound(res);
    return json(res, { filename, content });
  }
  if (path === '/api/pipeline') return json(res, getPipeline());
  if (path === '/api/profile') {
    const profile = getProfile();
    return json(res, profile || { note: 'No profile configured. Run onboarding first.' });
  }
  if (path === '/api/scan-history') return json(res, getScanHistory());
  if (path === '/api/portals-info') return json(res, getPortalsInfo());

  // ── Stop a running job (POST /api/run/{jobId}/stop) ──
  if (path.startsWith('/api/run/') && path.endsWith('/stop') && req.method === 'POST') {
    const jobId = path.slice('/api/run/'.length, -('/stop'.length));
    const job = jobs.get(jobId);
    if (!job) return json(res, { stopped: false, reason: 'unknown' }, 404);
    if (job.done) return json(res, { stopped: false, reason: 'already-done' });
    try {
      job.stopped = true;
      job.proc.kill('SIGTERM');
      setTimeout(() => { if (!job.done) { try { job.proc.kill('SIGKILL'); } catch {} } }, 2000);
      return json(res, { stopped: true });
    } catch (err) {
      return json(res, { stopped: false, reason: err.message }, 500);
    }
  }

  // ── Run script (POST) ──
  if (path.startsWith('/api/run/') && req.method === 'POST') {
    const scriptName = path.slice('/api/run/'.length);
    return readBody(req).then(body => {
      const extra = body.args || [];
      if (scriptName === 'scan' && body.company) {
        extra.push('--company', body.company);
      }
      if (scriptName === 'liveness' && body.urls) {
        extra.push(...body.urls);
      }
      const jobId = runScript(scriptName, extra);
      if (!jobId) return json(res, { error: `Unknown script: ${scriptName}` }, 400);
      return json(res, { jobId });
    }).catch(() => json(res, { error: 'Bad request' }, 400));
  }

  // ── SSE stream (GET) ──
  if (path.startsWith('/api/stream/')) {
    const jobId = path.slice('/api/stream/'.length);
    const job = jobs.get(jobId);
    if (!job) { return notFound(res); }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Send buffered output
    for (const entry of job.output) {
      res.write(`data: ${JSON.stringify(entry)}\n\n`);
    }
    if (job.done) { res.end(); return; }

    // Listen for new output
    const listener = (entry) => {
      try { res.write(`data: ${JSON.stringify(entry)}\n\n`); } catch {}
      if (entry.type === 'done' || entry.type === 'error') {
        job.listeners.delete(listener);
        res.end();
      }
    };
    job.listeners.add(listener);
    req.on('close', () => job.listeners.delete(listener));
    return;
  }

  // ── Write endpoints (POST) ──
  if (path === '/api/pipeline/add' && req.method === 'POST') {
    return readBody(req).then(body => {
      const count = addToPipeline(body.urls || body.url);
      return json(res, { added: count });
    });
  }
  if (path === '/api/pipeline/remove' && req.method === 'POST') {
    return readBody(req).then(body => {
      const ok = removeFromPipeline(body.url);
      return json(res, { removed: ok });
    });
  }
  if (path === '/api/tracker/status' && req.method === 'POST') {
    return readBody(req).then(body => {
      const ok = updateTrackerStatus(body.num, body.status);
      return json(res, { updated: ok });
    });
  }
  if (path === '/api/jobs') {
    const active = [];
    for (const [id, job] of jobs) {
      active.push({ id, name: job.name, done: job.done, exitCode: job.exitCode, lines: job.output.length });
    }
    return json(res, active);
  }

  return notFound(res);
}

function serveStatic(path, res) {
  const routes = {
    '/': join(__dirname, 'index.html'),
    '/index.html': join(__dirname, 'index.html'),
  };

  let fsPath = routes[path];

  if (!fsPath) {
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

function json(res, data, status = 200) {
  if (!res.headersSent) res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}
function notFound(res) { res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' })); }

// ── Server ──────────────────────────────────────────────────
const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (path.startsWith('/api/')) return handleAPI(path, req, res);
  if (serveStatic(path, res)) return;
  notFound(res);
});

server.listen(PORT, () => {
  console.log(`\n  Career-Ops Control Panel`);
  console.log(`  ────────────────────────`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Status:  Reading from ${ROOT}`);
  console.log(`\n  Open in your browser to control the pipeline.\n`);
});

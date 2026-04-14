import express from 'express';
import { dbRun, dbGet } from '../services/db.mjs';

const router = express.Router();

// Post evaluation (paste URL or JD text)
router.post('/', async (req, res) => {
  try {
    const { url, jd_text } = req.body;

    if (!url && !jd_text) {
      return res.status(400).json({ error: 'URL or JD text required' });
    }

    // Extract basic info from JD text (best-effort parsing without Claude)
    const rawText = jd_text || `Job posting from: ${url}`;
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

    // Heuristic: first non-empty line likely the role title
    let role = lines[0] || 'Unknown Role';

    // Try to find company name from URL or text
    let company = 'Unknown Company';
    if (url) {
      try {
        const host = new URL(url).hostname.replace(/^www\./, '');
        company = host.split('.')[0];
        company = company.charAt(0).toUpperCase() + company.slice(1);
      } catch {}
    }
    // Try to find company in text (lines that look like "Company: X" or "at X")
    for (const line of lines.slice(0, 10)) {
      const atMatch = line.match(/\bat\s+([A-Z][^\n]{2,40})/);
      if (atMatch) { company = atMatch[1].trim(); break; }
      const colonMatch = line.match(/^(?:company|employer|organization)[:\s]+(.+)/i);
      if (colonMatch) { company = colonMatch[1].trim(); break; }
    }

    // Strip trailing "at <Company>" from role if present
    role = role.replace(/\s+at\s+.+$/i, '').trim() || role;

    // Generate sequential report number
    const maxNum = await dbGet(
      'SELECT MAX(num) as max_num FROM reports WHERE user_id = ?',
      [req.userId]
    );
    const reportNum = (maxNum?.max_num || 0) + 1;

    const today = new Date().toISOString().split('T')[0];
    const score = null; // Score requires actual AI evaluation
    const archetype = 'Pending Evaluation';
    const legitimacy = 'Unverified';

    const markdownContent = [
      `# Evaluation Report #${reportNum.toString().padStart(3, '0')}`,
      '',
      `**Company:** ${company}`,
      `**Role:** ${role}`,
      `**Date:** ${today}`,
      `**URL:** ${url || 'Pasted JD'}`,
      `**Score:** Pending`,
      `**Legitimacy:** ${legitimacy}`,
      '',
      '---',
      '',
      '## Job Description',
      '',
      rawText.slice(0, 3000),
      '',
      '---',
      '',
      '> ⚠️ Full AI evaluation requires Claude API integration.',
      '> This report was saved from your pasted job description.',
      '> Use the career-ops CLI to run a full evaluation with scoring.',
    ].join('\n');

    // Save to reports table
    const reportResult = await dbRun(
      `INSERT INTO reports (user_id, num, company, role, archetype, score, legitimacy, markdown_content, pdf_path, comp_range)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, reportNum, company, role, archetype, score, legitimacy, markdownContent, null, null]
    );

    // Auto-create application entry linked to this report
    const maxAppNum = await dbGet(
      'SELECT MAX(num) as max_num FROM applications WHERE user_id = ?',
      [req.userId]
    );
    const appNum = (maxAppNum?.max_num || 0) + 1;

    // Dedup check
    const existingApp = await dbGet(
      'SELECT id FROM applications WHERE user_id = ? AND company = ? AND role = ?',
      [req.userId, company, role]
    );

    let appId;
    if (existingApp) {
      appId = existingApp.id;
      await dbRun(
        'UPDATE applications SET report_id = ?, url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [reportResult.id, url || null, appId]
      );
    } else {
      const appResult = await dbRun(
        `INSERT INTO applications (user_id, num, date, company, role, score, status, report_id, url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.userId, appNum, today, company, role, score, 'Evaluated', reportResult.id, url || null]
      );
      appId = appResult.id;
    }

    res.status(201).json({
      id: reportResult.id,
      application_id: appId,
      report: {
        id: reportResult.id,
        num: reportNum,
        company,
        role,
        archetype,
        score,
        legitimacy,
        markdown_content: markdownContent,
        comp_range: null,
        pdf_path: null,
      },
      status: 'saved',
    });
  } catch (err) {
    console.error('Evaluation error:', err);
    res.status(500).json({ error: 'Failed to evaluate' });
  }
});

// Get evaluation / report by id
router.get('/status/:id', async (req, res) => {
  try {
    const report = await dbGet(
      'SELECT * FROM reports WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ status: 'completed', id: report.id, report });
  } catch (err) {
    console.error('Status error:', err);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export default router;

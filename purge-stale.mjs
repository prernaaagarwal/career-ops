#!/usr/bin/env node

/**
 * purge-stale.mjs — Remove stale entries from data/pipeline.md
 *
 * For each URL in pipeline.md:
 *   1. Look up its posting date in scan-history.tsv
 *   2. If older than max_age_days (from portals.yml), mark for removal
 *   3. If no date known, optionally run check-liveness.mjs to verify (with --check-liveness flag)
 *   4. Rewrite pipeline.md preserving headings and structure
 *
 * Usage:
 *   node purge-stale.mjs                      # remove stale entries (by scan-history date only)
 *   node purge-stale.mjs --check-liveness     # also check liveness of undated URLs
 *   node purge-stale.mjs --dry-run            # preview what would be removed
 *
 * Zero Claude API tokens.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import yaml from 'js-yaml';

const PORTALS_PATH = 'portals.yml';
const SCAN_HISTORY_PATH = 'data/scan-history.tsv';
const PIPELINE_PATH = 'data/pipeline.md';

function loadConfig() {
  if (!existsSync(PORTALS_PATH)) {
    console.error('Error: portals.yml not found.');
    process.exit(1);
  }
  return yaml.load(readFileSync(PORTALS_PATH, 'utf-8'));
}

function loadScanHistoryDates() {
  const urlToDate = new Map();
  if (!existsSync(SCAN_HISTORY_PATH)) return urlToDate;
  const lines = readFileSync(SCAN_HISTORY_PATH, 'utf-8').split('\n');
  for (const line of lines.slice(1)) {
    const parts = line.split('\t');
    const [url, date] = parts;
    if (url && date) urlToDate.set(url, date);
  }
  return urlToDate;
}

function ageInDays(dateStr) {
  const t = new Date(dateStr).getTime();
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / (1000 * 60 * 60 * 24);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const checkLive = args.includes('--check-liveness');

  const config = loadConfig();
  const maxAgeDays = config.freshness?.max_age_days ?? 7;

  if (!existsSync(PIPELINE_PATH)) {
    console.error('Error: pipeline.md not found.');
    process.exit(1);
  }

  const urlToDate = loadScanHistoryDates();
  const pipelineText = readFileSync(PIPELINE_PATH, 'utf-8');

  // Parse lines — keep all non-URL lines (headings, comments, etc.)
  const lines = pipelineText.split('\n');
  const kept = [];
  const removed = [];
  const undated = [];

  for (const line of lines) {
    const match = line.match(/- \[[ x]\] (https?:\/\/\S+)/);
    if (!match) {
      kept.push(line);
      continue;
    }
    const url = match[1];
    const knownDate = urlToDate.get(url);

    if (knownDate) {
      const age = ageInDays(knownDate);
      if (age !== null && age > maxAgeDays) {
        removed.push({ url, date: knownDate, age: age.toFixed(1) });
        continue;
      }
      kept.push(line);
    } else {
      // Undated entry — keep for now, optionally check liveness later
      if (checkLive) undated.push(url);
      kept.push(line);
    }
  }

  // Optionally run liveness check on undated URLs
  if (checkLive && undated.length > 0) {
    console.log(`Checking liveness of ${undated.length} undated URLs...`);
    try {
      const { classifyLiveness } = await import('./liveness-core.mjs');
      const { chromium } = await import('playwright');
      const browser = await chromium.launch();
      const page = await browser.newPage();

      const expiredUrls = new Set();
      for (const url of undated) {
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await page.waitForTimeout(2000);
          const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
          const result = classifyLiveness({ bodyText, status: 200, applyButtons: [] });
          if (result.verdict === 'expired') {
            expiredUrls.add(url);
            removed.push({ url, date: 'unknown', age: 'expired' });
          }
        } catch {
          // Skip on error
        }
      }
      await browser.close();

      // Re-filter kept to drop expired undated URLs
      const reFiltered = kept.filter(line => {
        const m = line.match(/- \[[ x]\] (https?:\/\/\S+)/);
        return !m || !expiredUrls.has(m[1]);
      });
      kept.length = 0;
      kept.push(...reFiltered);
    } catch (err) {
      console.warn(`Liveness check skipped: ${err.message}`);
    }
  }

  // Report
  console.log(`\n${'━'.repeat(45)}`);
  console.log(`Purge Stale — max age ${maxAgeDays} days`);
  console.log(`${'━'.repeat(45)}`);
  console.log(`Total URL entries:     ${removed.length + (lines.length - kept.length >= 0 ? lines.filter(l => /- \[[ x]\] https?:\/\//.test(l)).length : 0)}`);
  console.log(`Stale removed:         ${removed.length}`);
  console.log(`Kept:                  ${lines.filter(l => /- \[[ x]\] https?:\/\//.test(l)).length - removed.length}`);

  if (removed.length > 0) {
    console.log(`\nRemoved entries:`);
    for (const r of removed.slice(0, 20)) {
      console.log(`  - ${r.url} (${r.age} days old)`);
    }
    if (removed.length > 20) console.log(`  ... and ${removed.length - 20} more`);
  }

  if (dryRun) {
    console.log('\n(dry run — no changes written)');
    return;
  }

  writeFileSync(PIPELINE_PATH, kept.join('\n'));
  console.log(`\n✓ Rewrote ${PIPELINE_PATH}`);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});

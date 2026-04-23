#!/usr/bin/env node

/**
 * scrape-portals.mjs — Website/portal scraper using Playwright
 *
 * Runs DAILY alongside scan.mjs. Targets job aggregator portals directly
 * (Naukri, Bayt, MyCareersFuture) with native "last 7 days" filters.
 *
 * Uses:
 *   - config.domains from config/profile.yml (GenAI, CCaaS, CRM, etc.)
 *   - title_filter from portals.yml (mid+mid-senior, FAANG excluded)
 *   - freshness from portals.yml (max 7 days)
 *
 * Zero Claude API tokens — pure Playwright + DOM parsing.
 *
 * Usage:
 *   node scrape-portals.mjs              # scrape all enabled portals
 *   node scrape-portals.mjs --dry-run    # preview without writing
 *   node scrape-portals.mjs --portal naukri   # single portal only
 */

import { readFileSync, appendFileSync, existsSync } from 'fs';
import yaml from 'js-yaml';
import { chromium } from 'playwright';

const PORTALS_PATH = 'portals.yml';
const PROFILE_PATH = 'config/profile.yml';
const SCAN_HISTORY_PATH = 'data/scan-history.tsv';
const PIPELINE_PATH = 'data/pipeline.md';
const APPLICATIONS_PATH = 'data/applications.md';

// ── Portal scrapers ──────────────────────────────────────────────────
// Each scraper:
//   - Accepts { keyword, location }
//   - Uses native "last 7 days" filter where available
//   - Returns [{ title, url, company, location, postedAt, source }]

async function scrapeNaukri(page, { keyword, location }) {
  // Naukri URL pattern: /{keyword}-jobs-in-{city}?ctcFilter=&sort=date
  const kwSlug = keyword.toLowerCase().replace(/\s+/g, '-');
  const locSlug = location.toLowerCase().replace(/\s+/g, '-');
  const url = `https://www.naukri.com/${kwSlug}-jobs-in-${locSlug}?experience=8&jobAge=7&sort=date`;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);

    return await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.srp-jobtuple-wrapper, article.jobTuple, .jobTuple'));
      return cards.slice(0, 20).map((card) => {
        const link = card.querySelector('a.title, a.jobTitle, a[data-tracking-url]');
        const company = card.querySelector('.comp-name, .companyInfo, a.subTitle, span.comp-name')?.innerText?.trim() || '';
        const loc = card.querySelector('.locWdth, .loc, span.locWdth')?.innerText?.trim() || '';
        const dateText = card.querySelector('.job-post-day, .jobTupleFooter span, span.fleft.postedDate')?.innerText?.trim() || '';
        return {
          title: link?.innerText?.trim() || '',
          url: link?.href || '',
          company,
          location: loc,
          postedAtText: dateText,
        };
      }).filter(j => j.title && j.url);
    });
  } catch (err) {
    console.error(`Naukri error: ${err.message}`);
    return [];
  }
}

async function scrapeBayt(page, { keyword, location }) {
  // Bayt URL pattern
  const kwSlug = keyword.toLowerCase().replace(/\s+/g, '-');
  const url = `https://www.bayt.com/en/${location.toLowerCase()}/jobs/${kwSlug}-jobs/?filters%5Bpost_date%5D=7`;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);

    return await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.media.has-pointer-d, li.has-pointer-d, article'));
      return cards.slice(0, 20).map((card) => {
        const link = card.querySelector('h2 a, h3 a, a.m0');
        const company = card.querySelector('.t-small, .m0.t-bold, b.jb-company')?.innerText?.trim() || '';
        const loc = card.querySelector('.t-mute, span.jb-loc')?.innerText?.trim() || '';
        const dateText = card.querySelector('[data-automation-id="job-post-date"], span.text-small')?.innerText?.trim() || '';
        return {
          title: link?.innerText?.trim() || '',
          url: link?.href ? (link.href.startsWith('http') ? link.href : `https://www.bayt.com${link.getAttribute('href')}`) : '',
          company,
          location: loc,
          postedAtText: dateText,
        };
      }).filter(j => j.title && j.url);
    });
  } catch (err) {
    console.error(`Bayt error: ${err.message}`);
    return [];
  }
}

async function scrapeMyCareersFuture(page, { keyword }) {
  // MyCareersFuture — Singapore government job portal
  const url = `https://www.mycareersfuture.gov.sg/search?search=${encodeURIComponent(keyword)}&postingCompany=Direct&sortBy=new_posting_date&page=0`;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);

    return await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-cy="job-card"], article, div.bg-white.shadow'));
      return cards.slice(0, 20).map((card) => {
        const link = card.querySelector('a[href*="/job/"]');
        const title = card.querySelector('h1, h2, h3, [data-cy="job-title"]')?.innerText?.trim() || '';
        const company = card.querySelector('[data-cy="company-name"], p.pa-2')?.innerText?.trim() || '';
        const dateText = card.querySelector('[data-cy="posted-date"], time, p.t-xs')?.innerText?.trim() || '';
        return {
          title,
          url: link?.href || '',
          company,
          location: 'Singapore',
          postedAtText: dateText,
        };
      }).filter(j => j.title && j.url);
    });
  } catch (err) {
    console.error(`MyCareersFuture error: ${err.message}`);
    return [];
  }
}

// ── Date parsing ─────────────────────────────────────────────────────

function parsePostedAt(text) {
  if (!text) return null;
  const t = text.toLowerCase().trim();
  const now = Date.now();
  const day = 1000 * 60 * 60 * 24;

  if (t.includes('today') || t.includes('just now') || t.includes('few hours')) return new Date(now).toISOString();
  if (t.includes('yesterday') || t.includes('1 day')) return new Date(now - day).toISOString();

  const daysMatch = t.match(/(\d+)\s*day/);
  if (daysMatch) return new Date(now - parseInt(daysMatch[1]) * day).toISOString();

  const weeksMatch = t.match(/(\d+)\s*week/);
  if (weeksMatch) return new Date(now - parseInt(weeksMatch[1]) * 7 * day).toISOString();

  const monthsMatch = t.match(/(\d+)\s*month/);
  if (monthsMatch) return new Date(now - parseInt(monthsMatch[1]) * 30 * day).toISOString();

  return null;
}

// ── Title filter (same as scan.mjs) ──────────────────────────────────

function buildTitleFilter(titleFilter) {
  const positive = (titleFilter?.positive || []).map(k => k.toLowerCase());
  const negative = (titleFilter?.negative || []).map(k => k.toLowerCase());

  return (title) => {
    const lower = title.toLowerCase();
    const hasPositive = positive.length === 0 || positive.some(k => lower.includes(k));
    const hasNegative = negative.some(k => lower.includes(k));
    return hasPositive && !hasNegative;
  };
}

function buildFreshnessFilter(freshnessConfig) {
  const maxAgeDays = freshnessConfig?.max_age_days ?? null;
  const includeUndated = freshnessConfig?.include_undated ?? true;

  return (postedAt) => {
    if (!postedAt) return includeUndated;
    if (maxAgeDays === null) return true;
    const t = new Date(postedAt).getTime();
    if (!Number.isFinite(t)) return includeUndated;
    const ageDays = (Date.now() - t) / (1000 * 60 * 60 * 24);
    return ageDays <= maxAgeDays;
  };
}

// ── Dedup ────────────────────────────────────────────────────────────

function loadSeenUrls() {
  const seen = new Set();
  for (const path of [SCAN_HISTORY_PATH, PIPELINE_PATH, APPLICATIONS_PATH]) {
    if (!existsSync(path)) continue;
    const text = readFileSync(path, 'utf-8');
    for (const match of text.matchAll(/https?:\/\/[^\s|)]+/g)) {
      seen.add(match[0]);
    }
  }
  return seen;
}

// ── Pipeline writer ──────────────────────────────────────────────────

function appendToPipeline(offers) {
  if (offers.length === 0) return;
  const date = new Date().toISOString().slice(0, 10);
  const block = `\n## Portal Scrape ${date}\n\n` +
    offers.map(o => `- [ ] ${o.url} | ${o.company || 'Unknown'} | ${o.title} | ${o.location || 'N/A'}`).join('\n') + '\n';
  appendFileSync(PIPELINE_PATH, block);
}

function appendToScanHistory(offers) {
  const date = new Date().toISOString().slice(0, 10);
  const rows = offers.map(o => `${o.url}\t${date}\t${o.source}\t${o.title}\t${o.company}\tadded`);
  appendFileSync(SCAN_HISTORY_PATH, '\n' + rows.join('\n'));
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const portalFlag = args.indexOf('--portal');
  const filterPortal = portalFlag !== -1 ? args[portalFlag + 1]?.toLowerCase() : null;

  if (!existsSync(PORTALS_PATH) || !existsSync(PROFILE_PATH)) {
    console.error('Error: portals.yml or config/profile.yml missing.');
    process.exit(1);
  }

  const portalsConfig = yaml.load(readFileSync(PORTALS_PATH, 'utf-8'));
  const profile = yaml.load(readFileSync(PROFILE_PATH, 'utf-8'));

  const titleFilter = buildTitleFilter(portalsConfig.title_filter);
  const freshnessFilter = buildFreshnessFilter(portalsConfig.freshness);
  const domains = profile.domains || [];
  const seenUrls = loadSeenUrls();

  // Build search queries from domains × roles
  // Use top 3 domains + 2 role types = ~6 queries per portal × 3 portals = ~18 total
  const topDomains = domains.slice(0, 3); // GenAI, Generative AI, CCaaS (first 3)
  const queries = [
    ...topDomains.map(d => ({ keyword: `${d} Product Manager`, location: 'bangalore', portal: 'naukri' })),
    ...topDomains.map(d => ({ keyword: `${d} Product Owner`, location: 'bangalore', portal: 'naukri' })),
    ...topDomains.map(d => ({ keyword: `${d} Product Manager`, location: 'uae', portal: 'bayt' })),
    ...topDomains.map(d => ({ keyword: `${d} Product Manager`, location: 'singapore', portal: 'mycareersfuture' })),
  ];

  const filteredQueries = filterPortal ? queries.filter(q => q.portal === filterPortal) : queries;

  console.log(`Portal scraper — ${filteredQueries.length} queries across ${filterPortal || 'all'} portals`);
  if (dryRun) console.log('(dry run — no files written)');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  const allOffers = [];
  const errors = [];

  for (const q of filteredQueries) {
    let jobs = [];
    try {
      if (q.portal === 'naukri') jobs = await scrapeNaukri(page, q);
      else if (q.portal === 'bayt') jobs = await scrapeBayt(page, q);
      else if (q.portal === 'mycareersfuture') jobs = await scrapeMyCareersFuture(page, q);
    } catch (err) {
      errors.push({ query: q.keyword, portal: q.portal, error: err.message });
      continue;
    }

    for (const j of jobs) {
      if (!titleFilter(j.title)) continue;
      const postedAt = parsePostedAt(j.postedAtText);
      if (!freshnessFilter(postedAt)) continue;
      if (seenUrls.has(j.url)) continue;
      seenUrls.add(j.url);
      allOffers.push({
        ...j,
        postedAt,
        source: `${q.portal}-scrape`,
      });
    }

    // Polite delay between queries
    await page.waitForTimeout(2000);
  }

  await browser.close();

  // Write results
  if (!dryRun && allOffers.length > 0) {
    appendToPipeline(allOffers);
    appendToScanHistory(allOffers);
  }

  // Summary
  console.log(`\n${'━'.repeat(45)}`);
  console.log(`Portal Scrape Summary`);
  console.log(`${'━'.repeat(45)}`);
  console.log(`Queries run:      ${filteredQueries.length}`);
  console.log(`New offers:       ${allOffers.length}`);
  console.log(`Errors:           ${errors.length}`);

  if (allOffers.length > 0) {
    console.log(`\nNew offers found:`);
    for (const o of allOffers.slice(0, 20)) {
      console.log(`  + ${o.company} | ${o.title} | ${o.location}`);
      console.log(`    → ${o.url}`);
    }
    if (allOffers.length > 20) console.log(`  ... and ${allOffers.length - 20} more`);
  }

  if (errors.length > 0) {
    console.log(`\nErrors:`);
    for (const e of errors) console.log(`  ✗ ${e.portal} [${e.query}]: ${e.error}`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});

# Daily Portal Sweep — Instructions for Headless Claude

You are running in headless mode (`claude -p`) as part of the 11 AM `daily-scan.sh` cron job. No human is watching. Complete the sweep, commit, and exit.

## Objective

Discover fresh AI/Product Manager/Product Owner roles across UAE/India/Singapore portals that `scan.mjs` + `scrape-portals.mjs` cannot reach (search_queries in portals.yml + long-tail portals like Bayt/Naukrigulf/Indeed UAE/Gulftalent/Instahyre/Wellfound).

## Step 1 — Load context (REQUIRED, do this first)

Read these files to understand the candidate's targeting:
- `modes/_profile.md` — archetypes + target roles (PM-focused)
- `config/profile.yml` — location preferences, comp targets, domains, FAANG exclusions
- `portals.yml` — especially `title_filter` (positive + negative keywords), `freshness.max_age_days`, and all `search_queries` with `enabled: true`
- `data/scan-history.tsv` — dedup source; do NOT add URLs that already appear here

## Step 2 — Run WebSearches (25-30 total, in parallel batches of 5)

### Batch A: Domain-specific PM searches from portals.yml
Pick 8-12 highest-relevance entries from `search_queries` (domains: GenAI, CCaaS, CRM/Salesforce, IVA/Conversational AI, CX, AI Transformation, Martech/AdTech, B2B SaaS, Digital PM). Run them verbatim.

### Batch B: UAE portal sweeps
Run these 6 in parallel:
1. `site:bayt.com "Product Manager" OR "Product Owner" "AI" OR "GenAI" OR "CCaaS" Dubai OR UAE -"Principal" -"Director" 2026`
2. `site:bayt.com "Product Manager" OR "Product Owner" "CRM" OR "Salesforce" OR "Martech" Dubai OR UAE -"Principal" 2026`
3. `site:naukrigulf.com "Product Manager" OR "Senior Product Manager" "AI" OR "digital" Dubai OR UAE -"Principal" -"Director" 2026`
4. `site:gulftalent.com "Product Manager" OR "Product Owner" Dubai OR UAE -"Principal" -"Director" 2026`
5. `site:indeed.ae "Product Manager" OR "Product Owner" "AI" OR "CCaaS" OR "CRM" -"Principal" 2026`
6. `"Product Manager" OR "Product Owner" UAE OR Dubai "AI" OR "GenAI" OR "Conversational AI" site:linkedin.com/jobs 2026`

### Batch C: India portal sweeps
Run these 5 in parallel:
1. `site:naukri.com "Product Manager" OR "Product Owner" "Generative AI" OR "GenAI" Bangalore OR Remote -"Principal" -"Director" 2026`
2. `site:naukri.com "Product Manager" OR "Product Owner" "CCaaS" OR "Conversational AI" OR "IVA" Bangalore OR Remote -"Principal" 2026`
3. `site:instahyre.com "Product Manager" OR "Senior PM" "AI" OR "GenAI" Bangalore OR Remote 2026`
4. `site:hirist.tech "Product Manager" OR "Product Owner" "AI" OR "GenAI" Bangalore OR Remote 2026`
5. `"Product Manager" OR "Product Owner" "AI" OR "CCaaS" Bangalore OR India site:linkedin.com/jobs 2026`

### Batch D: Singapore + APAC sweep
Run these 3 in parallel:
1. `site:mycareersfuture.gov.sg "Product Manager" OR "Product Owner" "AI" OR "GenAI" -"Principal" -"Director" 2026`
2. `site:linkedin.com/jobs "Product Manager" OR "Product Owner" Singapore "AI" OR "CCaaS" -"Principal" -"Director" 2026`
3. `"AI Product Manager" OR "Senior AI PM" Singapore OR APAC -"Principal" -"Director" 2026`

## Step 3 — Apply filters

For every URL returned:

1. **Title filter (strict):** the role title must match `title_filter.positive` keywords in `portals.yml` AND NOT match any `title_filter.negative` keyword. Reject FAANG/MAANG roles (Google, Meta, Amazon, Apple, Netflix, Microsoft — see `config/profile.yml` exclusions).
2. **Seniority filter:** reject Principal, Director, VP, Head of, Chief — these are out of scope.
3. **Freshness filter:** reject anything obviously older than 7 days (check for dates in title/snippet; if unclear, keep and mark `postedAt: unknown`).
4. **Dedup:** reject if the URL already appears in `data/scan-history.tsv`.
5. **Location filter:** must be in UAE/Dubai/India/Bangalore/Singapore/APAC/Remote. Reject US-only, EU-only, Japan-only roles.

## Step 4 — Append results to pipeline.md + scan-history.tsv

For each surviving role:

1. Append to `data/scan-history.tsv` using the same format as `scan.mjs` output (tab-separated: date, source, company, title, url, location, postedAt).
2. Append to `data/pipeline.md` as a new row in the existing table. Use freshness emoji (🔥 if <3 days, ✅ if <7 days, ⚠️ if unknown). Include `Verification: unconfirmed (batch mode)` note in the notes column since Playwright isn't available in headless mode.

## Step 5 — Discover new ATS-supported companies (bonus)

If any search result points to a `boards.greenhouse.io/{slug}`, `jobs.ashbyhq.com/{slug}`, or `jobs.lever.co/{slug}` URL and the `{slug}` does not already appear in `portals.yml` tracked_companies:

1. Append a new entry to `portals.yml` under `tracked_companies:` with the correct `api:` URL so the NEXT day's `scan.mjs` picks it up automatically.
2. Include a short `notes:` field explaining what the company does.

## Step 6 — Write summary to sweep log

Append a summary block to `data/sweep.log` with today's date, format:

```
=== Sweep 2026-04-23 ===
Searches run: 28
Total URLs returned: ~280
After title/seniority/location filters: 47
After dedup: 19 new roles
New tracked_companies added: 2 (Company A, Company B)
Notable finds: Top 3 roles with company + title + URL.
```

## Step 7 — Commit and exit

1. `git add data/pipeline.md data/scan-history.tsv data/sweep.log portals.yml`
2. `git commit -m "sweep: $(date +%Y-%m-%d) — N new roles, M new tracked companies"` (fill in N and M from summary)
3. `git push`

## Hard rules

- **Do NOT create reports, CVs, or evaluations** — this is a discovery sweep, not an evaluation pass.
- **Do NOT message the user** — no human is reading.
- **Do NOT edit `modes/_shared.md`, `CLAUDE.md`, `scan.mjs`, or any other system/script file** — only the data files listed above + optionally `portals.yml`.
- **If any step fails, log the error to `data/sweep.log` and continue** — do not halt the entire sweep on a single search failure.
- **Budget: complete within 15 minutes.** If approaching 12 minutes, skip Batch D and commit what you have.

## Exit

After `git push`, exit cleanly. The outer `daily-scan.sh` will continue to the `purge-stale.mjs` step.

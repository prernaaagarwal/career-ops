# Daily Portal Sweep — Instructions for Headless Claude

You are running in headless mode (`claude -p`) as part of the 11 AM `daily-scan.sh` cron job. No human is watching. Complete the sweep, commit, and exit.

**Budget: 10 minutes total. Be fast, be concise.**

## Objective

Discover fresh AI/Product Manager/Product Owner roles across UAE/India/Singapore portals that `scan.mjs` + `scrape-portals.mjs` cannot reach.

## Step 1 — Load context (2 min max)

Read in parallel:
- `modes/_profile.md` — target roles + archetypes
- `portals.yml` — especially `title_filter.positive/negative` and `freshness.max_age_days`
- `data/scan-history.tsv` — last 200 lines only, for dedup

## Step 2 — Run 12 WebSearches in 3 parallel batches of 4 (5 min max)

### Batch A — UAE portals (run 4 in parallel)
1. `site:bayt.com "Product Manager" OR "Product Owner" "AI" OR "GenAI" OR "CCaaS" Dubai OR UAE -"Principal" -"Director" 2026`
2. `site:naukrigulf.com "Product Manager" OR "Senior Product Manager" "AI" OR "digital" Dubai OR UAE -"Principal" 2026`
3. `site:gulftalent.com "Product Manager" OR "Product Owner" Dubai OR UAE -"Principal" 2026`
4. `site:indeed.ae "Product Manager" OR "Product Owner" "AI" OR "CCaaS" OR "CRM" -"Principal" 2026`

### Batch B — India portals (run 4 in parallel)
5. `site:naukri.com "Product Manager" OR "Product Owner" "Generative AI" OR "GenAI" Bangalore OR Remote -"Principal" -"Director" 2026`
6. `site:naukri.com "Product Manager" OR "Product Owner" "CCaaS" OR "Conversational AI" Bangalore OR Remote -"Principal" 2026`
7. `site:instahyre.com "Product Manager" OR "Senior PM" "AI" OR "GenAI" Bangalore OR Remote 2026`
8. `site:hirist.tech "Product Manager" OR "Product Owner" "AI" OR "GenAI" Bangalore OR Remote 2026`

### Batch C — Singapore + LinkedIn (run 4 in parallel)
9. `site:mycareersfuture.gov.sg "Product Manager" OR "Product Owner" "AI" OR "GenAI" -"Principal" 2026`
10. `site:linkedin.com/jobs "Product Manager" OR "Product Owner" Singapore "AI" OR "CCaaS" -"Principal" 2026`
11. `site:linkedin.com/jobs "Product Manager" OR "Product Owner" Dubai OR UAE "AI" OR "GenAI" -"Principal" 2026`
12. `site:linkedin.com/jobs "Product Manager" OR "Product Owner" Bangalore "AI" OR "CCaaS" -"Principal" 2026`

## Step 3 — Filter + append (2 min max)

For every URL returned, apply in order:
1. Title matches `title_filter.positive`, does not match `title_filter.negative`
2. Reject FAANG (Google, Meta, Amazon, Apple, Netflix, Microsoft)
3. Reject seniority: Principal, Director, VP, Head of, Chief
4. Reject location: US-only, EU-only, Japan-only
5. Reject URLs already in `data/scan-history.tsv`

For survivors: append to `data/pipeline.md` (end of table) and `data/scan-history.tsv`. Include `Verification: unconfirmed (batch mode)` note.

## Step 4 — Discover new ATS companies (optional, skip if short on time)

If any URL is `job-boards.greenhouse.io/{slug}` or `jobs.lever.co/{slug}` where the slug isn't already in `portals.yml` tracked_companies: add a new entry with proper `api:` URL.

## Step 5 — Summary + commit (1 min max)

1. Append 5-line summary to `data/sweep.log`:
   ```
   === Sweep YYYY-MM-DD ===
   Searches: 12 | URLs returned: N | After filters: M | New: K | New companies added: C
   Top 3 finds: ...
   ```
2. `git add data/pipeline.md data/scan-history.tsv data/sweep.log portals.yml`
3. `git commit -m "sweep: YYYY-MM-DD — K new roles"` (or "nothing new" if K=0)
4. `git push`

## Hard rules

- **No reports, no CVs, no evaluations.** Discovery only.
- **No messaging the user.** Headless mode.
- **Do not edit** `modes/_shared.md`, `CLAUDE.md`, or any `.mjs` / `.sh` files.
- **If any step fails: log to sweep.log and continue.** Never halt the whole sweep.
- **If approaching 9 minutes without finishing: skip remaining searches, commit what you have, exit.**

## Exit

After `git push`, exit cleanly. Outer `daily-scan.sh` will continue to `purge-stale.mjs`.


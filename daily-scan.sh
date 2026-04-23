#!/bin/bash

# daily-scan.sh — runs both scans + purge at 11 AM daily
# Setup:
#   chmod +x daily-scan.sh
#   crontab -e  → add: 0 11 * * * cd ~/career-ops && ./daily-scan.sh >> data/scan.log 2>&1

set -e

cd "$(dirname "$0")"

echo ""
echo "═══════════════════════════════════════════════"
echo "  Daily Career-Ops Scan — $(date)"
echo "═══════════════════════════════════════════════"
echo ""

# 1. Pull latest config + data from git
echo "→ Pulling latest from git..."
git pull origin claude/understand-repo-purpose-ZDZhA || git pull

# 2. Company API scan (Greenhouse/Ashby/Lever APIs)
echo ""
echo "→ Running company scan (scan.mjs)..."
node scan.mjs

# 3. Website/portal scrape (Naukri, Bayt, MyCareersFuture via Playwright)
echo ""
echo "→ Running portal scrape (scrape-portals.mjs)..."
node scrape-portals.mjs

# 4. Purge stale (>7 days old) from pipeline.md
echo ""
echo "→ Purging stale entries (purge-stale.mjs)..."
node purge-stale.mjs

# 5. Commit and push results
echo ""
echo "→ Committing and pushing..."
git add -f data/pipeline.md data/scan-history.tsv
git commit -m "daily scan $(date +%Y-%m-%d)" || echo "  (nothing to commit)"
git push

echo ""
echo "✓ Daily scan complete — $(date)"
echo ""

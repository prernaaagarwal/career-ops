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

# 3b. Portal sweep via headless Claude (uses Claude Max subscription — no API cost)
# Covers: search_queries in portals.yml + Bayt/Naukrigulf/Gulftalent/Indeed UAE/Instahyre
# Discovers new ATS-supported companies and appends them to tracked_companies
echo ""
echo "→ Running portal sweep via claude -p (headless)..."
if command -v claude >/dev/null 2>&1; then
  sweep_success=false
  for attempt in 1 2 3; do
    echo "  attempt $attempt of 3..."
    if cat batch/daily-sweep-prompt.md | claude -p \
         --allowed-tools "WebSearch,Read,Write,Edit,Bash" \
         2>&1 | tee -a data/sweep.log; then
      sweep_success=true
      break
    fi
    echo "  attempt $attempt failed — backing off..."
    sleep $((attempt * 30))
  done
  if [ "$sweep_success" = false ]; then
    echo "  (portal sweep failed after 3 attempts — continuing with rest of pipeline)"
    echo "=== Sweep $(date +%Y-%m-%d) — FAILED after 3 retries ===" >> data/sweep.log
  fi
else
  echo "  (claude CLI not on PATH — skipping portal sweep)"
fi

# 4. Purge stale (>7 days old) from pipeline.md
echo ""
echo "→ Purging stale entries (purge-stale.mjs)..."
node purge-stale.mjs

# 5. Commit and push results
echo ""
echo "→ Committing and pushing..."
git add -f data/pipeline.md data/scan-history.tsv data/sweep.log
git commit -m "daily scan $(date +%Y-%m-%d)" || echo "  (nothing to commit)"
git push

echo ""
echo "✓ Daily scan complete — $(date)"
echo ""

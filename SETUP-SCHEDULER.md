# Daily 11 AM Scan — Setup Guide (Mac)

Schedule `daily-scan.sh` to run automatically at 11 AM every day. Two options — **launchd is recommended**, cron is the fallback.

---

## Option 1: launchd (recommended)

**Why:** macOS's modern scheduler. Catches up if your Mac was asleep at 11 AM. No permission issues.

### One-time setup (5 minutes)

Open Terminal and run these commands:

```bash
# 1. Make sure the script is executable
cd ~/career-ops
chmod +x daily-scan.sh

# 2. Copy the plist to your LaunchAgents folder
cp templates/career-ops.plist ~/Library/LaunchAgents/com.prernaa.career-ops.daily-scan.plist

# 3. Load the job into launchd
launchctl load ~/Library/LaunchAgents/com.prernaa.career-ops.daily-scan.plist

# 4. Verify it's loaded
launchctl list | grep career-ops
```

You should see a line like:
```
-	0	com.prernaa.career-ops.daily-scan
```

The middle column is the last exit status. `0` = success, anything else = failure. Since the job hasn't run yet, you may see `-`. That's fine.

### Test it manually

```bash
cd ~/career-ops
./daily-scan.sh
```

If it completes without errors, launchd will run the same thing at 11 AM every day.

### Checking it ran

Each morning after 11 AM, check:

```bash
tail -50 ~/career-ops/data/scan.log        # full output
tail -20 ~/career-ops/data/sweep.log       # Claude portal sweep summary
git -C ~/career-ops log --oneline -5       # recent scan commits
```

### Turn it off temporarily

```bash
launchctl unload ~/Library/LaunchAgents/com.prernaa.career-ops.daily-scan.plist
```

### Turn it back on

```bash
launchctl load ~/Library/LaunchAgents/com.prernaa.career-ops.daily-scan.plist
```

### Remove it permanently

```bash
launchctl unload ~/Library/LaunchAgents/com.prernaa.career-ops.daily-scan.plist
rm ~/Library/LaunchAgents/com.prernaa.career-ops.daily-scan.plist
```

---

## Option 2: cron (fallback)

Use this only if launchd gives you trouble.

### One-time setup

```bash
cd ~/career-ops
chmod +x daily-scan.sh
crontab -e
```

When the editor opens, add this line and save:

```
0 11 * * * cd $HOME/career-ops && ./daily-scan.sh >> data/scan.log 2>&1
```

Verify:

```bash
crontab -l
```

### macOS Full Disk Access (IMPORTANT — cron only)

macOS blocks cron from reading files without Full Disk Access. Enable it:

1. Apple menu → **System Settings** → **Privacy & Security** → **Full Disk Access**
2. Click the `+` button
3. Press `Cmd + Shift + G` and type `/usr/sbin/cron`
4. Select `cron`, click **Open**
5. Enable the toggle next to `cron`

Without this step, cron will fail silently.

### Remove the cron entry

```bash
crontab -e
# delete the career-ops line, save
```

---

## What the daily scan does

Every day at 11 AM, `daily-scan.sh` runs these steps in order:

1. **git pull** — get your latest config from GitHub
2. **scan.mjs** — hit 171 company APIs (Greenhouse/Ashby/Lever) for fresh PM/AI roles
3. **scrape-portals.mjs** — Playwright scrape of Naukri, Bayt, MyCareersFuture
4. **claude -p portal sweep** — headless Claude runs WebSearches across Bayt/Naukrigulf/Gulftalent/Indeed UAE/Instahyre + the 50 search_queries in portals.yml. Adds new roles to pipeline.md. Discovers new companies with Greenhouse/Ashby/Lever boards and appends them to tracked_companies for tomorrow's scan.
5. **purge-stale.mjs** — drop roles older than 7 days from pipeline.md
6. **git commit + push** — sync findings back to GitHub

Total runtime: 10-20 minutes. Runs in the background; you don't need to be doing anything.

---

## Requirements

- **Node.js** installed (for `scan.mjs`, `scrape-portals.mjs`, `purge-stale.mjs`)
- **Playwright** installed (`npx playwright install chromium` — for portal scrapes)
- **Claude Code CLI** installed and authenticated (for the portal sweep step) — the sweep uses your Claude Max subscription, no API tokens
- **Git** authenticated (SSH key or HTTPS token) — for pulling/pushing

If `claude` CLI is not installed or not on PATH, step 4 (portal sweep) silently skips and the rest of the scan continues normally.

---

## Troubleshooting

**Scan didn't run overnight:**
- Check if Mac was awake at 11 AM. launchd catches up at next wake; cron just skips the missed run.
- `launchctl list | grep career-ops` — check for a non-zero exit status.
- `tail -100 ~/career-ops/data/scan.log` — look for errors.

**Portal sweep (step 4) keeps failing:**
- Your `claude` CLI auth may have expired. Run `claude` interactively once to re-authenticate.
- Check `~/career-ops/data/sweep.log` for specific errors.

**pipeline.md has duplicate entries:**
- Run `node dedup-tracker.mjs` manually to clean up.

**Want to see what the sweep would do without committing:**
- Edit `daily-scan.sh` and change `git push` to `git push --dry-run` for one day's test.

#!/usr/bin/env bash
# Dipanggil cron di VPS. Contoh crontab (tiap 4 jam):
#   0 */4 * * * /home/USER/SceneFinder/worker/run.sh >> /home/USER/scenefinder.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --rebase --autostash --quiet
node worker/scrape.mjs

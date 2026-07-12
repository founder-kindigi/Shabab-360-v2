#!/bin/bash
cd /home/z/my-project
while true; do
  NODE_OPTIONS="--max-old-space-size=256" bun .next/standalone/server.js -p 3000 2>>/tmp/server-errors.log
  exit_code=$?
  echo "[$(date)] Server exited with code $exit_code, restarting..." >> dev.log
  # Brief pause to avoid rapid restart loop
  sleep 1
done

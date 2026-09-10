#!/bin/sh
set -eu
task_root=/mnt/d/iBuild/Shabab-360-v2
runtime_root="$task_root/.next/astra-native-postgres/runtime"
export LD_LIBRARY_PATH="$runtime_root/usr/lib/x86_64-linux-gnu"
pg_bin="$runtime_root/usr/lib/postgresql/18/bin"
pg_data=$(cat "$task_root/.next/astra-native-postgres/data-directory.txt")
case "$pg_data" in /tmp/shabab-astra-postgres-*) ;; *) echo "Unexpected disposable cluster path" >&2; exit 1;; esac
[ "$(realpath "$pg_data")" = "$pg_data" ] || exit 1
[ -f "$pg_data/PG_VERSION" ] || exit 1
"$pg_bin/pg_ctl" -D "$pg_data" -m fast -w stop
printf '{"stopped":true,"preservedData":true,"endpoint":"127.0.0.1:54391","checkedAt":"%s"}
' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$task_root/docs/reviews/v2-audit-2026-09-08/astra-native-stop-results.json"

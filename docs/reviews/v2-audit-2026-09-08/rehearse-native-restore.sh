#!/bin/sh
set -eu
task_root=/mnt/d/iBuild/Shabab-360-v2
runtime_root="$task_root/.next/astra-native-postgres/runtime"
export LD_LIBRARY_PATH="$runtime_root/usr/lib/x86_64-linux-gnu"
export PGHOST=127.0.0.1 PGPORT=54391 PGUSER=astra_verify
pg_bin="$runtime_root/usr/lib/postgresql/18/bin"
restore_db="astra_synthetic_restore_$(date +%s)"
"$pg_bin/pg_dump" --format=custom --file="$task_root/.next/astra-native-postgres/synthetic-backup.dump" astra_synthetic_review
"$pg_bin/psql" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $restore_db"
"$pg_bin/pg_restore" --exit-on-error --dbname="$restore_db" "$task_root/.next/astra-native-postgres/synthetic-backup.dump"
printf '%s\n' "$restore_db" > "$task_root/.next/astra-native-postgres/restored-database.txt"
printf 'Synthetic backup restored into %s\n' "$restore_db"

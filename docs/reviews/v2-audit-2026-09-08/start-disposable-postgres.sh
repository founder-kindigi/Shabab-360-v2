#!/bin/sh
set -eu
task_root=/mnt/d/iBuild/Shabab-360-v2
runtime_root="$task_root/.next/astra-native-postgres/runtime"
export LD_LIBRARY_PATH="$runtime_root/usr/lib/x86_64-linux-gnu"
pg_bin="$runtime_root/usr/lib/postgresql/18/bin"
pg_data=$(mktemp -d /tmp/shabab-astra-postgres-XXXXXXXX)
"$pg_bin/initdb" -D "$pg_data" -L "$runtime_root/usr/share/postgresql/18" --username=astra_verify --auth=trust --no-locale --encoding=UTF8 > "$task_root/.next/astra-native-postgres/init.log"
"$pg_bin/pg_ctl" -D "$pg_data" -l "$pg_data/server.log" -o "-h 127.0.0.1 -p 54391 -k $pg_data" -w start
printf '%s\n' "$pg_data" > "$task_root/.next/astra-native-postgres/data-directory.txt"
"$pg_bin/psql" -h 127.0.0.1 -p 54391 -U astra_verify -d postgres -v ON_ERROR_STOP=1 -c 'CREATE DATABASE astra_synthetic_review'
"$pg_bin/psql" -h 127.0.0.1 -p 54391 -U astra_verify -d astra_synthetic_review -Atc 'SELECT version()'

#!/bin/bash
set -e

DUMP_FILE="/docker-entrypoint-initdb.d/rds_tfa_dev.pgdump"

if [ -f "$DUMP_FILE" ]; then
  echo "Restoring database from rds_tfa_dev.pgdump..."
  pg_restore -v --no-owner --no-acl --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" "$DUMP_FILE"
else
  echo "No rds_tfa_dev.pgdump found — starting with empty database."
fi

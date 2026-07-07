#!/bin/bash
set -e

ENV_FILE="$(dirname "$0")/../api/.env.local"

if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
else
  echo "Error: .env.local not found at $ENV_FILE"
  exit 1
fi

# Creates a new container 

docker run \
  --name tfa-dev \
  -e POSTGRES_USER="${DB_USER}" \
  -e POSTGRES_PASSWORD="${DB_PASSWORD}" \
  -e POSTGRES_DB="${DB_NAME}" \
  -p 5432:5432 \
  tfa-dev

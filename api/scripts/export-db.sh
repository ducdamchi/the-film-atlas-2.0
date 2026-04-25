#!/bin/bash

echo "📦 Exporting local database..."

# Load environment variables from .env
set -a
source ../api/.env.local
set +a

# Export database
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > ../api/database-backup.sql

if [ $? -eq 0 ]; then
    echo "✅ Database exported to database-backup.sql"
else
    echo "❌ Database export failed"
    exit 1
fi
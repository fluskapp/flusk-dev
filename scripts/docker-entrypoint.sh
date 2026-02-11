#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npx tsx scripts/migrate.ts

echo "🚀 Starting Flusk server..."
exec npx tsx server.ts

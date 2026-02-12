#!/bin/sh
set -e

echo "🔄 Running migrations..."
node --import tsx server.ts --migrate-only || {
  echo "⚠️ Migration failed, continuing anyway..."
}

echo "🚀 Starting Flusk server..."
exec node --import tsx server.ts

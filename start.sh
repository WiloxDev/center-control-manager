#!/usr/bin/env bash
set -e

PORT=${PORT:-3099}
echo "Starting Center Control Manager on port $PORT..."
exec node --experimental-strip-types src/server.ts

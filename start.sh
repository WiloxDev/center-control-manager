#!/usr/bin/env bash
set -e

PORT=${PORT:-3099}
echo "Starting SIO Mission Control on port $PORT..."
exec node --experimental-strip-types src/server.ts

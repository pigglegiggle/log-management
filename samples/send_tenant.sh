#!/bin/bash

API_URL="http://localhost:3000/ingest"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/tenant.json"

curl -s -X POST "$API_URL" \
     -H "Content-Type: application/json" \
     -d @"$LOG_FILE"

echo
echo "Logs from $LOG_FILE sent successfully"

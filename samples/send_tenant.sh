#!/bin/bash

API_URL="http://localhost:3000/ingest"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/tenants.json"

# ส่งทีละ event จาก tenants.json
jq -c '.[]' "$LOG_FILE" | while read -r line; do
  curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "$line"
done

echo
echo "Logs from $LOG_FILE sent successfully"

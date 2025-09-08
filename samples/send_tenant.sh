#!/bin/bash

API_URL="http://localhost:3000/ingest"

LOG_FILE="crowdstrike.json"

curl -s -X POST "$API_URL" \
     -H "Content-Type: application/json" \
     -d @"$LOG_FILE"

echo
echo "Log from $LOG_FILE sent successfully"

#!/bin/bash
set -e
PHONE="137$(date +%s | rev | cut -c1-8 | rev)"
REG=$(curl -s -X POST http://127.0.0.1:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$PHONE\",\"password\":\"Test123456\",\"nickname\":\"loc\"}")
TOKEN=$(echo "$REG" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
AUTH="Authorization: Bearer $TOKEN"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "=== start session ==="
curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"mode":"precise","duration":"1h"}' \
  http://127.0.0.1:8000/api/location/session/start
echo
echo "=== upload point ==="
curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"latitude\":39.9042,\"longitude\":116.4074,\"accuracy\":10,\"recorded_at\":\"$NOW\"}" \
  http://127.0.0.1:8000/api/location/points
echo
echo "=== history ==="
curl -s -H "$AUTH" "http://127.0.0.1:8000/api/location/points/history?days=7"
echo
echo "=== current sessions ==="
curl -s -H "$AUTH" http://127.0.0.1:8000/api/location/session/current
echo

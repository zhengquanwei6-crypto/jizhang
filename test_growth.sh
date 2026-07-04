#!/bin/bash
set -e
PHONE="138$(date +%s | rev | cut -c1-8 | rev)"
REG=$(curl -s -X POST http://127.0.0.1:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$PHONE\",\"password\":\"Test123456\",\"nickname\":\"grow\"}")
TOKEN=$(echo "$REG" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
AUTH="Authorization: Bearer $TOKEN"
echo "=== pet ==="
curl -s -H "$AUTH" http://127.0.0.1:8000/api/growth/pet
echo
echo "=== interact feed ==="
curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"event_type":"feed","exp_delta":10,"description":"给宠物喂食"}' \
  http://127.0.0.1:8000/api/growth/events
echo
echo "=== pet after ==="
curl -s -H "$AUTH" http://127.0.0.1:8000/api/growth/pet
echo

#!/bin/bash
set -e
curl -s http://127.0.0.1:8000/api/health
echo
PHONE="139$(date +%s | rev | cut -c1-8 | rev)"
REG=$(curl -s -X POST http://127.0.0.1:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$PHONE\",\"password\":\"Test123456\",\"nickname\":\"test\"}")
echo "$REG" | head -c 300
echo
TOKEN=$(echo "$REG" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")
echo "token_len=${#TOKEN}"
curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8000/api/ledger/summary
echo
curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8000/api/couple/me
echo
cp /root/CoupleSpaceAI/app/build/outputs/apk/debug/app-debug.apk /var/www/couplespace/app-debug.apk
ls -lh /var/www/couplespace/app-debug.apk

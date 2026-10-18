#!/usr/bin/env bash
set -u
ROOT="$HOME/Downloads/mediflow-pharmacy"
cd "$ROOT"

hr() { echo; echo "── $1 ──"; }

hr "1. Cron (6:30 PM)"
if crontab -l 2>/dev/null | grep -q "30 18 .*start-market.sh"; then
  echo "OK  cron set for 18:30"
else
  ( crontab -l 2>/dev/null | grep -v "start-market.sh" ; echo "30 18 * * * $ROOT/scripts/start-market.sh >> $ROOT/logs/cron.log 2>&1" ) | crontab -
  echo "FIXED  cron set to 18:30"
fi

hr "2. Backend files"
for f in sms.js reminders.js insurance.js; do
  if [ -s "backend/src/$f" ]; then
    echo "OK  $f ($(wc -l < backend/src/$f) lines)"
  else
    echo "MISSING  backend/src/$f"
  fi
done

hr "3. .env SMS block"
echo "SMS_PROVIDER: $(grep -E '^SMS_PROVIDER=' backend/.env | cut -d= -f2)"
echo "AT_USERNAME:  $(grep -E '^AT_USERNAME=' backend/.env | cut -d= -f2)"
keylen=$(awk -F= '/^AT_API_KEY=/ {print length($2)}' backend/.env)
if [ "$keylen" -ge 40 ]; then
  echo "AT_API_KEY length: $keylen  OK"
else
  echo "AT_API_KEY length: $keylen  ** NEEDS REAL KEY **"
  echo "  Run:  cd $ROOT && awk -v k='atsk_YOUR_REAL_KEY' '/^AT_API_KEY=/ {print \"AT_API_KEY=\" k; next} {print}' backend/.env > /tmp/mf.env && mv /tmp/mf.env backend/.env"
fi

hr "4. Frontend files"
for f in Patients.vue PatientDetail.vue Sales.vue Insurances.vue InsuranceClaims.vue Reminders.vue; do
  if [ -s "frontend/src/views/$f" ]; then
    echo "OK  $f"
  else
    echo "MISSING  frontend/src/views/$f"
  fi
done

hr "5. Frontend wiring"
grep -q "insurance_id" frontend/src/views/Patients.vue && echo "OK  Patients.vue has insurance fields" || echo "MISSING  insurance fields in Patients.vue"
grep -q "insurance_code" frontend/src/views/PatientDetail.vue && echo "OK  PatientDetail.vue shows insurance" || echo "MISSING  insurance on PatientDetail.vue"
grep -q "payment_method" frontend/src/views/Sales.vue && echo "OK  Sales.vue has payment method" || echo "MISSING  payment_method in Sales.vue"
grep -q "insuranceClaims" frontend/src/router.js && echo "OK  router has claims route" || echo "MISSING  claims route"
grep -q "insuranceClaims" frontend/src/components/AppLayout.vue && echo "OK  sidebar has Claims" || echo "MISSING  Claims in sidebar"
grep -q "reminders" frontend/src/router.js && echo "OK  router has reminders route" || echo "MISSING  reminders route"
grep -q "name: 'reminders'" frontend/src/components/AppLayout.vue && echo "OK  sidebar has Reminders" || echo "MISSING  Reminders in sidebar"

hr "6. Backend routes"
rc=$(grep -c "insurance-claims\|app.post('/api/reminders'\|app.post('/api/sms/test'" backend/src/server.js)
echo "routes present: $rc (expect >= 6)"

hr "7. Build frontend"
cd frontend && npm run build 2>&1 | tail -3
cd "$ROOT"

hr "8. Restart backend + frontend"
pkill -f 'node src/server.js' 2>/dev/null || true
pkill -f 'vite preview' 2>/dev/null || true
pkill -f 'node --watch' 2>/dev/null || true
pkill -f 'vite --host' 2>/dev/null || true
sleep 2
"$ROOT/scripts/start-market.sh" || true

hr "9. Verify"
sleep 2
curl -s -o /dev/null -w "frontend: %{http_code}\n" http://127.0.0.1:5173/
curl -s -o /dev/null -w "backend:  %{http_code}\n" http://localhost:4000/api/health

hr "Done"
echo "App URL: http://127.0.0.1:5173/"
echo "Login:   iraguhashima@gmail.com / Mediflow2026"

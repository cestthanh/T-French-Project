#!/usr/bin/env bash
# Public enquiry submission and the admin-only follow-up workflow.
#
# Idempotent: each run uses a fresh email address and deletes the lead it made.
set -u
cd "$(dirname "$0")"
. ./lib.sh

login_seeded_users
EMAIL="phuhuynh$$@gmail.com"

echo "1. Public submission"
check "anonymous visitor can submit" "200" \
  "$(status -X POST "$API/leads" -H "Content-Type: application/json" \
     -d "{\"fullName\":\"Nguyen Thi Mai\",\"email\":\"$EMAIL\",\"phoneNumber\":\"0912345678\",\"message\":\"Em muon tim hieu lo trinh du hoc Phap.\",\"interest\":\"Tu van tu trang chu\"}")"
check "empty submission is rejected" "400" \
  "$(status -X POST "$API/leads" -H "Content-Type: application/json" \
     -d '{"fullName":"","email":"","message":""}')"
echo

echo "2. Repeat guard"
# A second send inside the window gets the same 200, and must not create a
# second row — see RepeatWindow in LeadsController.
curl -s -o /dev/null -X POST "$API/leads" -H "Content-Type: application/json" \
  -d "{\"fullName\":\"Nguyen Thi Mai\",\"email\":\"$EMAIL\",\"message\":\"Gui lai lan nua.\"}"
COUNT=$(curl -s "$API/leads?search=$EMAIL" -H "Authorization: Bearer $ADMIN" |
        grep -o '"id":' | wc -l | tr -d ' ')
check "second send within the window is not duplicated" "1" "$COUNT"
echo

echo "3. Admin-only reads"
check "admin can list" "200" "$(status "$API/leads" -H "Authorization: Bearer $ADMIN")"
check "student cannot list" "403" "$(status "$API/leads" -H "Authorization: Bearer $STUDENT")"
check "teacher cannot list" "403" "$(status "$API/leads" -H "Authorization: Bearer $TEACHER")"
check "anonymous cannot list" "401" "$(status "$API/leads")"
check "student cannot read stats" "403" "$(status "$API/leads/stats" -H "Authorization: Bearer $STUDENT")"
echo

echo "4. Follow-up workflow"
LEAD_ID=$(curl -s "$API/leads?search=$EMAIL" -H "Authorization: Bearer $ADMIN" |
          sed -n 's/.*"id":\([0-9]*\).*/\1/p' | head -1)
echo "  (lead #$LEAD_ID)"

RESP=$(curl -s -X PATCH "$API/leads/$LEAD_ID" -H "Authorization: Bearer $ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"status":"Contacted","note":"Da goi, hen tu van lai thu 5."}')
case "$RESP" in
  *Contacted*) check "admin moves it to Contacted" "ok" "ok" ;;
  *)           check "admin moves it to Contacted" "ok" "$RESP" ;;
esac

STATS=$(curl -s "$API/leads/stats" -H "Authorization: Bearer $ADMIN")
echo "  stats: $STATS"
case "$STATS" in
  *'"contacted":0'*) check "stats count the move" "ok" "contacted still 0" ;;
  *'"contacted":'*)  check "stats count the move" "ok" "ok" ;;
  *)                 check "stats count the move" "ok" "$STATS" ;;
esac

check "status filter excludes it now" "[]" \
  "$(curl -s "$API/leads?status=New&search=$EMAIL" -H "Authorization: Bearer $ADMIN")"
check "student cannot change status" "403" \
  "$(status -X PATCH "$API/leads/$LEAD_ID" -H "Authorization: Bearer $STUDENT" \
     -H "Content-Type: application/json" -d '{"status":"Closed"}')"
echo

echo "5. Delete"
check "student cannot delete" "403" \
  "$(status -X DELETE "$API/leads/$LEAD_ID" -H "Authorization: Bearer $STUDENT")"
check "admin can delete" "204" \
  "$(status -X DELETE "$API/leads/$LEAD_ID" -H "Authorization: Bearer $ADMIN")"
echo

summary

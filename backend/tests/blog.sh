#!/usr/bin/env bash
# Creating and editing blog posts, including the slug-collision rules.
#
# Idempotent: slugs are suffixed with the shell PID and both posts are deleted
# at the end.
set -u
cd "$(dirname "$0")"
. ./lib.sh

login_seeded_users
SLUG="bai-test-$$"

echo "1. Create"
NEW=$(curl -s -X POST "$API/admin/blog" -H "Authorization: Bearer $ADMIN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Bai viet goc\",\"slug\":\"$SLUG\",\"summary\":\"Tom tat goc\",\"content\":\"<p>Noi dung goc</p>\",\"tags\":\"Du hoc\",\"isPublished\":true}")
POST_ID=$(rowid "$NEW")
if [ -n "$POST_ID" ]; then check "admin creates a post" "ok" "ok"; else check "admin creates a post" "ok" "$NEW"; fi

check "duplicate slug is a 409, not a 500" "409" \
  "$(status -X POST "$API/admin/blog" -H "Authorization: Bearer $ADMIN" \
     -H "Content-Type: application/json" \
     -d "{\"title\":\"Trung slug\",\"slug\":\"$SLUG\",\"content\":\"<p>x</p>\"}")"
echo

echo "2. Fetch for editing"
DETAIL=$(curl -s "$API/admin/blog/$POST_ID" -H "Authorization: Bearer $ADMIN")
case "$DETAIL" in
  *"Noi dung goc"*) check "detail includes the body" "ok" "ok" ;;
  *)                check "detail includes the body" "ok" "$DETAIL" ;;
esac
case "$DETAIL" in
  *"Tom tat goc"*) check "detail includes the summary" "ok" "ok" ;;
  *)               check "detail includes the summary" "ok" "missing" ;;
esac

PUBLISHED_BEFORE=$(echo "$DETAIL" | sed -n 's/.*"publishedAt":"\([^"]*\)".*/\1/p')
echo "  publishedAt before edit: $PUBLISHED_BEFORE"

check "teacher cannot read admin blog detail" "403" \
  "$(status "$API/admin/blog/$POST_ID" -H "Authorization: Bearer $TEACHER")"
echo

echo "3. Update"
UPD=$(curl -s -X PUT "$API/admin/blog/$POST_ID" -H "Authorization: Bearer $ADMIN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Bai viet da sua\",\"slug\":\"$SLUG\",\"summary\":\"Tom tat moi\",\"content\":\"<p>Noi dung moi</p>\",\"tags\":\"Du hoc,DELF\",\"isPublished\":true}")
case "$UPD" in
  *"da sua"*) check "title is updated" "ok" "ok" ;;
  *)          check "title is updated" "ok" "$UPD" ;;
esac
case "$UPD" in
  *updatedAt*) check "updatedAt is stamped" "ok" "ok" ;;
  *)           check "updatedAt is stamped" "ok" "missing" ;;
esac

AFTER=$(curl -s "$API/admin/blog/$POST_ID" -H "Authorization: Bearer $ADMIN")
case "$AFTER" in
  *"Noi dung moi"*) check "body really changed" "ok" "ok" ;;
  *)                check "body really changed" "ok" "unchanged" ;;
esac

# PublishedAt means "when this first went live". Revising an article must not
# claim it was published today.
check "editing does not move publishedAt" "$PUBLISHED_BEFORE" \
  "$(echo "$AFTER" | sed -n 's/.*"publishedAt":"\([^"]*\)".*/\1/p')"

check "teacher cannot edit" "403" \
  "$(status -X PUT "$API/admin/blog/$POST_ID" -H "Authorization: Bearer $TEACHER" \
     -H "Content-Type: application/json" \
     -d "{\"title\":\"x\",\"slug\":\"$SLUG\",\"content\":\"<p>x</p>\"}")"
check "unknown post is a 404" "404" \
  "$(status -X PUT "$API/admin/blog/999999" -H "Authorization: Bearer $ADMIN" \
     -H "Content-Type: application/json" \
     -d '{"title":"x","slug":"khong-ton-tai","content":"<p>x</p>"}')"
echo

echo "4. Slug collision on update"
OTHER=$(curl -s -X POST "$API/admin/blog" -H "Authorization: Bearer $ADMIN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Bai khac\",\"slug\":\"khac-$SLUG\",\"content\":\"<p>y</p>\"}")
OTHER_ID=$(rowid "$OTHER")

check "taking another post's slug is a 409" "409" \
  "$(status -X PUT "$API/admin/blog/$OTHER_ID" -H "Authorization: Bearer $ADMIN" \
     -H "Content-Type: application/json" \
     -d "{\"title\":\"Bai khac\",\"slug\":\"$SLUG\",\"content\":\"<p>y</p>\"}")"
# The collision check must exclude the post being edited, or nothing could ever
# be saved twice.
check "keeping its own slug is fine" "200" \
  "$(status -X PUT "$API/admin/blog/$OTHER_ID" -H "Authorization: Bearer $ADMIN" \
     -H "Content-Type: application/json" \
     -d "{\"title\":\"Bai khac sua\",\"slug\":\"khac-$SLUG\",\"content\":\"<p>y2</p>\"}")"
echo

echo "5. Cleanup"
curl -s -o /dev/null -X DELETE "$API/admin/blog/$POST_ID" -H "Authorization: Bearer $ADMIN"
curl -s -o /dev/null -X DELETE "$API/admin/blog/$OTHER_ID" -H "Authorization: Bearer $ADMIN"
echo "  (test posts removed)"
echo

summary

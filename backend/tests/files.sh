#!/usr/bin/env bash
# Who can download which file — the access rules in FilesController.CanAccessAsync.
#
# Idempotent: every run registers its own users, so it can be run repeatedly
# against the same database without resetting it.
set -u
cd "$(dirname "$0")"
. ./lib.sh

login_seeded_users

# Scratch fixtures go somewhere disposable, not into the repo.
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
echo "giao trinh A1" > "$WORK/sample.pdf"
printf 'MZ\x90\x00' > "$WORK/evil.exe"

# An outsider: authenticated, but enrolled in nothing.
OUTSIDER_EMAIL="outsider$$@test.vn"
register "$OUTSIDER_EMAIL" Outsider@123 "Nguoi La"
OUTSIDER=$(token "$OUTSIDER_EMAIL" Outsider@123)

echo "1. Upload validation"
UP=$(curl -s -X POST "$API/files" -H "Authorization: Bearer $TEACHER" -F "file=@$WORK/sample.pdf")
FILE_PUBLIC=$(pubid "$UP")
FILE_ID=$(rowid "$UP")
if [ -n "$FILE_PUBLIC" ]; then check "teacher uploads .pdf" "ok" "ok"; else check "teacher uploads .pdf" "ok" "$UP"; fi

check ".exe is rejected" "400" \
  "$(status -X POST "$API/files" -H "Authorization: Bearer $TEACHER" -F "file=@$WORK/evil.exe")"
check "anonymous upload is rejected" "401" \
  "$(status -X POST "$API/files" -F "file=@$WORK/sample.pdf")"
echo

echo "2. Download authorisation — private course material"
RES=$(curl -s -X POST "$API/resources" -H "Authorization: Bearer $TEACHER" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Giao trinh noi bo\",\"fileId\":$FILE_ID,\"isPublic\":false,\"courseId\":1}")
echo "  (resource #$(rowid "$RES") created)"

check "uploader (teacher) can download" "200" \
  "$(status "$API/files/$FILE_PUBLIC" -H "Authorization: Bearer $TEACHER")"
check "admin can download" "200" \
  "$(status "$API/files/$FILE_PUBLIC" -H "Authorization: Bearer $ADMIN")"
check "enrolled student can download" "200" \
  "$(status "$API/files/$FILE_PUBLIC" -H "Authorization: Bearer $STUDENT")"
check "NON-enrolled user is blocked" "403" \
  "$(status "$API/files/$FILE_PUBLIC" -H "Authorization: Bearer $OUTSIDER")"
check "anonymous download is blocked" "401" "$(status "$API/files/$FILE_PUBLIC")"
check "unknown file id is 404" "404" \
  "$(status "$API/files/00000000-0000-0000-0000-000000000001" -H "Authorization: Bearer $STUDENT")"
echo

echo "3. Download response"
check "bytes round-trip unchanged" "giao trinh A1" \
  "$(curl -s "$API/files/$FILE_PUBLIC" -H "Authorization: Bearer $TEACHER")"

DISP=$(curl -s -D - -o /dev/null "$API/files/$FILE_PUBLIC" -H "Authorization: Bearer $TEACHER" |
       tr -d '\r' | sed -n 's/^[Cc]ontent-[Dd]isposition: //p')
echo "  content-disposition: $DISP"
case "$DISP" in
  attachment*) check "served as an attachment" "yes" "yes" ;;
  *)           check "served as an attachment" "yes" "no" ;;
esac
echo

echo "4. Cross-user file claim"
# Attaching a file id you do not own would let a teacher publish someone else's
# private upload as public course material.
STU_UP=$(curl -s -X POST "$API/files" -H "Authorization: Bearer $STUDENT" -F "file=@$WORK/sample.pdf")
check "teacher cannot attach a student's file" "400" \
  "$(status -X POST "$API/resources" -H "Authorization: Bearer $TEACHER" \
     -H "Content-Type: application/json" \
     -d "{\"title\":\"Muon file nguoi khac\",\"fileId\":$(rowid "$STU_UP"),\"isPublic\":true}")"
echo

echo "5. Submission privacy"
# A student registered for this run only. Reusing the seeded one would hit the
# "already submitted" conflict on a second run, leaving the uploaded file
# attached to nothing — the teacher would then be refused correctly, and the
# test would fail for the wrong reason.
FRESHER_EMAIL="hocvien$$@test.vn"
register "$FRESHER_EMAIL" Fresher@123 "Hoc Vien Moi"
FRESHER=$(token "$FRESHER_EMAIL" Fresher@123)
curl -s -o /dev/null -X POST "$API/courses/1/enroll" -H "Authorization: Bearer $FRESHER"

ASSIGN_ID=$(curl -s "$API/assignments" -H "Authorization: Bearer $FRESHER" |
            sed -n 's/.*"id":\([0-9]*\).*/\1/p' | head -1)
echo "  (assignment #$ASSIGN_ID)"

FRESH_UP=$(curl -s -X POST "$API/files" -H "Authorization: Bearer $FRESHER" -F "file=@$WORK/sample.pdf")
FRESH_PUBLIC=$(pubid "$FRESH_UP")

SUB=$(curl -s -X POST "$API/assignments/$ASSIGN_ID/submit" -H "Authorization: Bearer $FRESHER" \
  -H "Content-Type: application/json" \
  -d "{\"fileId\":$(rowid "$FRESH_UP"),\"fileUrl\":null,\"note\":\"bai nop cua em\"}")
case "$SUB" in
  *'"id"'*) check "student submits with a file" "ok" "ok" ;;
  *)        check "student submits with a file" "ok" "$SUB" ;;
esac

check "student reads own submission file" "200" \
  "$(status "$API/files/$FRESH_PUBLIC/info" -H "Authorization: Bearer $FRESHER")"
check "course teacher can read the submission" "200" \
  "$(status "$API/files/$FRESH_PUBLIC" -H "Authorization: Bearer $TEACHER")"
check "a classmate on the same course cannot" "403" \
  "$(status "$API/files/$FRESH_PUBLIC" -H "Authorization: Bearer $STUDENT")"
check "a non-enrolled user cannot" "403" \
  "$(status "$API/files/$FRESH_PUBLIC" -H "Authorization: Bearer $OUTSIDER")"
echo

echo "6. Enrolment is required to submit"
check "non-enrolled student cannot submit" "403" \
  "$(status -X POST "$API/assignments/$ASSIGN_ID/submit" \
     -H "Authorization: Bearer $OUTSIDER" -H "Content-Type: application/json" \
     -d '{"fileId":null,"fileUrl":null,"note":"em khong hoc khoa nay"}')"
echo

echo "7. Assignment detail leaks nothing"
DETAIL=$(curl -s "$API/assignments/$ASSIGN_ID" -H "Authorization: Bearer $TEACHER")
case "$DETAIL" in
  *passwordHash*|*PasswordHash*) check "no passwordHash in payload" "clean" "LEAKED" ;;
  *)                             check "no passwordHash in payload" "clean" "clean" ;;
esac

# A student must not see a classmate's mark through the detail endpoint.
DETAIL=$(curl -s "$API/assignments/$ASSIGN_ID" -H "Authorization: Bearer $FRESHER")
check "student sees only their own submission" "1" \
  "$(echo "$DETAIL" | grep -o '"studentId"' | wc -l | tr -d ' ')"
echo

summary

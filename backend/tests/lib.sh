#!/usr/bin/env bash
# Shared helpers for the API smoke tests. Sourced, never run directly.
#
# These are end-to-end tests: they talk to a running API over HTTP and assert on
# status codes. That is deliberate — what they check is authorisation, and
# authorisation is a property of the whole request pipeline (JWT parsing, role
# claims, the [Authorize] attributes, the controller's own checks). A unit test
# on a controller method would mock away most of what can go wrong.

# Default matches Properties/launchSettings.json, so `dotnet run` with no
# arguments is enough. Override for any other port:
#   API_BASE=http://localhost:5199/api ./run-all.sh
API="${API_BASE:-http://localhost:5083/api}"

pass=0
fail=0

# check <label> <expected> <actual>
check() {
  if [ "$2" = "$3" ]; then
    echo "  PASS  $1 ($3)"
    pass=$((pass + 1))
  else
    echo "  FAIL  $1 — expected $2, got $3"
    fail=$((fail + 1))
  fi
}

# Prints a bearer token, or nothing when the login fails.
token() { # token <email> <password>
  curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" |
    sed -n 's/.*"token":"\([^"]*\)".*/\1/p'
}

register() { # register <email> <password> <full name>
  curl -s -X POST "$API/auth/register" -H "Content-Type: application/json" \
    -d "{\"fullName\":\"$3\",\"email\":\"$1\",\"password\":\"$2\"}" > /dev/null
}

# Status code only, for the many checks that care about nothing else.
status() { # status <curl args...>
  curl -s -o /dev/null -w '%{http_code}' "$@"
}

# First "publicId" / "id" in a JSON response. Enough for these fixtures; not a
# JSON parser, and not meant to be one — jq is not on every machine this has to
# run on.
pubid() { echo "$1" | sed -n 's/.*"publicId":"\([^"]*\)".*/\1/p'; }
rowid() { echo "$1" | sed -n 's/.*"id":\([0-9]*\).*/\1/p' | head -1; }

# Seeded accounts from Services/DataSeeder.cs.
login_seeded_users() {
  ADMIN=$(token admin@tfrench.vn Admin@123)
  TEACHER=$(token teacher@tfrench.vn Teacher@123)
  STUDENT=$(token student@tfrench.vn Student@123)

  for t in ADMIN TEACHER STUDENT; do
    if [ -z "${!t}" ]; then
      echo "ABORT: could not log in as $t at $API"
      echo "       Is the API running?  cd backend/TFrench.API && dotnet run"
      exit 1
    fi
  done
}

summary() {
  echo "──────────────────────────────"
  echo "PASS: $pass   FAIL: $fail"
  [ "$fail" -eq 0 ]
}

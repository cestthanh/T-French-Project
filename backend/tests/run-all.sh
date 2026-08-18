#!/usr/bin/env bash
# Runs every suite and exits non-zero if any of them failed.
set -u
cd "$(dirname "$0")"

total_fail=0
for suite in files leads blog; do
  echo "═══════════════════════════════════════════════"
  echo "  $suite"
  echo "═══════════════════════════════════════════════"
  bash "./$suite.sh" || total_fail=$((total_fail + 1))
  echo
done

if [ "$total_fail" -eq 0 ]; then
  echo "All suites passed."
else
  echo "$total_fail suite(s) failed."
fi
exit "$total_fail"

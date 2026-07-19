#!/usr/bin/env bash
# Fully automated mobile test suite (unit + widget).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> flutter pub get"
flutter pub get

echo "==> flutter analyze"
flutter analyze

echo "==> flutter test (unit + widget)"
flutter test --reporter expanded

echo "==> All mobile tests passed"

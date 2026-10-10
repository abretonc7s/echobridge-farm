#!/bin/bash
# ios.sh — iOS simulator setup for echobridge on macOS.
# Called by: bash scripts/setup-slot.sh <slot-id> [branch]
set -euo pipefail

SLOT_ID="${1:?Usage: ios.sh <slot-id> [branch]}"
BRANCH="${2:-main}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
POOL_DIR="${SCRIPT_DIR}/../../../pool"
source "${SCRIPT_DIR}/../../../scripts/lib/slot-common.sh"
load_slot_vars "$SLOT_ID"

# --- macOS check ---
[[ "$(uname)" == "Darwin" ]] || { echo "FAIL: requires macOS"; exit 1; }

# --- Xcode CLI ---
if ! xcode-select -p >/dev/null 2>&1; then
  echo "FAIL: Xcode not installed. Install from App Store or xcode-select --install"
  exit 1
fi
echo "PASS Xcode: $(xcode-select -p)"

# --- Simulator ---
SIM_NAME="${IOS_SIMULATOR:?IOS_SIMULATOR not set in slot_vars}"
if xcrun simctl list devices | grep -q "${SIM_NAME}"; then
  echo "PASS Simulator '${SIM_NAME}' already exists"
else
  echo "Creating simulator: ${SIM_NAME}..."
  RUNTIME=$(xcrun simctl list runtimes | grep 'iOS' | tail -1 | sed 's/.*- //')
  UDID=$(xcrun simctl create "${SIM_NAME}" "iPhone 16 Pro" "${RUNTIME}")
  echo "PASS Simulator created: ${SIM_NAME} (${UDID})"

  # Write UDID back to pool JSON
  POOL_FILE="${POOL_DIR}/${MACHINE}.json"
  if command -v jq &>/dev/null && [ -f "$POOL_FILE" ]; then
    TMP=$(mktemp)
    jq --arg sid "$SLOT_ID" --arg udid "$UDID" \
      '(.slots[] | select(.id == $sid)).udid = $udid' "$POOL_FILE" > "$TMP" \
      && mv "$TMP" "$POOL_FILE"
    echo "  UDID written to pool/${MACHINE}.json"
  fi
fi

echo "PASS Simulator: ${SIM_NAME} ready"

# --- Dependencies ---
REPO_DIR="${REPO}"
if [ ! -d "${REPO_DIR}/node_modules" ]; then
  echo "Installing dependencies..."
  cd "${REPO_DIR}"
  yarn install
  echo "PASS Dependencies installed"
else
  echo "PASS Dependencies: node_modules exists"
fi

echo ""
echo "=== iOS setup complete for ${SLOT_ID} ==="
echo "Next: bash scripts/prepare-slot.sh ${SLOT_ID}"

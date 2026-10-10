#!/bin/bash
# android.sh — Android emulator setup for echobridge on macOS.
# Called by: bash scripts/setup-slot.sh <slot-id> [branch]
set -euo pipefail

SLOT_ID="${1:?Usage: android.sh <slot-id> [branch]}"
BRANCH="${2:-main}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
POOL_DIR="${SCRIPT_DIR}/../../../pool"
source "${SCRIPT_DIR}/../../../scripts/lib/slot-common.sh"
load_slot_vars "$SLOT_ID"

# --- Android SDK ---
source "$SCRIPT_DIR/android-paths.sh"
check_android_paths
echo "PASS Android SDK: ${ANDROID_HOME}"

# --- System image ---
SYSTEM_IMAGE="system-images;android-35;google_apis;arm64-v8a"
if sdkmanager --list_installed 2>/dev/null | grep -q "system-images;android-35;google_apis;arm64-v8a"; then
  echo "PASS System image: android-35 arm64-v8a"
else
  echo "Installing system image: ${SYSTEM_IMAGE}..."
  yes | sdkmanager "${SYSTEM_IMAGE}" || {
    echo "FAIL: Could not install system image. Run manually:"
    echo "  sdkmanager '${SYSTEM_IMAGE}'"
    exit 1
  }
  echo "PASS System image installed"
fi

# --- AVD ---
AVD="${AVD_NAME:?avd not set in slot config}"
if avdmanager list avd 2>/dev/null | grep -q "Name: ${AVD}"; then
  echo "PASS AVD '${AVD}' exists"
else
  echo "Creating AVD: ${AVD}..."
  echo no | avdmanager create avd \
    -n "${AVD}" \
    -k "${SYSTEM_IMAGE}" \
    -d pixel_8
  echo "PASS AVD created: ${AVD}"
fi

# --- Worktree setup (for monorepo multi-slot) ---
REPO_DIR="${REPO}"
if [ ! -d "${REPO_DIR}" ]; then
  PRIMARY_REPO="${ECHOBRIDGE_PRIMARY_REPO:-$(jq -r '.primary_repo // empty' "${SCRIPT_DIR}/../project.json")}"
  if [ -n "${PRIMARY_REPO}" ] && [ -d "${PRIMARY_REPO}/.git" ]; then
    echo "Creating git worktree at ${REPO_DIR}..."
    cd "${PRIMARY_REPO}"
    git worktree add "${REPO_DIR}" "${BRANCH}"
    echo "PASS Worktree created"
  else
    echo "missing source checkout on $(farm_node), set ECHOBRIDGE_PRIMARY_REPO in pool.env" >&2
    exit 1
  fi
fi

# --- Dependencies ---
if [ ! -d "${REPO_DIR}/node_modules" ]; then
  echo "Installing dependencies..."
  cd "${REPO_DIR}"
  yarn install
  echo "PASS Dependencies installed"
else
  echo "PASS Dependencies: node_modules exists"
fi

# --- Boot emulator if ADB_SERIAL is set ---
if [ -n "${ADB_SERIAL}" ]; then
  if adb devices 2>/dev/null | grep -q "${ADB_SERIAL}"; then
    echo "PASS Emulator ${AVD} already running on ${ADB_SERIAL}"
  else
    echo "Booting ${AVD}..."
    emulator -avd "${AVD}" -no-window -no-audio -no-boot-anim &
    adb wait-for-device
    adb shell 'while [ -z "$(getprop sys.boot_completed)" ]; do sleep 1; done'
    echo "PASS Emulator ${AVD} booted on ${ADB_SERIAL}"
  fi

  # --- adb reverse for Metro ---
  METRO="${METRO_PORT:-7600}"
  adb -s "${ADB_SERIAL}" reverse tcp:"${METRO}" tcp:"${METRO}" 2>/dev/null || true
  echo "PASS adb reverse: port ${METRO}"
else
  echo "SKIP No ADB_SERIAL set — emulator not booted (create-only mode)"
fi

echo ""
echo "=== Android setup complete for ${SLOT_ID} ==="
echo "Next: bash scripts/prepare-slot.sh ${SLOT_ID}"

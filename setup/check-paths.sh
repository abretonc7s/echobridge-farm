#!/usr/bin/env bash
set -euo pipefail
repo="${1:?Usage: check-paths.sh <repo> <platform>}"
platform="${2:?Usage: check-paths.sh <repo> <platform>}"
source "$(dirname "${BASH_SOURCE[0]}")/android-paths.sh"
if [ ! -d "$repo" ]; then
  echo "missing slot checkout on $(farm_node), set repo in slot config" >&2
  exit 1
fi
if [ "$platform" = android ]; then
  check_android_paths
fi
echo "PASS configured EchoBridge paths on $(farm_node)"

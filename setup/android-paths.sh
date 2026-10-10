#!/usr/bin/env bash
# Configured SDK paths shared by prepare checks and machine bootstrap.
farm_node() {
  printf '%s\n' "${FARMSLOT_MACHINE:-${MACHINE:-$(hostname)}}"
}

check_android_paths() {
  local node tool
  node="$(farm_node)"
  if [ -z "${ANDROID_HOME:-}" ] || [ ! -d "$ANDROID_HOME" ]; then
    echo "missing Android SDK on $node, set ANDROID_HOME in pool.env" >&2
    return 1
  fi
  if [ -z "${ANDROID_AVD_HOME:-}" ]; then
    echo "missing Android AVD directory on $node, set ANDROID_AVD_HOME in pool.env" >&2
    return 1
  fi
  if [ ! -d "$ANDROID_AVD_HOME" ]; then
    echo "missing Android AVD directory on $node, create the configured ANDROID_AVD_HOME directory" >&2
    return 1
  fi
  for tool in cmdline-tools/latest/bin/avdmanager cmdline-tools/latest/bin/sdkmanager platform-tools/adb emulator/emulator; do
    if [ ! -x "$ANDROID_HOME/$tool" ]; then
      echo "missing Android $tool on $node, set ANDROID_HOME in pool.env" >&2
      return 1
    fi
  done
  export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
}

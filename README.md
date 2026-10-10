# EchoBridge farm

Register each slot with its own checkout path. When Android setup needs to create
a missing worktree, set `ECHOBRIDGE_PRIMARY_REPO` to this machine's source checkout:

```bash
export ECHOBRIDGE_PRIMARY_REPO="/path/to/echobridge_monorepo"
```

An explicit `primary_repo` in the local project config remains supported. Existing
slot checkouts need neither setting. Worktree locations come from the slot registry.

For Android slots, configure `ANDROID_HOME` and `ANDROID_AVD_HOME` in the node's
`pool.env`. The SDK must provide sdkmanager, avdmanager, adb and emulator. The
read-only prerequisite check fails before prepare changes the checkout. Machine
setup uses the same paths and supports the configured primary worktree override.
Bootstrap creates the configured AVD directory. Prepare only checks it.

Deploy Farmslot #922 and #924 before this farm. They provide pool environment
propagation, read-only prerequisites and absolute support-bundle paths on nodes.
Metro runs inside Farmslot's recorded prepare scope, with its launcher PID in
`apps/echobridge/.agent/metro.pid`. Preflight clears a prior recorded launcher;
resource shutdown and recycle stop the launcher and all its children. Port
fallback only follows an Expo launcher in this slot's app checkout. A listener
owned by another checkout causes shutdown to fail without killing it.

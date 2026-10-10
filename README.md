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

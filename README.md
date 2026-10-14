# EchoBridge farm

## Shared recipe provider

The pack declares the product's `createProvider` factory at
`apps/echobridge/scripts/agentic/recipe/provider.mjs` and selects the app checkout
at `apps/echobridge`. The shared Farmslot host owns catalog resolution and recipe
execution. The default checked recipe is `expo.config`.

Install the product commit containing that factory and its reviewed recipe SDK
dependencies before adopting this declaration. The factory supplies the existing
EchoBridge actions and transports for core, web and mobile; iOS and Android use
mobile with the selected slot's target. This pack does not copy the provider or
recipe engine. Registered pool slots must also select `app: apps/echobridge`. Update the product's farm gitlink after the pack merges.

From a prepared slot checkout, use the shared CLI to discover and validate:

```bash
farmslot recipe actions --project echobridge-farm --json
farmslot doctor --project echobridge-farm --conformance --json
```

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
owned by another checkout causes shutdown to fail without killing it. Resource
health checks the launcher as well as the port so shutdown still runs after a
listener has exited. Slot readiness still requires the listening Metro port.

## CI parity before PR handoff

The tracked `dev/default` checklist contains the shared `CI_PARITY_STEP` token.
Prepare installs `apps/echobridge/.agent/ci-parity`; marking that step runs
`ci.local_check`, records its exit code and log, and refuses a failure. The ready
gate requires the current receipt. QA smoke keeps its existing runtime proof.

The command mirrors the product App and Server workflows. It builds
`echobridgelib` and checks app types. Affected app scope also runs baseline lint,
script lint, public Expo config and related Jest tests. Dependency/test-config
changes select the app unit suite. Server scope uses the existing isolated
`services/server/scripts/test-public.sh`, including its public test exclusions.
Commands share a four-minute budget. Native builds, devices, providers and
hosted/deployment checks remain in CI.

Use the node's configured toolchain on PATH. The server check needs the same
`uv` dependency bootstrap as Server CI. Deploy Farmslot #952 and #956 before
syncing this pack. Sync the approved farm source into the operator clone and
retain local tasks and pool configuration. The product checkout owns recipes
and their public fixture environment; this repository owns farm hooks and
checklists. Run `node --test tests/*.test.mjs` for pack regressions.

## Native proof ownership

The shared capability catalog exposes `ios-simulator` and `android-device` for
prepared slots. Acquisition health-checks the configured target and requires an
explicit platform plus simulator or Android serial. Release clears the gateway
reservation and retains the device, app and Metro. The existing slot lifecycle
continues to own preparation and teardown, including its ownership-checking Metro
stop helper.

Use a real owner run and the public capability acquisition before live recipe
conformance. iOS proof precedes Android. No web target is declared by these native
capabilities. `recipe.provider` continues to use the product's shared runtime and
the default engine.

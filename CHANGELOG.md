# Changelog

## Unreleased

- Expose a read-only ownership check in the existing Metro helper for prepared-client recipe launch.

- Give each configuration preflight a fresh artifact directory so repeated preparation preserves prior evidence.

- Declare native proof reservations through existing iOS/Android health hooks; releasing a reservation preserves the prepared device, app and Metro.

- Use generated task instructions for engine-owned acceptance claims, coverage rendering and verified human review; remove manual verdict commands.

- Declare the product-owned shared recipe provider and select the actual `apps/echobridge` checkout path.

- Track active EchoBridge dev/QA workflows and native-build-free setup; require a recorded product CI check before PR handoff.

- PR-producing worker templates and shared task guidance record acceptance verdicts and derive recipe coverage before completion.

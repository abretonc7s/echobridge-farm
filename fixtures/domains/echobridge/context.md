# EchoBridge runtime context

The app lives in `apps/echobridge`; the server lives in `services/server`.
Recipe discovery starts with the EchoBridge runner's `run --list --json`.
Public Expo configuration proof works without a browser or private configuration.
Navigation and recording recipes require a selected development runtime exposing
`globalThis.__AGENTIC__`. Use a separate slot browser and its allocated ports.
Retain the recipe artifact package. UI captures must include the recipe HUD.

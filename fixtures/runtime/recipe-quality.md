# EchoBridge recipe quality

- Discover recipes and supported actions with `yarn recipe:echobridge list --json` and `yarn recipe:echobridge manifest` from the app directory in the reviewed checkout. Use the existing recipe library and manifest before authoring actions or assertions.
- Use the Recipe v1 graph envelope from the bundled recipes, with an intent on each executable node. Validate expo.config with the core adapter and navigation or recording recipes with the selected mobile runtime.
- Run through the project recipe hook with the assigned device and ports. Pass absolute task artifact paths to every runner flag, since relative paths resolve against apps/echobridge.
- Establish deterministic start state and restore persisted recording or sync state during teardown. For recording fixtures with shared titles, retain the trace audio ID and read back that exact new recording ID before claiming creation or sync.
- Assert that the intended component is visible in the viewport before capturing visual proof. The recipe HUD is on by default and recommended, especially in video so the intent is visible at any moment, but is not mandatory. Never reject or re-run evidence only because the HUD is missing. Record unsupported or opaque targets explicitly.
- Retain the resolved recipe, summary, trace and artifact manifest under the task artifacts. Validate the package and report uncovered criteria; command success alone does not prove a state change or visible result.

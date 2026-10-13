---
platforms: [mobile, ios, android, web]
---

# Prove EchoBridge runtime smoke

- [ ] Record the checkout revision, selected runtime and acceptance criteria. Discover the bundled recipes through the EchoBridge runner. Read {{recipe_quality_path}} and {{review_quality_path}} before planning proof.
- [ ] Validate and run expo.config with the core adapter, saving its artifact package under this task's artifacts. Pass absolute task artifact paths; the runner resolves relative ones against the app directory.
- [ ] Validate and run smoke.navigation on the selected development runtime. Capture a screenshot and validate the artifact package. The default recipe HUD is recommended, especially in video, but is not mandatory. An unavailable runtime or failing smoke means blocked or failed QA.
- [ ] Run recording.sync.lifecycle when the change affects recording or sync. Add task-specific proof for criteria outside these bundled recipes and report uncovered criteria.
- [ ] Write artifacts/report.md and artifacts/learnings.md with scope, verdict, revision and evidence paths. Report strict lint and the reviewed-baseline lint check separately; never regenerate the baseline during QA. Typecheck counts only when echobridgelib is built; otherwise record it as out of scope. Finish through ./mark only after the required runtime proof passes.

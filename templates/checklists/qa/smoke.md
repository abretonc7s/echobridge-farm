---
platforms: [mobile, ios, android, web]
---

# Prove EchoBridge runtime smoke

- [ ] Record the checkout revision, selected runtime and acceptance criteria. Discover the bundled recipes through the EchoBridge runner.
- [ ] Validate and run expo.config with the core adapter, saving its artifact package under this task's artifacts.
- [ ] Validate and run smoke.navigation on the selected development runtime. Capture the HUD screenshot and validate the artifact package. An unavailable runtime or failing smoke means blocked or failed QA.
- [ ] Run recording.sync.lifecycle when the change affects recording or sync. Add task-specific proof for criteria outside these bundled recipes and report uncovered criteria.
- [ ] Write artifacts/report.md and artifacts/learnings.md with scope, verdict, revision and evidence paths. Finish through ./mark only after the required runtime proof passes.

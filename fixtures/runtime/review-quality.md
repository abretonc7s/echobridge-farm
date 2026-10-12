# EchoBridge review quality

- Read {{recipe_quality_path}} when reviewing recipe proof. Check each acceptance criterion against the reviewed checkout revision and evidence from that run.
- Report strict lint and reviewed-baseline lint separately. Never regenerate the baseline during QA. App typecheck counts only after `yarn workspace echobridgelib build` creates its declared dist output; otherwise mark typecheck out of scope.
- Inspect the summary, trace and artifact manifest rather than relying on a passing runner status. Recording claims must identify and read back the exact new recording ID, since fixture titles can match older rows.
- Open visual evidence and confirm the target is visible in the viewport, on the intended route and runtime. Require a viewport assertion before screenshots and a visible recipe HUD where supported. Reject injected state and stale screenshots as proof of a user flow.
- Review sibling call sites, error handling, resource cleanup and recording or sync persistence for regressions. Record blockers with file and line references, a concrete failure and the minimum correction.
- Write scope, revision, validation results, per-criterion verdicts and evidence paths in the review report. Missing or weak required proof prevents approval; record unavailable runtimes explicitly.

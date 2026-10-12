# Farmslot Learnings — echobridge-farm

Curated corrective feedback loop. Only actionable template/process improvements — no noise, no clean-run entries.

---

## Bulk retro curation, 2026-10-12 — QA on deeeed/echobridge_monorepo#112

Three QA runs on the recipe migration PR: `9a900cd2` (32m, 1 nudge), `b045fa60` (9m), `871913ee` (12m).

## Artifact paths must be absolute

- `b045fa60`: the EchoBridge runner resolves artifact-directory flags against `apps/echobridge`, so a relative task path lands in `apps/echobridge/.task`.
- **Pass absolute task artifact paths to every runner flag.**

## Name the authoritative lint and typecheck gates

- Strict lint fails at this head (336 errors in `9a900cd2`, 579 in `871913ee`); the reviewed baseline check passes with no increase. `871913ee`: typecheck failed because `echobridgelib` declarations were missing; its package points at an absent `dist`.
- **QA reports both strict and baseline lint results and never regenerates the baseline. Setup builds `echobridgelib` before any typecheck, or the checklist marks typecheck out of scope.**

## The pack ships no quality docs

- `871913ee`, `9a900cd2`: the rendered checklist omitted quality-doc paths; the operator supplied `recipe-quality.md` and `review-quality.md` by hand under `artifacts/quality/`.
- **Add pack quality docs and wire them like farmslot-farm** (see template changes; same decision as audiolab-farm).

## Recipe follow-ups for the source repo

- `9a900cd2`, `871913ee`: recording fixtures share titles, so proof needed the trace audio ID to tell the new row from older ones. **Add a read-back assertion for the exact new recording ID and an explicit viewport assertion before screenshots** in the EchoBridge recipe library.

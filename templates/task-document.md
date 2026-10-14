## Task acceptance handling

When this task has registered acceptance criteria, follow the generated `{{TASK_DIR}}/TASK.md` section **Recipe proof + acceptance review**. It supplies the task-bound recipe invocation, `proofTargets` and `proves`, read-only acceptance inspection, safe `artifacts/recipe-coverage.md` rendering and the completion check. Run the configured recipe with that task binding so the selected engine writes the normal verdicts. Retain unresolved claims for the configured human gate; only verified gateway review may grant an untestable exception with a reason. Never write verdicts or override ledger rows locally.

When no criteria are registered, keep the task's recipe proof and report workflow. If a recipe exists, retain `artifacts/recipe-coverage.md` with one row per task claim: observed outcome, proof mode, recipe nodes, evidence path and rationale. This is a display artifact; do not invent acceptance verdicts. Checklist completion alone does not prove a claim.

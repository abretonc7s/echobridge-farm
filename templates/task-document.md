

## Acceptance verdicts + recipe coverage

Before successful completion or handing off this PR, set `export TASK_DIR="{{TASK_DIR}}"`. Use the deployed agent runtime, not the application checkout's dependencies:

```bash
FARMSLOT_ACCEPTANCE_ROOT="{{farmslot_dir}}"
case "$FARMSLOT_ACCEPTANCE_ROOT" in
  "~/"*) FARMSLOT_ACCEPTANCE_ROOT="$HOME/${FARMSLOT_ACCEPTANCE_ROOT#\~/}" ;;
esac
node "$FARMSLOT_ACCEPTANCE_ROOT/packages/agent-runtime/bin/farmslot-agent.mjs" ac list
```

If `ac list` has no registered criteria, skip ledger recording/rendering and retain the task's existing recipe-coverage workflow. Otherwise, record an honest verdict for each AC with `node "$FARMSLOT_ACCEPTANCE_ROOT/packages/agent-runtime/bin/farmslot-agent.mjs" ac set AC-N proven --proof-mode state --recipe-node <node-id> --evidence <task-relative-path>`. Use the actual state, visual or mixed mode and existing evidence; omit the recipe node when no recipe applies. Use `untestable --note <reason>` only when proof is unavailable. Check `ac list` again.

When a recipe exists and ACs are registered, render coverage to a temporary file and replace the existing coverage only after success:

```bash
coverage_tmp=$(mktemp "{{TASK_DIR}}/artifacts/recipe-coverage.XXXXXX")
if node "$FARMSLOT_ACCEPTANCE_ROOT/packages/agent-runtime/bin/farmslot-agent.mjs" ac render > "$coverage_tmp"; then
  mv "$coverage_tmp" "{{TASK_DIR}}/artifacts/recipe-coverage.md"
else
  rm -f "$coverage_tmp"
  exit 1
fi
```

Before `mark complete`, run `node "$FARMSLOT_ACCEPTANCE_ROOT/packages/agent-runtime/bin/farmslot-agent.mjs" artifact-check "{{TASK_DIR}}" --require-recipe-coverage-if-recipe --require-acceptance-status`. Refresh affected verdicts and coverage after the final proof run. Checklist completion alone does not assess an AC.

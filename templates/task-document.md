

## Acceptance verdicts + recipe coverage

Before successful completion or handing off this PR, set `export TASK_DIR="{{TASK_DIR}}"` and run `"{{REPO}}/node_modules/.bin/farmslot-agent" ac list`. For every registered AC, record an honest verdict with `"{{REPO}}/node_modules/.bin/farmslot-agent" ac set AC-N proven --proof-mode state --recipe-node <node-id> --evidence <task-relative-path>`. Use the actual state, visual or mixed mode and existing evidence; omit the recipe node when no recipe applies. Use `untestable --note <reason>` only when proof is unavailable. Check `ac list` again.

When `artifacts/recipe.json` exists, derive `artifacts/recipe-coverage.md` with `"{{REPO}}/node_modules/.bin/farmslot-agent" ac render > "{{TASK_DIR}}/artifacts/recipe-coverage.md"`. Before `mark complete`, run `node "{{farmslot_dir}}/packages/agent-runtime/scripts/check-task-artifact-contract.mjs" "{{TASK_DIR}}" --require-recipe-coverage-if-recipe --require-acceptance-status`. Refresh affected verdicts and coverage after the final proof run. Checklist completion alone does not assess an AC.

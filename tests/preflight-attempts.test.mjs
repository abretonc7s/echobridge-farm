import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const helper = fileURLToPath(new URL('../scripts/project.mjs', import.meta.url));
test('repeated preflight retains both configuration attempts instead of overwriting', t => {
  const repo = mkdtempSync(path.join(tmpdir(), 'echo-preflight-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const root = path.join(repo, 'apps/echobridge/scripts/agentic/recipe');
  mkdirSync(path.join(root, 'recipes'), { recursive: true });
  writeFileSync(path.join(root, 'recipes/expo.config.recipe.json'), '{}');
  writeFileSync(path.join(root, 'run-echobridge-recipe.mjs'), String.raw`
    import { existsSync, writeFileSync, appendFileSync } from 'node:fs';
    import path from 'node:path';
    const args = process.argv.slice(2);
    if (args[0] === 'run') {
      const dir = args[args.indexOf('--artifacts-dir') + 1];
      const evidence = path.join(dir, 'owned-attempt.txt');
      if (existsSync(evidence)) process.exit(1);
      writeFileSync(evidence, 'retained attempt');
      appendFileSync(path.join(process.cwd(), 'attempts.jsonl'), JSON.stringify(dir) + '\n');
    }
  `);
  for (let count = 0; count < 2; count++) execFileSync(process.execPath, [helper, 'preflight', repo]);
  const app = path.join(repo, 'apps/echobridge');
  const attempts = readFileSync(path.join(app, 'attempts.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(attempts.length, 2);
  assert.notEqual(attempts[0], attempts[1]);
  for (const dir of attempts) {
    assert.equal(path.dirname(dir), path.join(app, '.agent/farmslot/config-smoke'));
    assert.equal(readFileSync(path.join(dir, 'owned-attempt.txt'), 'utf8'), 'retained attempt');
  }
});

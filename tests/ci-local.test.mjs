import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const farm = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fixture(t) {
  const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'echo-ci-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = path.join(root, 'repo');
  const bin = path.join(root, 'bin');
  const log = path.join(root, 'calls.jsonl');
  mkdirSync(bin);
  for (const file of ['apps/echobridge/src/feature.ts', 'packages/echobridgelib/src/index.ts']) {
    mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
    writeFileSync(path.join(repo, file), 'export const value = 1;\n');
  }
  mkdirSync(path.join(repo, 'services/server/scripts'), { recursive: true });
  writeFileSync(path.join(repo, 'services/server/scripts/test-public.sh'), '#!/bin/sh\nprintf \'["server-public"]\\n\' >> "$ECHO_CI_TEST_LOG"\nexit "${ECHO_CI_SERVER_EXIT:-0}"\n');
  writeFileSync(path.join(bin, 'yarn'), `#!/usr/bin/env node
const fs=require('node:fs');
const args=process.argv.slice(2);
fs.appendFileSync(process.env.ECHO_CI_TEST_LOG,JSON.stringify(args)+'\\n');
process.exit(args.includes(process.env.ECHO_CI_FAIL_CHECK)?7:0);
`, { mode: 0o755 });
  const git = (args) => execFileSync('/usr/bin/git', args, { cwd: repo, encoding: 'utf8' });
  git(['init', '-q', '-b', 'main']);
  git(['add', '.']);
  git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--no-gpg-sign', '-qm', 'Initial']);
  git(['update-ref', 'refs/remotes/origin/main', 'HEAD']);
  return {
    repo,
    run: (extra = {}) => {
      const env = { ...process.env, PATH: bin + path.delimiter + process.env.PATH, ECHO_CI_TEST_LOG: log, ...extra };
      delete env.NODE_TEST_CONTEXT;
      return spawnSync(process.execPath, [path.join(farm, 'scripts/ci-local.mjs')], { cwd: repo, env, encoding: 'utf8', timeout: 4000 });
    },
    calls: () => readFileSync(log, 'utf8').trim().split('\n').map((line) => JSON.parse(line)),
  };
}

test('source-only app changes select CI lint/types and related product tests', (t) => {
  const f = fixture(t);
  writeFileSync(path.join(f.repo, 'apps/echobridge/src/feature.ts'), 'export const value = 2;\n');
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  const calls = f.calls();
  assert.ok(calls.some((args) => args.includes('build')));
  assert.ok(calls.some((args) => args.includes('typecheck')));
  assert.ok(calls.some((args) => args.includes('lint:baseline')));
  assert.ok(calls.some((args) => args.includes('lint:scripts')));
  assert.ok(calls.some((args) => args.includes('validate:sample-config')));
  assert.ok(calls.some((args) => args.includes('--findRelatedTests') && args.includes(path.join(f.repo, 'apps/echobridge/src/feature.ts'))));
  assert.ok(!calls.some((args) => args.includes('server-public')));
});

test('untracked shared-library source is included in importing app unit coverage', (t) => {
  const f = fixture(t);
  const file = path.join(f.repo, 'packages/echobridgelib/src/new.ts');
  writeFileSync(file, 'export const added = 1;\n');
  assert.equal(f.run().status, 0);
  assert.ok(f.calls().some((args) => args.includes('--findRelatedTests') && args.includes(file)));
});

test('deleted app source still selects CI types and lint', (t) => {
  const f = fixture(t);
  unlinkSync(path.join(f.repo, 'apps/echobridge/src/feature.ts'));
  assert.equal(f.run().status, 0);
  assert.ok(f.calls().some((args) => args.includes('typecheck')));
  assert.ok(f.calls().some((args) => args.includes('lint:baseline')));
});

test('a changed dependency manifest selects all app unit tests', (t) => {
  const f = fixture(t);
  writeFileSync(path.join(f.repo, 'package.json'), '{}\n');
  assert.equal(f.run().status, 0);
  assert.ok(f.calls().some((args) => args.includes('test') && !args.includes('--findRelatedTests')));
});

test('unit failure propagates and cannot produce a passing receipt', (t) => {
  const f = fixture(t);
  writeFileSync(path.join(f.repo, 'apps/echobridge/src/feature.ts'), 'export const value = 2;\n');
  const result = f.run({ ECHO_CI_FAIL_CHECK: 'test' });
  assert.equal(result.status, 7, result.stderr);
  assert.doesNotMatch(result.stdout, /ci-parity: PASS/);
});

test('server changes reuse the actual isolated public CI entry point and propagate its failure', (t) => {
  const f = fixture(t);
  mkdirSync(path.join(f.repo, 'services/server/src'), { recursive: true });
  writeFileSync(path.join(f.repo, 'services/server/src/example.py'), 'value = 1\n');
  const result = f.run({ ECHO_CI_SERVER_EXIT: '9' });
  assert.equal(result.status, 9, result.stderr);
  assert.ok(f.calls().some((args) => args.includes('server-public')));
});

test('active catalog is tracked with one shared CI step and retains the acceptance and scoped Metro guards', () => {
  const config = JSON.parse(readFileSync(path.join(farm, 'project.json'), 'utf8'));
  assert.equal(config.ci.local_check, 'bash apps/echobridge/.agent/ci-parity');
  const dev = readFileSync(path.join(farm, 'templates/checklists/dev/default.md'), 'utf8');
  assert.equal(dev.match(/\{\{CI_PARITY_STEP\}\}/g)?.length, 1);
  assert.match(config.hooks.preflight, /stop-metro\.mjs.*project\.mjs/);
  assert.match(config.hooks.prerequisites, /check-paths\.sh/);
  assert.match(config.resources['dev-server'].hooks.shutdown, /stop-metro\.mjs/);
  assert.match(readFileSync(path.join(farm, 'templates/task-document.md'), 'utf8'), /--require-acceptance-status/);
});

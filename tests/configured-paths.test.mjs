import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const check = fileURLToPath(new URL('../setup/check-paths.sh', import.meta.url));

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'echo SDK '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const sdk = path.join(root, 'SDK');
  const avd = path.join(root, 'AVDs');
  mkdirSync(sdk);
  mkdirSync(avd);
  for (const relative of [
    'cmdline-tools/latest/bin/avdmanager',
    'cmdline-tools/latest/bin/sdkmanager',
    'platform-tools/adb',
    'emulator/emulator',
  ]) {
    const file = path.join(sdk, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, '#!/bin/sh\nexit 0\n');
    chmodSync(file, 0o755);
  }
  const env = {
    PATH: process.env.PATH,
    FARMSLOT_MACHINE: 'example-node',
    ANDROID_HOME: sdk,
    ANDROID_AVD_HOME: avd,
  };
  return {
    root,
    sdk,
    run: (platform, override = {}, repo = root) => spawnSync('bash', [check, repo, platform], {
      env: { ...env, ...override },
      encoding: 'utf8',
      timeout: 2000,
    }),
  };
}

test('configured Android SDK paths with spaces pass before bootstrap', t => {
  const result = fixture(t).run('android');
  assert.equal(result.status, 0, result.stderr);
});

for (const key of ['ANDROID_HOME', 'ANDROID_AVD_HOME']) {
  test(`missing ${key} fails with node and setting`, t => {
    const result = fixture(t).run('android', { [key]: '' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(`on example-node, set ${key}`));
  });
}

test('iOS preparation does not require an Android SDK', t => {
  const result = fixture(t).run('ios', { ANDROID_HOME: '', ANDROID_AVD_HOME: '' });
  assert.equal(result.status, 0, result.stderr);
});

test('missing slot checkout fails before preparation', t => {
  const f = fixture(t);
  const result = f.run('ios', {}, path.join(f.root, 'missing repo'));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing slot checkout on example-node, set repo in slot config/);
});

test('missing configured SDK executable fails', t => {
  const f = fixture(t);
  unlinkSync(path.join(f.sdk, 'platform-tools/adb'));
  const result = f.run('android');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing Android platform-tools\/adb on example-node, set ANDROID_HOME/);
});

test('bootstrap node name is used when FARMSLOT_MACHINE is absent', t => {
  const result = fixture(t).run('ios', { FARMSLOT_MACHINE: '', MACHINE: 'pool-node' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PASS configured EchoBridge paths on pool-node/);
});

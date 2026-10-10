import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
    run: (platform, override = {}) => spawnSync('bash', [check, root, platform], {
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

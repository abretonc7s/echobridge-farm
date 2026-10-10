import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const check = fileURLToPath(new URL('../setup/check-paths.sh', import.meta.url));

function fixture(t) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'echo SDK ')));
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

test('prepare reports a missing configured AVD directory without creating it', t => {
  const f = fixture(t);
  const avd = path.join(f.root, 'missing AVD directory');
  const result = f.run('android', { ANDROID_AVD_HOME: avd });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /create the configured ANDROID_AVD_HOME directory/);
  assert.equal(existsSync(avd), false);
});

test('bootstrap creates the configured AVD directory before the first AVD', t => {
  const f = fixture(t);
  const framework = path.join(f.root, 'framework');
  const setup = path.join(framework, 'projects/echobridge-farm/setup');
  const lib = path.join(framework, 'scripts/lib');
  mkdirSync(setup, { recursive: true });
  mkdirSync(lib, { recursive: true });
  for (const name of ['android.sh', 'android-paths.sh']) {
    copyFileSync(fileURLToPath(new URL(`../setup/${name}`, import.meta.url)), path.join(setup, name));
  }
  writeFileSync(path.join(lib, 'slot-common.sh'), 'load_slot_vars() { REPO="$TEST_REPO"; AVD_NAME=first-avd; ADB_SERIAL=""; MACHINE=pool-node; }\n');
  writeFileSync(path.join(f.sdk, 'cmdline-tools/latest/bin/sdkmanager'), '#!/bin/sh\necho "system-images;android-35;google_apis;arm64-v8a"\n');
  writeFileSync(path.join(f.sdk, 'cmdline-tools/latest/bin/avdmanager'), '#!/bin/sh\n[ "$1" != list ] || exit 0\ntest -d "$ANDROID_AVD_HOME" || exit 2\nprintf "%s\\n" "$@" > "$TEST_AVD_CALL"\n');
  const repo = path.join(f.root, 'slot checkout');
  mkdirSync(path.join(repo, 'node_modules'), { recursive: true });
  const call = path.join(f.root, 'avd-call.txt');
  const result = spawnSync('bash', [path.join(setup, 'android.sh'), 'test-slot'], {
    env: {
      PATH: process.env.PATH,
      ANDROID_HOME: f.sdk,
      ANDROID_AVD_HOME: path.join(f.root, 'new AVD directory'),
      TEST_REPO: repo,
      TEST_AVD_CALL: call,
    },
    encoding: 'utf8',
    timeout: 2000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(readFileSync(call, 'utf8'), /^create\navd\n-n\nfirst-avd\n/);
});

test('recipe hooks preserve checkout and file arguments containing spaces', t => {
  const f = fixture(t);
  const bin = path.join(f.root, 'bin');
  mkdirSync(bin);
  const fake = '#!/usr/bin/env node\nconst path=require("node:path"); console.log(JSON.stringify(path.basename(process.argv[1])==="yarn" ? {status:"pass",cwd:process.cwd()} : {argv:process.argv.slice(2),cwd:process.cwd(),platform:process.env.PLATFORM}));\n';
  for (const name of ['yarn', 'bash']) {
    const tool = path.join(bin, name);
    writeFileSync(tool, fake);
    chmodSync(tool, 0o755);
  }
  const repo = path.join(f.root, 'slot checkout');
  const app = path.join(repo, 'apps/echobridge');
  mkdirSync(app, { recursive: true });
  const recipe = path.join(f.root, 'recipe library/smoke test.json');
  const artifacts = path.join(f.root, 'run artifacts');
  const values = {
    repo,
    platform: 'android',
    simulator: 'Test Sim',
    adb_serial: 'emulator-5596',
    cdp_port: '9222',
    // The gateway supplies these two placeholders as shell expressions.
    recipe_path: `'${recipe}'`,
    artifacts_dir: `'${artifacts}'`,
    runtime_dir: path.join(f.root, 'slot runtime'),
    metro_port: '7706',
  };
  const project = JSON.parse(readFileSync(new URL('../project.json', import.meta.url), 'utf8'));
  function runHook(name, bindings = values) {
    const command = project.hooks[name].replace(/\{\{(\w+)\}\}/g, (_, key) => bindings[key]);
    const result = spawnSync('/bin/zsh', ['-f', '-c', command], {
      env: { PATH: `${bin}:${process.env.PATH}`, HOME: process.env.HOME },
      encoding: 'utf8',
      timeout: 2000,
    });
    assert.equal(result.status, 0, `${name}: ${result.stderr}`);
    return JSON.parse(result.stdout);
  }
  const outputs = {};
  for (const name of ['recipe_action_manifest', 'recipe_doctor', 'recipe_run']) {
    outputs[name] = runHook(name);
  }
  assert.equal(outputs.recipe_action_manifest.cwd, app);
  assert.equal(outputs.recipe_doctor.status, 'pass');
  assert.equal(outputs.recipe_run.cwd, app);
  assert.equal(outputs.recipe_run.platform, 'android');
  assert.deepEqual(outputs.recipe_run.argv, [
    'scripts/agentic/validate-recipe.sh', '--recipe', recipe,
    '--artifacts-dir', artifacts, '--runtime-dir', values.runtime_dir,
    '--metro-port', values.metro_port,
  ]);
  const homeRun = runHook('recipe_run', {
    ...values,
    recipe_path: '"${HOME}/recipe library/smoke test.json"',
    artifacts_dir: '"${HOME}/run artifacts"',
  });
  assert.deepEqual(homeRun.argv, [
    'scripts/agentic/validate-recipe.sh', '--recipe', path.join(process.env.HOME, 'recipe library/smoke test.json'),
    '--artifacts-dir', path.join(process.env.HOME, 'run artifacts'),
    '--runtime-dir', values.runtime_dir, '--metro-port', values.metro_port,
  ]);
});

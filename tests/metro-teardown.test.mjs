import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { expandHook } from './hook.mjs';

const stop = fileURLToPath(new URL('../setup/stop-metro.mjs', import.meta.url));
const execute = promisify(execFile);
function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { if (error.code === 'ESRCH') return false; throw error; }
}
async function fixture(t) {
  const repo = realpathSync(mkdtempSync(path.join(tmpdir(), 'echo Metro ')));
  const app = path.join(repo, 'apps/echobridge');
  mkdirSync(path.join(app, '.agent'), { recursive: true });
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const childCode = `const server=require('node:net').createServer(); server.listen(0,'127.0.0.1',()=>process.send({port:server.address().port}));`;
  const launcherCode = `
    setInterval(()=>{},100);
    const child=require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(childCode)}],{stdio:['ignore','ignore','ignore','ipc']});
    child.once('message', ({port})=>{
      process.title='npm exec expo start --dev-client --port '+port+' --localhost';
      console.log(JSON.stringify({launcher:process.pid,child:child.pid,port}));
    });
  `;
  const launcher = spawn(process.execPath, ['-e', launcherCode], { cwd: app, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  // Each fixture owns its own group. Teardown also covers setup/assertion failures.
  t.after(() => { try { process.kill(-launcher.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; } });
  const info = await new Promise((resolve, reject) => {
    launcher.once('error', reject);
    launcher.once('exit', code => reject(new Error(`fixture launcher exited ${code}`)));
    launcher.stdout.once('data', data => resolve(JSON.parse(data.toString())));
  });
  return { repo, app, pidfile: path.join(app, '.agent/metro.pid'), ...info };
}
async function stopped(f) {
  const deadline = Date.now() + 1000;
  while ((alive(f.launcher) || alive(f.child)) && Date.now() < deadline) await delay(10);
  assert.equal(alive(f.launcher), false, 'detached npm launcher remains');
  assert.equal(alive(f.child), false, 'listener child remains');
}

test('shutdown stops the recorded detached launcher and listener, then is idempotent', { timeout: 4500 }, async t => {
  const f = await fixture(t);
  writeFileSync(f.pidfile, `${f.launcher}\n`);
  await execute(process.execPath, [stop, f.repo, String(f.port)]);
  await stopped(f);
  assert.equal(existsSync(f.pidfile), false);
  await execute(process.execPath, [stop, f.repo, String(f.port)]);
});

test('stale PID file recovers the Metro launcher from its configured listener', { timeout: 4500 }, async t => {
  const f = await fixture(t);
  writeFileSync(f.pidfile, '99999999\n');
  await execute(process.execPath, [stop, f.repo, String(f.port)]);
  await stopped(f);
});

test('recorded launcher is stopped after port cleanup already killed its listener', { timeout: 4500 }, async t => {
  const f = await fixture(t);
  writeFileSync(f.pidfile, `${f.launcher}\n`);
  process.kill(f.child, 'SIGTERM');
  const deadline = Date.now() + 1000;
  while (alive(f.child) && Date.now() < deadline) await delay(10);
  assert.equal(alive(f.child), false);
  assert.equal(alive(f.launcher), true);
  await assert.rejects(execute(process.execPath, [stop, f.repo, String(f.port), '--check-owned']), { code: 3 });
  const project = JSON.parse(readFileSync(new URL('../project.json', import.meta.url), 'utf8'));
  const framework = path.join(f.repo, 'framework');
  const setup = path.join(framework, 'projects/echobridge-farm/setup');
  mkdirSync(setup, { recursive: true });
  copyFileSync(stop, path.join(setup, 'stop-metro.mjs'));
  const bindings = { farmslot_dir: framework, repo: f.repo, metro_port: f.port };
  // Run the configured health gate before shutdown, including the no-listener state.
  const hooks = project.resources['dev-server'].hooks;
  await execute('/bin/bash', ['-c', expandHook(hooks.health, bindings)]);
  assert.equal(alive(f.launcher), true, 'health must be read-only');
  await execute('/bin/bash', ['-c', expandHook(hooks.shutdown, bindings)]);
  await stopped(f);
});

test('shutdown preserves another slot and ignores a stale PID pointing at it', { timeout: 4500 }, async t => {
  const f = await fixture(t);
  const other = await fixture(t);
  writeFileSync(f.pidfile, `${other.launcher}\n`);
  await execute(process.execPath, [stop, f.repo, String(f.port)]);
  await stopped(f);
  assert.equal(alive(other.launcher), true);
  assert.equal(alive(other.child), true);
});

test('foreign configured-port listener fails shutdown without stopping its owner', { timeout: 4500 }, async t => {
  const f = await fixture(t);
  const other = await fixture(t);
  await assert.rejects(execute(process.execPath, [stop, f.repo, String(other.port)]), /still has a listener/);
  assert.equal(alive(f.launcher), true);
  assert.equal(alive(other.launcher), true);
  assert.equal(alive(other.child), true);
});

test('owned Metro check observes the prepared server and reports empty after shutdown', { timeout: 4500 }, async t => {
  const f = await fixture(t);
  writeFileSync(f.pidfile, `${f.launcher}\n`);
  await execute(process.execPath, [stop, f.repo, String(f.port), '--check-owned']);
  assert.equal(alive(f.launcher), true);
  assert.equal(alive(f.child), true);
  assert.equal(readFileSync(f.pidfile, 'utf8'), `${f.launcher}\n`);
  await execute(process.execPath, [stop, f.repo, String(f.port)]);
  await stopped(f);
  await assert.rejects(execute(process.execPath, [stop, f.repo, String(f.port), '--check-owned']), { code: 1 });
});

test('owned Metro check distinguishes a foreign listener while retaining health semantics', { timeout: 4500 }, async t => {
  const f = await fixture(t);
  const other = await fixture(t);
  writeFileSync(f.pidfile, `${other.launcher}\n`);
  await execute(process.execPath, [stop, f.repo, String(other.port), '--check']);
  await assert.rejects(execute(process.execPath, [stop, f.repo, String(other.port), '--check-owned']), { code: 2 });
  assert.equal(alive(f.launcher), true);
  assert.equal(alive(other.launcher), true);
  assert.equal(alive(other.child), true);
  assert.equal(readFileSync(f.pidfile, 'utf8'), `${other.launcher}\n`);
});

#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const [repo, port] = process.argv.slice(2);
if (!repo || !/^\d+$/.test(port || '')) throw new Error('Usage: stop-metro.mjs <repo> <metro-port>');
const app = realpathSync(path.join(repo, 'apps/echobridge'));
const pidfile = path.join(app, '.agent/metro.pid');
function command(binary, args) {
  try { return execFileSync(binary, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch (error) { if (error.status === 1) return ''; throw error; }
}
const rows = command('ps', ['-axo', 'pid=,ppid=,command=']).split('\n').flatMap(line => {
  const match = /^\s*(\d+)\s+(\d+)\s+(.+)$/.exec(line);
  return match ? [{ pid: Number(match[1]), parent: Number(match[2]), argv: match[3] }] : [];
});
const processes = new Map(rows.map(row => [row.pid, row]));
function listeners() {
  return command('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t']).trim().split(/\s+/).filter(Boolean).map(Number);
}
function isMetro(row) {
  if (!row || !/\bexpo\b/.test(row.argv) || !new RegExp(`--port(?:=|\\s+)${port}\\b`).test(row.argv)) return false;
  return command('lsof', ['-a', '-p', String(row.pid), '-d', 'cwd', '-Fn']).split('\n').includes(`n${app}`);
}
const roots = new Set();
if (existsSync(pidfile)) {
  const recorded = Number(readFileSync(pidfile, 'utf8').trim());
  if (isMetro(processes.get(recorded))) roots.add(recorded);
}
// A listener is often Expo's child. Recover its launcher when the PID file is stale.
for (const listener of listeners()) {
  let row = processes.get(listener);
  while (row && row.pid > 1) {
    if (isMetro(row)) roots.add(row.pid);
    row = processes.get(row.parent);
  }
}
const owned = new Set(roots);
for (const pid of owned) for (const row of rows) if (row.parent === pid) owned.add(row.pid);
function signal(pid, signal) {
  try { process.kill(pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; }
}
function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { if (error.code === 'ESRCH') return false; throw error; }
}
// Stop children before their npm launcher so they cannot become launchd orphans.
for (const pid of [...owned].reverse()) signal(pid, 'SIGTERM');
const deadline = Date.now() + 2000;
while ([...owned].some(alive) && Date.now() < deadline) await delay(25);
for (const pid of owned) if (alive(pid)) signal(pid, 'SIGKILL');
if (listeners().length) throw new Error(`Metro port ${port} still has a listener; slot shutdown is incomplete.`);
if (existsSync(pidfile)) unlinkSync(pidfile);
console.log(`Stopped EchoBridge Metro on port ${port}, ${owned.size} process(es).`);

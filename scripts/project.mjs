#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [command, repo, metroPort] = process.argv.slice(2);
if (!repo || !['setup', 'preflight', 'doctor'].includes(command)) {
  throw new Error('Usage: project.mjs setup|preflight|doctor <monorepo>');
}
const repoRoot = path.resolve(repo);
const appRoot = path.join(repoRoot, 'apps/echobridge');
const recipeRoot = path.join(appRoot, 'scripts/agentic/recipe');
const configRecipe = path.join(recipeRoot, 'recipes/expo.config.recipe.json');
const env = { ...process.env, ECHOBRIDGE_SKIP_DOTENV: '1', EXPO_NO_DOTENV: '1' };

function run(binary, args, cwd, quiet = false) {
  const result = spawnSync(binary, args, {
    cwd,
    env,
    stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
    timeout: quiet ? 30000 : undefined,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${binary} ${args.join(' ')} failed. Check installed dependencies and the selected recipe.`);
  }
}

function runner(args, quiet = false) {
  run(process.execPath, [path.join(recipeRoot, 'run-echobridge-recipe.mjs'), ...args], appRoot, quiet);
}

try {
  if (command === 'setup') {
    // Yarn 4 skip-build disables install scripts, including native dependency builds.
    run('yarn', ['install', '--immutable', '--mode=skip-build'], repoRoot);
  }
  if (command === 'preflight') {
    const recipes = readdirSync(path.join(recipeRoot, 'recipes')).filter((name) => name.endsWith('.recipe.json'));
    if (recipes.length === 0) throw new Error('No EchoBridge recipes found.');
    for (const recipe of recipes) runner(['validate', path.join(recipeRoot, 'recipes', recipe), '--adapter', 'mobile', '--json']);
    const artifactsDir = path.join(appRoot, '.agent/farmslot/config-smoke');
    mkdirSync(artifactsDir, { recursive: true });
    runner(['run', configRecipe, '--adapter', 'core', '--artifacts-dir', artifactsDir, '--json']);
    if (metroPort) {
      const { publicFixtureEnv } = await import(pathToFileURL(path.join(appRoot, 'scripts/farmslot-config.mjs')).href);
      Object.assign(env, publicFixtureEnv, process.env, {
        ECHOBRIDGE_SKIP_DOTENV: '1', EXPO_NO_DOTENV: '1',
        METRO_PORT: metroPort, WATCHER_PORT: metroPort,
        METRO_CONNECTION: 'localhost', METRO_USE_TMUX: '0', BROWSER: 'none',
      });
      run('bash', [path.join(appRoot, 'scripts/agentic/start-metro.sh')], appRoot);
    }
  } else {
    // Plan validation loads the runner and checks its manifest without claiming a UI target.
    runner(['validate', configRecipe, '--adapter', 'core', '--json'], true);
  }
  console.log(JSON.stringify({
    runner_protocol_version: 1,
    status: 'pass',
    checks: [{ name: 'configuration-runner', status: 'pass' }],
    scope: 'configuration',
    runtime_required_for: ['navigation', 'recording'],
  }));
} catch (error) {
  if (command === 'doctor') {
    console.log(JSON.stringify({
      runner_protocol_version: 1,
      status: 'fail',
      checks: [{ name: 'configuration-runner', status: 'fail', detail: error.message }],
      scope: 'configuration',
    }));
    process.exitCode = 1;
  } else {
    throw error;
  }
}

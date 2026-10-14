import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const pack = fileURLToPath(new URL('..', import.meta.url));
const project = JSON.parse(readFileSync(new URL('../project.json', import.meta.url), 'utf8'));

test('shared binding names the checkout app and the product provider once', () => {
  assert.deepEqual(project.apps, ['apps/echobridge']);
  assert.equal(project.recipe.app, project.apps[0]);
  assert.deepEqual(project.recipe.provider, {
    module: './provider.mjs', root: { projectPath: 'apps/echobridge/scripts/agentic/recipe' },
  });
  assert.equal(project.recipe.adapter, 'mobile');
  assert.equal(project.recipe.domain, 'echobridge');
  assert.deepEqual(project.recipe.checks, [{ recipe: 'expo.config' }]);
  assert.equal(project.recipe.engine, undefined);
  assert.ok(existsSync(path.join(pack, 'setup/stop-metro.mjs')));
});

test('provider root is contained in the declared checkout app', () => {
  const relative = path.relative(project.recipe.app, project.recipe.provider.root.projectPath);
  assert.equal(relative, 'scripts/agentic/recipe');
  assert.equal(path.isAbsolute(project.recipe.provider.module), false);
  assert.equal(path.resolve('/', project.recipe.provider.module), '/provider.mjs');
});

// Run this integration check against the paired product checkout before rollout.
const checkout = process.env.ECHOBRIDGE_CHECKOUT;
test('real shared host resolves the declared product provider without a custom engine', { skip: !checkout }, async () => {
  const require = createRequire(path.join(checkout, project.apps[0], 'package.json'));
  const shared = await import(pathToFileURL(require.resolve('@farmslot/recipe-cli/harness')));
  const { status, context } = await shared.withProjectRecipeHost({
    cwd: checkout, tokens: ['--project', project.name, '--app', project.recipe.app, '--adapter', 'core'],
    projects: [{ root: pack, config: { ...project, repoUrl: project.repo_url,
      paths: { runtimeDir: project.paths.runtime_dir, artifactDir: project.paths.artifact_dir } } }],
    command: 'status', options: { adapter: 'core' },
  }, async host => {
    assert.equal(host.provider.engine, undefined);
    assert.equal(host.context.project.provider.export, 'createProvider');
    assert.equal(host.context.project.provider.module,
      path.join(checkout, project.recipe.provider.root.projectPath, 'provider.mjs'));
    return { status: await host.provider.runtime.runtimeStatus(host.context.target.value), context: host.context };
  });
  assert.equal(status.decision, 'ready');
  assert.equal(context.target.value, path.join(checkout, project.recipe.app));
});

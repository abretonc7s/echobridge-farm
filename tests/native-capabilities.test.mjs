import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { expandHook } from './hook.mjs';

const project = JSON.parse(readFileSync(new URL('../project.json', import.meta.url), 'utf8'));
for (const [id, platform, resource, target] of [
  ['ios-simulator', 'ios', 'ios-sim', 'simulator'],
  ['android-device', 'android', 'android-emu', 'adb_serial'],
]) {
  test(`${id} reserves the configured target through a read-only health hook`, () => {
    const provider = project.runtime_capabilities.providers[id];
    assert.equal(provider.share_policy, 'exclusive');
    assert.equal(provider.cost.resources[0].kind, 'device');
    assert.equal(provider.cost.resources[0].id, resource);
    assert.deepEqual(provider.parameters.required, ['platform', target]);
    assert.equal(provider.parameters.properties.platform.const, platform);
    assert.equal(provider.parameters.additionalProperties, false);
    assert.deepEqual(provider.actions.acquire, { kind: 'resource', resource_id: resource, action: 'health' });
    assert.deepEqual(provider.actions.health, provider.actions.acquire);
    const command = expandHook(project.resources[resource].hooks.health,
      { simulator: 'selected-simulator', adb_serial: 'emulator-5596' });
    assert.doesNotMatch(command, /\{\{/);
    assert.match(command, new RegExp(platform === 'ios' ? 'selected-simulator' : 'emulator-5596'));
    assert.doesNotMatch(command, /(?:shutdown|pm clear|simctl boot|emu kill)/);
  });
}

test('reservation release delegates lease clearing and retains the prepared session', () => {
  const providers = Object.values(project.runtime_capabilities.providers);
  assert.ok(providers.every(provider => provider.actions.release.action_id === 'native-reservation-retain'));
  assert.ok(providers.every(provider => provider.affected_resources[0].ownership === 'slot-lifecycle'
    && provider.affected_resources[0].release_effect === 'retain'));
  assert.equal(project.slot_actions['native-reservation-retain'].command, 'true');
  execFileSync('/bin/sh', ['-c', project.slot_actions['native-reservation-retain'].command]);
});

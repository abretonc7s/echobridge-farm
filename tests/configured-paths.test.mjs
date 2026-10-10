import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {chmodSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
const check=fileURLToPath(new URL('../setup/check-paths.sh',import.meta.url));
function fixture(t){
 const root=mkdtempSync(path.join(tmpdir(),'echo SDK '));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const sdk=path.join(root,'SDK'),avd=path.join(root,'AVDs');mkdirSync(sdk);mkdirSync(avd);
 for(const relative of ['cmdline-tools/latest/bin/avdmanager','cmdline-tools/latest/bin/sdkmanager','platform-tools/adb','emulator/emulator']){
  const file=path.join(sdk,relative);mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,'#!/bin/sh\nexit 0\n');chmodSync(file,0o755);
 }
 const env={PATH:process.env.PATH,FARMSLOT_MACHINE:'example-node',ANDROID_HOME:sdk,ANDROID_AVD_HOME:avd};
 return {root,env,run:(platform,override={})=>spawnSync('bash',[check,root,platform],{env:{...env,...override},encoding:'utf8',timeout:2000})};
}
test('configured Android SDK paths with spaces pass before bootstrap',t=>{const f=fixture(t);const r=f.run('android');assert.equal(r.status,0,r.stderr);});
for(const key of ['ANDROID_HOME','ANDROID_AVD_HOME'])test(`missing ${key} fails with node and setting`,t=>{const f=fixture(t);const r=f.run('android',{[key]:''});assert.notEqual(r.status,0);assert.match(r.stderr,new RegExp(`on example-node, set ${key}`));});
test('iOS preparation does not require an Android SDK',t=>{const f=fixture(t);const r=f.run('ios',{ANDROID_HOME:'',ANDROID_AVD_HOME:''});assert.equal(r.status,0,r.stderr);});

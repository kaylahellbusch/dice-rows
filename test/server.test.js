import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';

test('HTTP multiplayer, validation, revisions, reconnect and disk persistence', async t => {
 const data=mkdtempSync(join(tmpdir(),'dice-rows-test-')); let child;
 async function start(){
  child=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'0',HOST:'127.0.0.1',DATA_DIR:data},stdio:['ignore','pipe','pipe']});
  const chunk=await new Promise((resolve,reject)=>{ child.stdout.once('data',resolve); child.once('error',reject); child.once('exit',code=>reject(new Error(`Test server exited (${code}); check local network permissions.`))); }); const port=String(chunk).match(/:(\d+)/)?.[1]; return `http://127.0.0.1:${port}`;
 }
 t.after(async()=>{if(child.exitCode===null){child.kill();await once(child,'exit');}rmSync(data,{recursive:true,force:true});});
 let base=await start();
 async function post(path,data,token){const r=await fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});return {status:r.status,body:await r.json()};}
 assert.equal((await post('create',{name:' '})).status,400);
 const host=(await post('create',{name:'Robin'})).body;assert.match(host.code,/^\d{6}$/);
 const guest=(await post('join',{name:'Jules',code:host.code})).body;
 assert.equal((await post('join',{name:'Jules',code:host.code})).status,400);
 assert.equal((await post('join',{name:'Other',code:'000000'})).status,400);
 assert.equal((await post('action',{code:host.code,revision:1,action:{type:'start'}},guest.token)).status,400);
 assert.equal((await post('action',{code:host.code,revision:0,action:{type:'start'}},host.token)).status,409);
 const started=(await post('action',{code:host.code,revision:1,action:{type:'start'}},host.token)).body;
 assert.equal(started.status,'playing'); assert.equal(JSON.stringify(started).includes(host.token),false);
 assert.equal((await post('join',{name:'Late',code:host.code})).status,400);
 const wrong=await fetch(base+'/api/state?code='+host.code,{headers:{Authorization:'Bearer wrong'}});assert.equal(wrong.status,400);
 const rolled=(await post('action',{code:host.code,revision:started.revision,action:{type:'roll'}},host.token)).body;assert.equal(rolled.phase,'white');
 assert.equal((await post('action',{code:host.code,revision:rolled.revision,action:{type:'roll'}},host.token)).status,400);
 child.kill();await once(child,'exit');base=await start();
 const restored=await fetch(base+'/api/state?code='+host.code,{headers:{Authorization:'Bearer '+guest.token}}).then(r=>r.json());
 assert.equal(restored.me,guest.state.me);assert.deepEqual(restored.dice,rolled.dice);assert.equal(restored.phase,'white');
 assert.equal((await fetch(base+'/../server.js')).status,404);
});

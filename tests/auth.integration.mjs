// A real local Next/Workers-D1 flow with a fake Resend server. No email leaves this machine.
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import path from 'node:path';

const base='http://127.0.0.1:3002';
const mail=new Map();
const resetLinks=new Map();
const capture={fail:false,count:0};
const server=http.createServer(async(req,res)=>{
  let text='';for await(const chunk of req)text+=chunk;
  const body=JSON.parse(text);
  assert.equal(req.headers.authorization,'Bearer local-test-key');
  assert.match(req.headers['idempotency-key'],/^bantan-(verification|password-reset)\//);
  capture.count++;
  if(capture.fail){res.writeHead(503,{'Content-Type':'application/json'});res.end('{}');return;}
  if(req.headers['idempotency-key'].startsWith('bantan-password-reset/'))resetLinks.set(body.to[0],body.text.match(/http:\/\/127\.0\.0\.1:\d+\/reset-password#token=[a-f0-9]{64}/)[0]);
  else mail.set(body.to[0],body.text.match(/код: (\d{6})/)[1]);
  res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({id:crypto.randomUUID()}));
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const mailPort=server.address().port;
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3002'],{
  cwd:process.cwd(),env:{...process.env,RESEND_API_KEY:'local-test-key',EMAIL_FROM:'Bantan Test <test@example.test>',RESEND_TEST_URL:`http://127.0.0.1:${mailPort}/emails`},stdio:['ignore','pipe','pipe'],
});
let output='';for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{output=(output+chunk).slice(-12000);});
async function request(route,body,cookie='',origin=base){
  const response=await fetch(base+route,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
function sql(command){return JSON.parse(execFileSync(process.execPath,[path.join('node_modules','wrangler','bin','wrangler.js'),'d1','execute','bantan-tv-db','--local','--json','--command',command],{encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false'}}));}
const stamp=Date.now();
const password='Local-only-test-password-9384';
async function signup(suffix){
  const email=`verify-${stamp}-${suffix}@example.test`;
  const response=await request('/api/auth/register',{fullName:'Verification QA',email,password});
  assert.equal(response.status,202,JSON.stringify(response.data));
  assert.equal(response.data.verificationRequired,true);
  assert.equal(response.cookie,undefined,'Unverified signup must not issue a session');
  assert(!('code' in response.data));
  return {...response,email,id:response.data.challengeId};
}
try {
  let ready=false;
  for(let i=0;i<90;i++){
    if(child.exitCode!==null)throw new Error('Test dev server stopped: '+output);
    try{const r=await fetch(base+'/api/auth/session',{signal:AbortSignal.timeout(2000)});if(r.ok){ready=true;break;}}catch{}
    await delay(500);
  }
  assert(ready,'Test server did not start');
  const owner=await signup('owner');
  assert(owner.data.sent);
  const code=mail.get(owner.email);assert.match(code,/^\d{6}$/);
  const beforeLogin=capture.count;
  assert.equal((await request('/api/auth/login',{email:owner.email,password})).status,403);
  assert.equal(capture.count,beforeLogin,'Unverified login must not send an email');
  assert.equal((await request('/api/trees',{action:'create',title:'Unverified'})).status,401);
  assert.equal((await request('/api/auth/resend-verification',{challengeId:owner.id})).status,429);
  const wrong=code==='000000'?'111111':'000000';
  assert.equal((await request('/api/auth/verify-email',{challengeId:owner.id,code:wrong})).status,400);
  assert.equal((await request('/api/auth/verify-email',{challengeId:owner.id,code},'','https://other.example')).status,403);
  const verified=await request('/api/auth/verify-email',{challengeId:owner.id,code});
  assert.equal(verified.status,200,JSON.stringify(verified.data));assert(verified.cookie);
  assert.equal((await request('/api/auth/session',null,verified.cookie)).data.authenticated,true);
  assert.equal((await request('/api/auth/verify-email',{challengeId:owner.id,code})).status,400);
  const beforeVerifiedLogin=capture.count;
  assert.equal((await request('/api/auth/login',{email:owner.email,password})).status,200);
  assert.equal(capture.count,beforeVerifiedLogin,'Verified login must not send an email');
  assert.equal((await request('/api/trees',{action:'create',title:'Verified tree'},verified.cookie)).status,200);
  // Expiry and resend rotation.
  const expired=await signup('expiry');
  const oldCode=mail.get(expired.email);
  sql(`UPDATE email_verifications SET expires_at=1,last_sent_at=${Date.now()-61000} WHERE id='${expired.id}'`);
  assert.equal((await request('/api/auth/verify-email',{challengeId:expired.id,code:oldCode})).status,400);
  const resent=await request('/api/auth/resend-verification',{challengeId:expired.id});
  assert.equal(resent.status,200);assert(resent.data.sent);
  const newCode=mail.get(expired.email);
  if(newCode!==oldCode)assert.equal((await request('/api/auth/verify-email',{challengeId:expired.id,code:oldCode})).status,400);
  const claims=await Promise.all([request('/api/auth/verify-email',{challengeId:expired.id,code:newCode}),request('/api/auth/verify-email',{challengeId:expired.id,code:newCode})]);
  assert.equal(claims.filter(r=>r.status===200).length,1,'A code must be consumable only once, including parallel requests');
  // Guess limit includes concurrent guesses; correct code is blocked afterward.
  const locked=await signup('attempts');
  const correct=mail.get(locked.email);
  const bad=correct==='000000'?'111111':'000000';
  await Promise.all(Array.from({length:5},()=>request('/api/auth/verify-email',{challengeId:locked.id,code:bad})));
  assert.equal((await request('/api/auth/verify-email',{challengeId:locked.id,code:correct})).status,400);
  // Provider failure must never report success or unlock the account.
  capture.fail=true;
  const failed=await signup('failure');
  assert.equal(failed.data.sent,false);assert(!mail.has(failed.email));
  assert.equal((await request('/api/auth/verify-email',{challengeId:failed.id,code:'123456'})).status,400);
  capture.fail=false;
  // Password reset requests never reveal whether the account exists.
  const unknown=await request('/api/auth/forgot-password',{email:`absent-${stamp}@example.test`});
  const forgot=await request('/api/auth/forgot-password',{email:owner.email});
  assert.equal(forgot.status,200);assert.deepEqual(forgot.data,unknown.data);
  const resetUrl=new URL(resetLinks.get(owner.email));
  assert.equal(resetUrl.origin,base);assert.equal(resetUrl.search,'');
  const token=new URLSearchParams(resetUrl.hash.slice(1)).get('token');
  assert.match(token,/^[a-f0-9]{64}$/);
  const resetCount=capture.count;
  await request('/api/auth/forgot-password',{email:owner.email});
  assert.equal(capture.count,resetCount,'Reset email requests must respect cooldown');
  const newPassword='New-local-only-password-3829';
  assert.equal((await request('/api/auth/reset-password',{token,password:'short'})).status,400);
  assert.equal((await request('/api/auth/reset-password',{token,password:newPassword},'','https://other.example')).status,403);
  const resetClaims=await Promise.all([request('/api/auth/reset-password',{token,password:newPassword}),request('/api/auth/reset-password',{token,password:newPassword})]);
  assert.equal(resetClaims.filter(r=>r.status===200).length,1,'Reset links are single-use under concurrency');
  assert.equal((await request('/api/auth/session',null,verified.cookie)).data.authenticated,false,'Reset revokes all previous sessions');
  assert.equal((await request('/api/auth/login',{email:owner.email,password})).status,401,'Old password must no longer work');
  const noLoginMail=capture.count;
  assert.equal((await request('/api/auth/login',{email:owner.email,password:newPassword})).status,200);
  assert.equal(capture.count,noLoginMail,'Post-reset login sends no verification email');
  sql(`UPDATE password_resets SET created_at=1 WHERE user_id=(SELECT id FROM users WHERE email='${owner.email}')`);
  await request('/api/auth/forgot-password',{email:owner.email});
  const expiredReset=new URLSearchParams(new URL(resetLinks.get(owner.email)).hash.slice(1)).get('token');
  sql(`UPDATE password_resets SET expires_at=1 WHERE user_id=(SELECT id FROM users WHERE email='${owner.email}')`);
  assert.equal((await request('/api/auth/reset-password',{token:expiredReset,password:newPassword})).status,400);
  // Provider failure returns the same generic response and creates no usable link.
  capture.fail=true;
  sql(`UPDATE password_resets SET created_at=1 WHERE user_id=(SELECT id FROM users WHERE email='${owner.email}')`);
  const failedReset=await request('/api/auth/forgot-password',{email:owner.email});
  assert.deepEqual(failedReset.data,unknown.data);capture.fail=false;
  const resetRecords=sql(`SELECT token_hash,delivered,consumed_at FROM password_resets WHERE user_id=(SELECT id FROM users WHERE email='${owner.email}')`)[0].results;
  assert(resetRecords.every(row=>row.token_hash!==token && row.token_hash!==expiredReset),'Only token hashes belong in D1');
  // Previously issued cookies stop working if signup was never completed.
  sql(`UPDATE users SET email_verified_at=NULL WHERE email='${owner.email}'`);
  const noLegacyMail=capture.count;
  const legacy=await request('/api/auth/login',{email:owner.email,password:newPassword});
  assert.equal(legacy.status,403);assert.equal(legacy.cookie,undefined);assert.equal(capture.count,noLegacyMail);
  console.log('PASS: signup-only verification, no login email, expiry, resend/guess limits, replay prevention, provider failure, password reset, concurrent single-use resets, old-password rejection and session revocation.');
} catch(error){console.error(output);throw error;}
finally {
  sql(`DELETE FROM tree_ornaments WHERE tree_id IN (SELECT id FROM trees WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'verify-${stamp}-%@example.test')); DELETE FROM trees WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'verify-${stamp}-%@example.test'); DELETE FROM email_verifications WHERE email LIKE 'verify-${stamp}-%@example.test'; DELETE FROM password_resets WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'verify-${stamp}-%@example.test'); DELETE FROM users WHERE email LIKE 'verify-${stamp}-%@example.test';`);
  if(process.platform==='win32') {
    try{execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore'});}catch{/* Already stopped. */}
  } else child.kill();
  server.close();
}

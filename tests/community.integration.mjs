// Runs only against a local dev server; creates test-only accounts in local D1.
import assert from 'node:assert/strict';
import {newGame,act} from '../lib/tetris.ts';
import {randomBytes,scryptSync} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const base=process.env.BANTAN_TEST_URL || 'http://127.0.0.1:3001';
assert.equal(new URL(base).hostname,'127.0.0.1','Integration tests must only write to a local test server');
const stamp=Date.now();
async function request(path,body,cookie='',origin=base) {
  const response=await fetch(base+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();
  return {status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const email=`bantan-qa-${stamp}@example.test`;
async function verifiedFixture(fullName,email) {
  const salt=randomBytes(16).toString('hex');
  const hash=salt+':'+scryptSync('Test-only-password-9384',salt,64).toString('hex');
  const sql=`INSERT INTO users (id,full_name,email,password_hash,created_at,email_verified_at) VALUES ('${randomBytes(12).toString('hex')}','${fullName}','${email}','${hash}',datetime('now'),datetime('now'))`;
  execFileSync(process.execPath,[path.join('node_modules','wrangler','bin','wrangler.js'),'d1','execute','bantan-tv-db','--local','--command',sql],{stdio:'pipe'});
  return request('/api/auth/login',{email,password:'Test-only-password-9384'});
}
const account=await verifiedFixture('QA Tree Owner',email);
assert.equal(account.status,200,JSON.stringify(account.data));
assert(account.cookie?.startsWith('bantan_session='));
const owner=account.cookie;
assert.equal((await request('/api/auth/session',null,owner)).data.user.email,email);
assert.equal((await request('/api/auth/login',{email,password:'incorrect'})).status,401);
assert.equal((await request('/api/auth/login',{email,password:'Test-only-password-9384'})).status,200);
assert.equal((await request('/api/auth/register',{fullName:'QA',email:'bad',password:'short'})).status,400);
assert.equal((await request('/api/auth/register',{fullName:'QA',email,password:'Test-only-password-9384'},'','https://other.example')).status,403);
const visitor=await verifiedFixture('QA Friend',`friend-${stamp}@example.test`);
assert.equal(visitor.status,200);
assert.equal((await request('/api/trees',{action:'create',title:'Guest tree'})).status,401);
const tree=await request('/api/trees',{action:'create',title:'QA • Шинэ жилийн гацуур'},owner);
assert.equal(tree.status,200,JSON.stringify(tree.data));
const treeId=tree.data.id;
assert.equal((await request('/api/trees',{action:'create',title:'Duplicate'},owner)).data.id,treeId);
const gift={action:'decorate',treeId,slot:1,kind:'heart',message:'Шинэ жилийн мэнд!'};
assert.equal((await request('/api/trees',gift,visitor.cookie)).status,200);
assert.equal((await request('/api/trees',gift,owner)).status,409);
const detail=await request(`/api/trees?id=${treeId}`);
assert.equal(detail.data.ornaments[0].message,gift.message);
assert(!JSON.stringify(detail.data).includes('@example.test'));
// Only the author and tree owner can remove an ornament.
assert.equal((await request('/api/trees',{action:'decorate',treeId,slot:2,kind:'bell',message:'Owner wish'},owner)).status,200);
const ownerGift=(await request(`/api/trees?id=${treeId}`)).data.ornaments.find(o=>o.slot===2);
assert.equal((await request('/api/trees',{action:'remove',treeId,ornamentId:ownerGift.id},visitor.cookie)).status,403);
const friendGift=detail.data.ornaments[0];
assert.equal((await request('/api/trees',{action:'remove',treeId,ornamentId:friendGift.id},owner)).status,200);
// Per-author quota is checked atomically in the INSERT statement.
for(let slot=3;slot<=7;slot++)assert.equal((await request('/api/trees',{...gift,slot},visitor.cookie)).status,200);
assert.equal((await request('/api/trees',{...gift,slot:8},visitor.cookie)).status,409);
assert.equal((await request('/api/trees',{...gift,slot:0,kind:'heart'},owner)).status,400);
assert.equal((await request('/api/trees',{...gift,slot:9,kind:'toString'},owner)).status,400);
const star=await Promise.all([request('/api/trees',{...gift,slot:0,kind:'star'},owner),request('/api/trees',{...gift,slot:0,kind:'star'},owner)]);
assert.deepEqual(star.map(r=>r.status).sort(),[200,409]);
assert.equal((await request('/api/tetris',{action:'start',rulesVersion:2})).status,401);
const run=await request('/api/tetris',{action:'start',rulesVersion:2},owner);
assert.equal(run.status,200);assert.equal(run.data.rulesVersion,2);
assert.equal((await request('/api/tetris',{action:'finish',id:run.data.id,ticks:0,moves:[]},visitor.cookie)).status,404);
const finish=await request('/api/tetris',{action:'finish',id:run.data.id,ticks:0,moves:[],score:999999},owner);
assert.equal(finish.status,200);assert.equal(finish.data.score,0);
assert.equal((await request('/api/tetris',{action:'finish',id:run.data.id,ticks:0,moves:[]},owner)).data.saved,true);
assert((await request('/api/tetris',null,owner)).data.leaders.some(row=>row.name==='QA Tree Owner'));
// Play a deterministic non-zero scoring game and verify the D1 record after a fresh GET.
const scoringRun=await request('/api/tetris',{action:'start',rulesVersion:2},owner);
const game=newGame(scoringRun.data.seed);
const replayMoves=[];
for(let piece=0;piece<100 && !game.over && game.score===0;piece++) {
  let best=null;
  for(let rotation=0;rotation<4;rotation++)for(let column=0;column<10;column++) {
    const candidate=structuredClone(game);
    const actions=[...Array(rotation).fill('rotate'),...Array(10).fill('left'),...Array(column).fill('right'),'drop'];
    actions.forEach(action=>act(candidate,action));
    let holes=0,height=0;
    for(let x=0;x<10;x++) {let filled=false;for(let y=0;y<20;y++){if(candidate.board[y][x]){if(!filled)height+=20-y;filled=true;}else if(filled)holes++;}}
    const value=candidate.score*100-holes*150-height-(candidate.over?100000:0);
    if(!best || value>best.value) best={value,actions};
  }
  for(const action of best.actions) {replayMoves.push({tick:0,action});act(game,action);}
}
assert(game.score>0);
const scored=await request('/api/tetris',{action:'finish',id:scoringRun.data.id,ticks:0,moves:replayMoves,score:999999},owner);
assert.equal(scored.status,200,JSON.stringify(scored.data));
assert.equal(scored.data.score,game.score);
assert.equal((await request('/api/tetris',null,owner)).data.best,game.score);
// Cached pre-upgrade clients retain their original replay rules.
const legacy=await request('/api/tetris',{action:'start'},owner);assert.equal(legacy.data.rulesVersion,1);
assert.equal((await request('/api/tetris',{action:'finish',id:legacy.data.id,ticks:0,moves:[{tick:0,action:'rotateCCW'}]},owner)).status,400);
assert.equal((await request('/api/tetris',{action:'finish',id:legacy.data.id,ticks:0,moves:[{tick:0,action:'rotate'},{tick:0,action:'drop'}]},owner)).status,200);
const modern=await request('/api/tetris',{action:'start',rulesVersion:2},owner);
assert.equal((await request('/api/tetris',{action:'finish',id:modern.data.id,ticks:0,moves:[{tick:0,action:'rotateCCW'}]},owner)).status,200);
assert.equal((await request('/api/tetris',{action:'start',rulesVersion:99},owner)).status,400);
assert.equal((await request('/api/auth/logout',{},owner)).status,200);
console.log('PASS: email signup/login, session, origin checks, public tree persistence, ownership, quotas, concurrent star claims, replay scoring, idempotency and leaderboard.');
console.log('QA_TREE_ID='+treeId);

import assert from 'node:assert/strict';
import {randomUUID,randomBytes,scryptSync} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {COMMUNITY_TREE_SLOTS} from '../lib/trees.ts';
const base=process.env.BANTAN_TEST_URL || 'http://127.0.0.1:3002';
assert.equal(new URL(base).hostname,'127.0.0.1','Fixtures must stay local');
assert.equal(COMMUNITY_TREE_SLOTS.length,196);
const users=[randomUUID(),randomUUID()];const password='Local-only-9384-test';
let personalId;
const sql=command=>execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','bantan-tv-db','--local','--command',command],{stdio:'pipe'});
async function request(body,cookie='',origin=base){const r=await fetch(base+'/api/trees',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
async function detail(){return (await fetch(base+'/api/trees?id=bantan-tv')).json();}
try {
  const cookies=[];
  for(const id of users){const salt=randomBytes(16).toString('hex');const hash=salt+':'+scryptSync(password,salt,64).toString('hex');const email=id+'@example.test';sql(`INSERT INTO users(id,full_name,email,password_hash,created_at,email_verified_at) VALUES('${id}','Community QA','${email}','${hash}',datetime('now'),datetime('now'))`);const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({email,password})});assert.equal(r.status,200);cookies.push(r.headers.get('set-cookie').split(';')[0]);}
  const initial=await detail();assert.equal(initial.tree.name,'Bantan TV');assert.equal(initial.tree.user_id,null);
  const free=COMMUNITY_TREE_SLOTS.map((_,i)=>i).filter(i=>i>24&&!initial.ornaments.some(o=>o.slot===i));assert(free.length>=7);
  const gift={action:'decorate',treeId:'bantan-tv',kind:'heart',message:'Нийтийн гацуурын мэндчилгээ',slot:free[0]};
  assert.equal((await request(gift)).status,401);
  assert.equal((await request(gift,cookies[0],'https://other.example')).status,403);
  const race=await Promise.all(cookies.map(cookie=>request(gift,cookie)));assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
  const winner=race[0].status===200?0:1;const loser=1-winner;
  let saved=(await detail()).ornaments.find(o=>o.slot===gift.slot);assert.equal(saved.message,gift.message);
  assert.equal((await request({action:'remove',treeId:'bantan-tv',ornamentId:saved.id},cookies[loser])).status,403);
  for(const slot of free.slice(1,5))assert.equal((await request({...gift,slot},cookies[winner])).status,200);
  assert.equal((await request({...gift,slot:free[5]},cookies[winner])).status,409);
  assert.equal((await request({...gift,slot:196},cookies[loser])).status,400);
  assert.equal((await request({...gift,slot:free[5],kind:'star'},cookies[loser])).status,400);
  assert.equal((await request({action:'remove',treeId:'bantan-tv',ornamentId:saved.id},cookies[winner])).status,200);
  assert.equal((await request({...gift,slot:free[5]},cookies[winner])).status,200);
  personalId=(await request({action:'create',title:'QA personal tree'},cookies[loser])).data.id;
  assert.equal((await request({...gift,treeId:personalId,slot:25},cookies[loser])).status,400);
  const html=await (await fetch(base+'/trees/bantan-tv')).text();assert.match(html,/Bantan TV-ийн их гацуур/);assert.match(html,/og:image/);
  assert(!JSON.stringify(await detail()).includes('@example.test'));
  console.log('PASS: 196 community positions, persistent public wishes, auth/origin protection, concurrent claims, author-only removal, quota recovery and personal-tree limits.');
} finally {
  for(const id of users){sql(`DELETE FROM community_tree_ornaments WHERE author_id='${id}'; DELETE FROM tree_ornaments WHERE author_id='${id}'; DELETE FROM trees WHERE user_id='${id}'; DELETE FROM users WHERE id='${id}';`);}
}

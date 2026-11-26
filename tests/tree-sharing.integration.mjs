import assert from 'node:assert/strict';
import sharp from 'sharp';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const base=process.env.BANTAN_SHARE_TEST_URL || 'http://127.0.0.1:3002';
assert.equal(new URL(base).hostname,'127.0.0.1','Sharing fixtures must stay local');
const treeId=randomUUID();const userId=randomUUID();
function sql(command){execFileSync(process.execPath,[path.join('node_modules','wrangler','bin','wrangler.js'),'d1','execute','bantan-tv-db','--local','--command',command],{stdio:'pipe'});}
sql(`INSERT INTO users (id,full_name,email,password_hash,created_at) VALUES ('${userId}','Sharing QA','sharing-${userId}@example.test','unused-fixture',datetime('now')); INSERT INTO trees (id,user_id,title,created_at) VALUES ('${treeId}','${userId}','Миний шинэ жилийн гацуур',datetime('now')); INSERT INTO tree_ornaments (id,tree_id,author_id,slot,kind,message,created_at) VALUES ('${randomUUID()}','${treeId}','${userId}',1,'heart','This wish must not be exported',datetime('now'));`);
try {
for(const format of ['story','card']) {
  const response=await fetch(`${base}/trees/${treeId}/share-image?format=${format}`);
  assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^image\/png/);
  const bytes=Buffer.from(await response.arrayBuffer());
  const {width,height}=await sharp(bytes).metadata();
  assert.deepEqual([width,height],format==='story'?[1080,1920]:[1200,630]);
  // A real green tree must be visible, not just a successful blank PNG.
  const point=format==='story'?{left:540,top:1000}:{left:950,top:300};
  const pixel=await sharp(bytes).extract({...point,width:1,height:1}).removeAlpha().raw().toBuffer();
  assert(pixel[1]>pixel[0]*1.4 && pixel[1]>70,`Expected rendered tree in ${format}`);
}
const missing=await fetch(`${base}/trees/no-such-tree/share-image?format=story`);
assert.equal(missing.status,404);
const html=await (await fetch(`${base}/trees/${treeId}`,{headers:{'User-Agent':'facebookexternalhit/1.1'}})).text();
assert.match(html,/property="og:image"/);assert.match(html,/property="og:image:width" content="1200"/);
assert.match(html,/name="twitter:card" content="summary_large_image"/);
assert(!html.includes('undefined/share-image'));
console.log('PASS: portrait/landscape PNG sizes, visible tree rendering, missing-tree handling, and server-rendered social metadata.');

} finally {sql(`DELETE FROM tree_ornaments WHERE tree_id='${treeId}'; DELETE FROM trees WHERE id='${treeId}'; DELETE FROM users WHERE id='${userId}';`);}

import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, act, step, replay, WIDTH, HEIGHT, SHAPES, LOCK_DELAY_TICKS, MAX_LOCK_RESETS, landingY } from '../lib/tetris.ts';

test('server replay exactly reproduces client moves and gravity',()=>{
  const seed=938429;
  const game=newGame(seed);
  const moves=[];
  for(let tick=0;tick<500 && !game.over;tick++) {
    for(const action of tick%13===0?['rotate','left','drop']:tick%5===0?['right','rotateCCW']:[]) {
      moves.push({tick:game.tick,action});act(game,action);
    }
    if(!game.over) step(game);
  }
  assert.deepEqual(replay(seed,moves,game.tick),game);
});
test('clearing four lines awards 800 and compacts the board',()=>{
  const game=newGame(42);
  game.board=Array.from({length:HEIGHT},(_,y)=>Array.from({length:WIDTH},(_,x)=>y>=16 && x!==4?2:0));
  game.piece=[[1],[1],[1],[1]];game.x=4;game.y=0;
  act(game,'drop');
  assert.equal(game.lines,4);assert.equal(game.score,800);
  assert(game.board.every(row=>row.every(cell=>cell===0)));
});
test('pieces cannot escape board boundaries',()=>{
  const game=newGame(5);
  for(let i=0;i<50;i++)act(game,'left');
  assert.equal(game.x,0);
  for(let i=0;i<50;i++)act(game,'right');
  assert.equal(game.x+game.piece[0].length,WIDTH);
});
test('replay rejects out-of-order, unknown and unbounded inputs',()=>{
  assert.throws(()=>replay(1,[{tick:2,action:'left'},{tick:1,action:'drop'}],3));
  assert.throws(()=>replay(1,[{tick:0,action:'score-million'}],0));
  assert.throws(()=>replay(1,[],20001));
  assert.throws(()=>replay(1,[{tick:5,action:'drop'}],4));
});

function floorPiece(index=2,y=18) {const g=newGame(17);g.piece=SHAPES[index].map(row=>row.slice());g.x=3;g.y=y;g.rotation=0;return g;}
test('T and I can rotate off the floor with upward SRS kicks',()=>{
  const t=floorPiece();act(t,'rotate');assert.equal(t.rotation,1);assert.equal(t.y,17);assert.equal(t.x,2);
  const i=floorPiece(0);act(i,'rotate');assert.equal(i.rotation,1);assert.equal(i.y,16);assert.equal(i.x,4);
});
test('counterclockwise rotation and I wall kicks use a stable pivot',()=>{
  const g=newGame(1);g.piece=SHAPES[0].map(r=>r.slice());g.rotation=0;act(g,'rotate');g.x=-2;
  act(g,'rotate');assert.equal(g.rotation,2);assert.equal(g.x,0);
  const t=floorPiece(2,5);const original=structuredClone(t.piece);act(t,'rotate');act(t,'rotateCCW');assert.deepEqual(t.piece,original);assert.equal(t.rotation,0);
});
test('soft drop contact has a full lock delay and cannot force an early lock',()=>{
  const g=floorPiece(1);const original=structuredClone(g.piece);
  for(let i=0;i<50;i++)act(g,'down');assert(g.board.every(r=>r.every(c=>c===0)));
  for(let i=0;i<LOCK_DELAY_TICKS-1;i++)step(g);assert.deepEqual(g.piece,original);assert.equal(g.lockTicks,8);
  act(g,'left');assert.equal(g.lockTicks,0);
  for(let i=0;i<LOCK_DELAY_TICKS;i++)step(g);assert(g.board[19].some(c=>c===2));
});
test('grounded movement resets are capped and blocked movement does not reset',()=>{
  const g=floorPiece(1);
  for(let i=0;i<MAX_LOCK_RESETS;i++){act(g,i%2?'left':'right');for(let n=0;n<8;n++)step(g);}
  assert.equal(g.lockResets,MAX_LOCK_RESETS);assert.equal(g.lockTicks,8);act(g,'left');assert.equal(g.lockTicks,8);step(g);assert(g.board[19].some(Boolean));
  const blocked=floorPiece(1);blocked.x=0;for(let i=0;i<8;i++)step(blocked);act(blocked,'left');assert.equal(blocked.lockTicks,8);step(blocked);assert(blocked.board[19].some(Boolean));
});
test('a rotated T-slot double is recognized and awarded on lock',()=>{
  const g=floorPiece(2,17);act(g,'rotate');assert.equal(g.rotation,1);
  g.board[17][3]=2;g.board[17][5]=2;
  g.board[18]=Array.from({length:10},(_,x)=>x>=3&&x<=5?0:2);
  g.board[19]=Array.from({length:10},(_,x)=>x===4?0:2);
  act(g,'rotate');assert.equal(g.rotation,2);act(g,'down');
  for(let i=0;i<LOCK_DELAY_TICKS;i++)step(g);
  assert.equal(g.lines,2);assert.equal(g.score,1200);assert.equal(g.lastClear,'T-SPIN × 2');
});
test('landing preview does not mutate state and hard drop still locks immediately',()=>{
  const g=newGame(98);const before=structuredClone(g);const y=landingY(g);assert(y>g.y);assert.deepEqual(g,before);act(g,'drop');assert(g.board.some(r=>r.some(Boolean)));
});

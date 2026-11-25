import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, act, step, replay, WIDTH, HEIGHT } from '../lib/tetris.ts';

test('server replay exactly reproduces client moves and gravity',()=>{
  const seed=938429;
  const game=newGame(seed);
  const moves=[];
  for(let tick=0;tick<500 && !game.over;tick++) {
    for(const action of tick%13===0?['rotate','left','drop']:tick%5===0?['right']:[]) {
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

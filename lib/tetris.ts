// Shared deterministic rules: scores are calculated again on the server from a replay.
export const WIDTH = 10;
export const HEIGHT = 20;
export const MAX_TICKS = 20000;
export const RULES_VERSION = 2;
export const LOCK_DELAY_TICKS = 9; // 540 ms at the shared 60 ms simulation tick.
export const MAX_LOCK_RESETS = 15;
// Fixed square matrices keep the rotation pivot stable in all four states.
export const SHAPES = [
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], [[2,2],[2,2]],
  [[0,3,0],[3,3,3],[0,0,0]], [[0,4,4],[4,4,0],[0,0,0]],
  [[5,5,0],[0,5,5],[0,0,0]], [[6,0,0],[6,6,6],[0,0,0]], [[0,0,7],[7,7,7],[0,0,0]],
];
export type Action = 'left' | 'right' | 'rotate' | 'rotateCCW' | 'down' | 'drop';
export type Move = { tick: number; action: Action };
export type Game = { board: number[][]; piece: number[][]; next: number[][]; x: number; y: number; seed: number; bag: number[]; score: number; lines: number; tick: number; rotation:number; lockTicks:number; lockResets:number; lastRotation:boolean; lastClear:string; over: boolean };

function random(state: Game) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}
function draw(state: Game) {
  if (!state.bag.length) {
    state.bag = [0, 1, 2, 3, 4, 5, 6];
    for (let i = 6; i > 0; i--) { const j = Math.floor(random(state) * (i + 1)); [state.bag[i], state.bag[j]] = [state.bag[j], state.bag[i]]; }
  }
  return SHAPES[state.bag.pop()!].map(row => row.slice());
}
export function newGame(seed: number): Game {
  const state: Game = { board: Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0)), piece: [], next: [], x: 3, y: 0, seed: seed >>> 0, bag: [], score: 0, lines: 0, tick: 0, rotation:0, lockTicks:0, lockResets:0, lastRotation:false, lastClear:'', over: false };
  state.piece = draw(state); state.next = draw(state);state.x=Math.floor((WIDTH-state.piece[0].length)/2);
  return state;
}
function fits(state: Game, piece = state.piece, x = state.x, y = state.y) {
  return piece.every((row, dy) => row.every((cell, dx) => !cell || (x + dx >= 0 && x + dx < WIDTH && y + dy >= 0 && y + dy < HEIGHT && !state.board[y + dy][x + dx])));
}
export function grounded(state:Game) {return !fits(state,state.piece,state.x,state.y+1);}
export function landingY(state:Game) {let y=state.y;while(fits(state,state.piece,state.x,y+1))y++;return y;}
// SRS offsets use screen coordinates here: positive Y points down.
const NORMAL_KICKS:Record<string,number[][]>={
  '0>1':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]], '1>0':[[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '1>2':[[0,0],[1,0],[1,1],[0,-2],[1,-2]], '2>1':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '2>3':[[0,0],[1,0],[1,-1],[0,2],[1,2]], '3>2':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '3>0':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], '0>3':[[0,0],[1,0],[1,-1],[0,2],[1,2]],
};
const I_KICKS:Record<string,number[][]>={
  '0>1':[[0,0],[-2,0],[1,0],[-2,1],[1,-2]], '1>0':[[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  '1>2':[[0,0],[-1,0],[2,0],[-1,-2],[2,1]], '2>1':[[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  '2>3':[[0,0],[2,0],[-1,0],[2,-1],[-1,2]], '3>2':[[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  '3>0':[[0,0],[1,0],[-2,0],[1,2],[-2,-1]], '0>3':[[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
};
function lock(state: Game) {
  // Three occupied corners around the T pivot after a successful rotation.
  const blocked=(x:number,y:number)=>x<0||x>=WIDTH||y<0||y>=HEIGHT||!!state.board[y][x];
  const spin=state.lastRotation && state.piece.some(row=>row.includes(3)) && [[0,0],[2,0],[0,2],[2,2]].filter(([x,y])=>blocked(state.x+x,state.y+y)).length>=3;
  state.piece.forEach((row, dy) => row.forEach((cell, dx) => { if (cell) state.board[state.y + dy][state.x + dx] = cell; }));
  const remaining = state.board.filter(row => row.some(cell => !cell));
  const cleared = HEIGHT - remaining.length;
  const level = Math.floor(state.lines / 10) + 1;
  state.score += (spin?[400,800,1200,1600][cleared]:[0,100,300,500,800][cleared]) * level;
  state.lastClear=spin?`T-SPIN${cleared?' × '+cleared:''}`:cleared?`${cleared} LINE${cleared>1?'S':''}`:'';
  state.lines += cleared;
  state.board = [...Array.from({ length: cleared }, () => Array(WIDTH).fill(0)), ...remaining];
  state.piece = state.next; state.next = draw(state); state.x = Math.floor((WIDTH - state.piece[0].length) / 2); state.y = 0;
  state.rotation=0;state.lockTicks=0;state.lockResets=0;state.lastRotation=false;
  if (!fits(state)) state.over = true;
}
export function act(state: Game, action: Action) {
  if (state.over) return;
  const wasGrounded=grounded(state);
  let adjusted=false;
  if (action === 'left' || action === 'right') {
    const x = state.x + (action === 'left' ? -1 : 1);
    if (fits(state, state.piece, x)) {state.x = x;state.lastRotation=false;adjusted=true;}
  } else if (action === 'rotate' || action==='rotateCCW') {
    if(state.piece[0][0]===2)return;
    const next=(state.rotation+(action==='rotate'?1:3))%4;
    const rotated=action==='rotate'?state.piece[0].map((_,i)=>state.piece.map(row=>row[i]).reverse()):state.piece[0].map((_,i)=>state.piece.map(row=>row[state.piece.length-1-i]));
    const table=state.piece.some(row=>row.includes(1))?I_KICKS:NORMAL_KICKS;
    for(const [dx,dy] of table[`${state.rotation}>${next}`]){
      if(fits(state,rotated,state.x+dx,state.y+dy)){state.piece=rotated;state.x+=dx;state.y+=dy;state.rotation=next;state.lastRotation=true;adjusted=true;break;}
    }
  } else if (action === 'down') {
    // Soft drop never bypasses the landing grace period.
    if (fits(state, state.piece, state.x, state.y + 1)) {state.y++;state.lastRotation=false;}
  } else if (action === 'drop') {
    const destination=landingY(state);if(destination!==state.y)state.lastRotation=false;state.y=destination;
    lock(state);return;
  }
  if(adjusted && wasGrounded && state.lockResets<MAX_LOCK_RESETS){state.lockTicks=0;state.lockResets++;}
}
export function step(state: Game) {
  if (state.over) return;
  state.tick++;
  const gravity = Math.max(2, 12 - Math.floor(state.lines / 10));
  if (state.tick % gravity === 0) {
    // Gravity does not cancel a successful rotation for T-spin detection.
    if(fits(state,state.piece,state.x,state.y+1))state.y++;
  }
  if(grounded(state)){state.lockTicks++;if(state.lockTicks>=LOCK_DELAY_TICKS)lock(state);}
  else if(state.lockResets<MAX_LOCK_RESETS)state.lockTicks=0;
  if (state.tick >= MAX_TICKS) state.over = true;
}
export function replay(seed: number, moves: Move[], ticks: number): Game {
  if (!Number.isInteger(ticks) || ticks < 0 || ticks > MAX_TICKS || moves.length > 12000) throw new Error('Invalid replay');
  const state = newGame(seed);
  let previous = -1;
  let index = 0;
  for (const move of moves) {
    if (!Number.isInteger(move.tick) || move.tick < previous || move.tick > ticks || !['left','right','rotate','rotateCCW','down','drop'].includes(move.action)) throw new Error('Invalid move');
    previous = move.tick;
  }
  while (state.tick <= ticks) {
    while (index < moves.length && moves[index].tick === state.tick) { act(state, moves[index].action); index++; }
    if (state.tick === ticks || state.over) break;
    step(state);
  }
  if (index !== moves.length || state.tick !== ticks) throw new Error('Replay ended early');
  return state;
}

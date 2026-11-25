// Shared deterministic rules: scores are calculated again on the server from a replay.
export const WIDTH = 10;
export const HEIGHT = 20;
export const MAX_TICKS = 20000;
export const SHAPES = [
  [[1, 1, 1, 1]], [[2, 2], [2, 2]], [[0, 3, 0], [3, 3, 3]],
  [[0, 4, 4], [4, 4, 0]], [[5, 5, 0], [0, 5, 5]],
  [[6, 0, 0], [6, 6, 6]], [[0, 0, 7], [7, 7, 7]],
];
export type Action = 'left' | 'right' | 'rotate' | 'down' | 'drop';
export type Move = { tick: number; action: Action };
export type Game = { board: number[][]; piece: number[][]; next: number[][]; x: number; y: number; seed: number; bag: number[]; score: number; lines: number; tick: number; over: boolean };

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
  const state: Game = { board: Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0)), piece: [], next: [], x: 3, y: 0, seed: seed >>> 0, bag: [], score: 0, lines: 0, tick: 0, over: false };
  state.piece = draw(state); state.next = draw(state);
  return state;
}
function fits(state: Game, piece = state.piece, x = state.x, y = state.y) {
  return piece.every((row, dy) => row.every((cell, dx) => !cell || (x + dx >= 0 && x + dx < WIDTH && y + dy >= 0 && y + dy < HEIGHT && !state.board[y + dy][x + dx])));
}
function lock(state: Game) {
  state.piece.forEach((row, dy) => row.forEach((cell, dx) => { if (cell) state.board[state.y + dy][state.x + dx] = cell; }));
  const remaining = state.board.filter(row => row.some(cell => !cell));
  const cleared = HEIGHT - remaining.length;
  const level = Math.floor(state.lines / 10) + 1;
  state.score += [0, 100, 300, 500, 800][cleared] * level;
  state.lines += cleared;
  state.board = [...Array.from({ length: cleared }, () => Array(WIDTH).fill(0)), ...remaining];
  state.piece = state.next; state.next = draw(state); state.x = Math.floor((WIDTH - state.piece[0].length) / 2); state.y = 0;
  if (!fits(state)) state.over = true;
}
export function act(state: Game, action: Action) {
  if (state.over) return;
  if (action === 'left' || action === 'right') {
    const x = state.x + (action === 'left' ? -1 : 1);
    if (fits(state, state.piece, x)) state.x = x;
  } else if (action === 'rotate') {
    const rotated = state.piece[0].map((_, i) => state.piece.map(row => row[i]).reverse());
    for (const offset of [0, -1, 1, -2, 2]) {
      if (fits(state, rotated, state.x + offset)) { state.piece = rotated; state.x += offset; break; }
    }
  } else if (action === 'down') {
    if (fits(state, state.piece, state.x, state.y + 1)) state.y++; else lock(state);
  } else if (action === 'drop') {
    while (fits(state, state.piece, state.x, state.y + 1)) state.y++;
    lock(state);
  }
}
export function step(state: Game) {
  if (state.over) return;
  state.tick++;
  const gravity = Math.max(2, 12 - Math.floor(state.lines / 10));
  if (state.tick % gravity === 0) act(state, 'down');
  if (state.tick >= MAX_TICKS) state.over = true;
}
export function replay(seed: number, moves: Move[], ticks: number): Game {
  if (!Number.isInteger(ticks) || ticks < 0 || ticks > MAX_TICKS || moves.length > 12000) throw new Error('Invalid replay');
  const state = newGame(seed);
  let previous = -1;
  let index = 0;
  for (const move of moves) {
    if (!Number.isInteger(move.tick) || move.tick < previous || move.tick > ticks || !['left','right','rotate','down','drop'].includes(move.action)) throw new Error('Invalid move');
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

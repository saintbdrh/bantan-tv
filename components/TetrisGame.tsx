'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { act, newGame, step, landingY, grounded, LOCK_DELAY_TICKS, RULES_VERSION, type Action, type Game, type Move } from '@/lib/tetris';

const COLORS = ['transparent', '#00c9fb', '#ffd400', '#b688ff', '#51de96', '#ff6879', '#488eff', '#ff8a42'];
type Rankings = { authenticated: boolean; best: number; leaders: { name: string; score: number }[] };
type Submission = { action: 'finish'; id: string; moves: Move[]; ticks: number };

export function TetrisGame() {
  const [game, setGame] = useState<Game>(() => newGame(1));
  const [showGhost,setShowGhost]=useState(true);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [rankings, setRankings] = useState<Rankings>({ authenticated: false, best: 0, leaders: [] });
  const [loaded, setLoaded] = useState(false);
  const [retry, setRetry] = useState<Submission | null>(null);
  const live = useRef<Game>(newGame(1));
  const moves = useRef<Move[]>([]);
  const runId = useRef<string | null>(null);
  const active = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const response = await fetch('/api/tetris', { cache: 'no-store' });
    const data = await response.json() as Rankings & {error?:string};
    if (!response.ok) throw new Error(data.error);
    setRankings(data); setLoaded(true);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/tetris', {cache:'no-store',signal:controller.signal}).then(async response=>{
      const data=await response.json() as Rankings & {error?:string};
      if(!response.ok) throw new Error(data.error);
      setRankings(data);setLoaded(true);
    }).catch(error=>{if(error.name!=='AbortError'){setMessage('Онооны самбарыг ачаалж чадсангүй. Зочноор тоглож болно.');setLoaded(true);}});
    return ()=>controller.abort();
  }, []);

  const save = useCallback(async (payload: Submission) => {
    setBusy(true);
    try {
      const response = await fetch('/api/tetris', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json() as {score:number;error?:string};
      if (!response.ok) throw new Error(data.error);
      setRetry(null); setMessage(`Тоглолт хадгалагдлаа. ${data.score} оноо!`);
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Хадгалж чадсангүй.'); setRetry(payload); }
    finally { setBusy(false); }
  }, [refresh]);

  const finish = useCallback(() => {
    if (!active.current) return;
    active.current = false; setPlaying(false); setPaused(false);
    if (runId.current) {
      const payload: Submission = { action:'finish', id:runId.current, moves:moves.current.slice(), ticks:live.current.tick };
      void save(payload);
    } else setMessage(`Тоглолт дууслаа. ${live.current.score} оноо. Нэвтэрч тогловол оноо хадгалагдана.`);
  }, [save]);

  const command = useCallback((action: Action) => {
    if (!active.current || paused) return;
    if (moves.current.length >= 12000) { finish(); return; }
    moves.current.push({ tick:live.current.tick, action });
    act(live.current, action); setGame(structuredClone(live.current));
    if (live.current.over) finish();
  }, [paused, finish]);

  useEffect(() => {
    if (!playing || paused) return;
    const timer = window.setInterval(() => {
      step(live.current); setGame(structuredClone(live.current));
      if (live.current.over) finish();
    }, 60);
    return () => window.clearInterval(timer);
  }, [playing, paused, finish]);
  useEffect(() => {
    const hide = () => { if (document.hidden && active.current) setPaused(true); };
    document.addEventListener('visibilitychange',hide);
    return () => document.removeEventListener('visibilitychange',hide);
  }, []);

  async function start() {
    setBusy(true); setMessage(''); setRetry(null);
    try {
      let seed = crypto.getRandomValues(new Uint32Array(1))[0];
      runId.current = null;
      if (rankings.authenticated) {
        const response = await fetch('/api/tetris',{ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start',rulesVersion:RULES_VERSION}) });
        const data = await response.json() as {id:string;seed:number;rulesVersion:number;error?:string};
        if (!response.ok) throw new Error(data.error);
        if(data.rulesVersion!==RULES_VERSION)throw new Error('Тоглоомоо дахин ачаална уу.');
        runId.current=data.id; seed=data.seed;
      }
      live.current=newGame(seed); moves.current=[]; active.current=true;
      setGame(structuredClone(live.current)); setPlaying(true); setPaused(false);
      boardRef.current?.focus();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Тоглолт эхлүүлэхэд алдаа гарлаа.'); }
    finally { setBusy(false); }
  }

  const cells = game.board.map(row=>row.slice());
  const ghosts=new Set<string>();const current=new Set<string>();
  if(!game.over){
    const ghostY=landingY(game);
    game.piece.forEach((row,dy)=>row.forEach((cell,dx)=>{if(cell){
      if(showGhost && !cells[ghostY+dy]?.[game.x+dx])ghosts.add(`${ghostY+dy}-${game.x+dx}`);
      current.add(`${game.y+dy}-${game.x+dx}`);
      if(cells[game.y+dy])cells[game.y+dy][game.x+dx]=cell;
    }}));
  }
  const touching=!game.over && grounded(game);

  return (
    <div className="tetris-layout">
      <div className="tetris-panel community-panel">
        <div className="tetris-stats"><div><span>ОНОО</span><strong>{game.score.toLocaleString()}</strong></div><div><span>МӨР</span><strong>{game.lines}</strong></div><div><span>ТҮВШИН</span><strong>{Math.floor(game.lines/10)+1}</strong></div></div>
        <div className="community-actions">{playing ? <><button className="live-button" onClick={()=>setPaused(p=>!p)}>{paused?'Үргэлжлүүлэх':'Түр зогсоох'}</button><button className="ghost-button" onClick={finish}>Дуусгах ба хадгалах</button></> : <button className="live-button" disabled={busy || !loaded || !!retry} onClick={start}>{busy?'Хүлээнэ үү…':'Тоглож эхлэх'}</button>}{retry && <button className="ghost-button" disabled={busy} onClick={()=>void save(retry)}>Оноо дахин хадгалах</button>}</div>
        <div className="tetris-play-area">
          <div className={`tetris-board ${touching&&playing?'landing':''}`} ref={boardRef} tabIndex={0} role="group" aria-label="Тетрис тоглох талбар. Сумнуудаар удирдана. Z зүүн, X эсвэл ↑ баруун эргүүлнэ. Space шууд түгжинэ." onKeyDown={event=>{
            const keys: Record<string,Action>={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'rotate',ArrowDown:'down',' ':'drop',z:'rotateCCW',Z:'rotateCCW',x:'rotate',X:'rotate',Control:'rotateCCW'};
            if (keys[event.key]) { event.preventDefault(); if(!event.repeat || !['rotate','rotateCCW','drop'].includes(keys[event.key]))command(keys[event.key]); }
            if (event.key.toLowerCase()==='p' && playing) { event.preventDefault();setPaused(p=>!p); }
          }}>
            {cells.flatMap((row,y)=>row.map((cell,x)=><span key={`${y}-${x}`} className={`tetris-cell ${cell?'filled':''} ${current.has(`${y}-${x}`)?'active':''} ${!cell&&ghosts.has(`${y}-${x}`)?'ghost':''}`} style={{backgroundColor:COLORS[cell]}} />))}
            {(!playing || paused) && <div className="tetris-overlay"><strong>{paused ? 'ТҮР ЗОГССОН' : game.over ? 'ТОГЛОЛТ ДУУСЛАА' : 'BANTAN BLOCKS'}</strong><span>{paused ? 'Үргэлжлүүлэх товчийг дарна уу' : 'Нэг мөр. Нэг боломж. Шинэ рекорд.'}</span></div>}
          </div>
          <div className="tetris-next"><p className="eyebrow">ДАРААГИЙН</p><div className="next-piece" style={{gridTemplateColumns:`repeat(${game.next[0].length}, 20px)`}}>{game.next.flatMap((row,y)=>row.map((cell,x)=><span key={`${y}-${x}`} style={{background:COLORS[cell]}} />))}</div><p>← → шилжүүлэх<br/>↑ / X баруун эргүүлэх<br/>Z / Ctrl зүүн эргүүлэх<br/>↓ зөөлөн буулгах<br/>Space шууд түгжих<br/>P түр зогсоох</p><label className="tetris-ghost-toggle"><input type="checkbox" checked={showGhost} onChange={event=>setShowGhost(event.target.checked)}/> Буулгах сүүдэр</label></div>
        </div>
        <div className="tetris-controls" aria-label="Тоглоомын удирдлага">{([['left','←'],['rotateCCW','↶'],['rotate','↻'],['right','→'],['down','↓'],['drop','⤓']] as [Action,string][]).map(([action,label])=><button type="button" className="ghost-button" key={action} aria-label={{left:'Зүүн',right:'Баруун',rotate:'Баруун эргүүлэх',rotateCCW:'Зүүн эргүүлэх',down:'Зөөлөн буулгах',drop:'Шууд түгжих'}[action]} disabled={!playing || paused} onClick={()=>{command(action);boardRef.current?.focus({preventScroll:true});}}>{label}</button>)}</div>
        <div className="tetris-lock-meter" role="progressbar" aria-label="Газардсан блокийн түгжих хугацаа" aria-valuemin={0} aria-valuemax={LOCK_DELAY_TICKS} aria-valuenow={touching?game.lockTicks:0}><span style={{width:`${touching?game.lockTicks/LOCK_DELAY_TICKS*100:0}%`}}/></div><p className="tetris-lock-instructions">Газардсаны дараа 0.54 секунд шилжүүлэх, эргүүлэх боломжтой. Space / ⤓ шууд түгжинэ.</p><p className="tetris-clear-notice" role="status">{game.lastClear || 'Сүүдрээр байрлалаа тааруулаарай · Space шууд түгжинэ'}</p>
        <p className="community-status" role="status">{message}</p>
        {!rankings.authenticated && <p className="community-muted">Зочноор тоглож болно. <Link href="/login?next=/games">Нэвтэрч</Link> хувийн рекордоо хадгалаарай.</p>}
      </div>
      <aside className="community-panel leaderboard"><p className="eyebrow">HALL OF FAME</p><h2>Шилдэг тоглогчид</h2><div className="personal-best"><span>Таны дээд оноо</span><strong>{rankings.best.toLocaleString()}</strong></div>{rankings.leaders.length ? <ol>{rankings.leaders.map((leader,i)=><li key={`${leader.name}-${i}`}><span className="rank-number">{String(i+1).padStart(2,'0')}</span><span>{leader.name}</span><strong>{leader.score.toLocaleString()}</strong></li>)}</ol> : <p className="community-muted">Анхны рекордын эзэн болоорой.</p>}<p className="community-muted">Хүн бүрийн хамгийн өндөр оноог харуулна.</p></aside>
    </div>
  );
}

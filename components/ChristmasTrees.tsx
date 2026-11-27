'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ORNAMENTS, treeSlots, COMMUNITY_TREE_ID, COMMUNITY_TREE_SLOTS, type Ornament, type OrnamentKind, type Tree } from '@/lib/trees';
import { TreeShareControls } from '@/components/TreeShareControls';

type Data = { trees?: Tree[]; mine?: {id:string}|null; tree?:Tree; ornaments?:Ornament[]; userId:string|null };

export function ChristmasTrees({ id, embedded=false }: {id?:string;embedded?:boolean}) {
  const board=useRef<HTMLDivElement>(null);
  const [data,setData]=useState<Data|null>(null);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [title,setTitle]=useState('');
  const [expanded,setExpanded]=useState(false);
  const [selected,setSelected]=useState<number|null>(null);
  const [kind,setKind]=useState<OrnamentKind>('bauble');
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(true);
  const load=useCallback(async()=>{
    const response=await fetch(`/api/trees${id?`?id=${encodeURIComponent(id)}`:''}`,{cache:'no-store'});
    const body=await response.json() as Data & {error?:string};
    if (!response.ok) throw new Error(body.error);
    setData(body);setLoading(false);
  },[id]);
  useEffect(()=>{
    const controller=new AbortController();
    fetch(`/api/trees${id?`?id=${encodeURIComponent(id)}`:''}`,{cache:'no-store',signal:controller.signal}).then(async response=>{
      const body=await response.json() as Data & {error?:string};
      if(!response.ok)throw new Error(body.error);
      setData(body);setLoading(false);
    }).catch(error=>{if(error.name!=='AbortError'){setError(error.message);setLoading(false);}});
    return()=>controller.abort();
  },[id]);

  useEffect(()=>{const element=board.current;if(id===COMMUNITY_TREE_ID && element)element.scrollLeft=(element.scrollWidth-element.clientWidth)/2;},[id,data?.tree?.id,expanded]);

  async function mutate(body:Record<string,unknown>) {
    setBusy(true);setError('');setNotice('');
    try {
      const response=await fetch('/api/trees',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const result=await response.json() as {id?:string;error?:string};
      if(!response.ok) throw new Error(result.error);
      if(body.action==='create') { window.location.href=`/trees/${result.id}`;return; }
      await load();setMessage('');setSelected(null);
      setNotice(body.action==='remove'?'Чимэглэлийг авлаа.':'Таны чимэглэл, мэндчилгээ нэмэгдлээ!');
    } catch(error) {setError(error instanceof Error?error.message:'Алдаа гарлаа.');}
    finally {setBusy(false);}
  }

  const community=id===COMMUNITY_TREE_ID;
  const slots=treeSlots(id ?? '');
  const ornament=data?.ornaments?.find(item=>item.slot===selected);
  const mine=data?.userId && data?.tree?.user_id===data.userId;
  return <>
    {loading && <p role="status">Гацуурыг ачаалж байна…</p>}
    {error && <div className="community-error" role="alert">{error} {!data && <button className="ghost-button" onClick={()=>{setError('');void load().catch(e=>setError(e.message));}}>Дахин ачаалах</button>}</div>}
    <p className="community-status" role="status">{notice}</p>
    {!id && data && <>
      <section className="official-tree-section" aria-label="Bantan TV-ийн их гацуур"><ChristmasTrees id={COMMUNITY_TREE_ID} embedded/></section>
      <div className="tree-welcome community-panel"><div><p className="eyebrow">A LITTLE CHRISTMAS MAGIC</p><h2>Нэг гацуур. Олон сайхан хүсэл.</h2><p>Өөрийн гацуурыг бүтээгээд найзуудтайгаа хуваалцаарай. Бусдын гацуурт чимэглэл, мэндчилгээ үлдээж болно.</p><p className="community-muted">Мэндчилгээ болон таны нэр нийтэд харагдана. Нэг гацуурт хүн бүр 5 хүртэл чимэглэл өлгөнө.</p></div><div className="tree-create">{!data.userId?<Link className="live-button" href="/login?next=/trees">Нэвтэрч гацуураа бүтээх</Link>:data.mine?<Link className="live-button" href={`/trees/${data.mine.id}`}>Миний гацуур →</Link>:<form onSubmit={event=>{event.preventDefault();void mutate({action:'create',title});}}><label htmlFor="tree-title">Гацуурын нэр</label><input id="tree-title" maxLength={60} required value={title} placeholder="Манай шинэ жилийн гацуур" onChange={event=>setTitle(event.target.value)} /><button className="live-button" disabled={busy || !title.trim()}>Гацуураа бүтээх</button></form>}</div><span className="tree-welcome-icon" aria-hidden="true">✦</span></div>
      <div className="section-header"><h2 className="section-title">Гацуурын төгөл</h2><span className="community-muted">Шинэ 30 гацуур</span></div>
      {data.trees?.length?<div className="tree-gallery">{data.trees.map(tree=><Link className="tree-preview community-panel" href={`/trees/${tree.id}`} key={tree.id}><div className="mini-tree" aria-hidden="true">🌲<span>✦</span></div><h3>{tree.title}</h3><p>{tree.name}</p><span className="tree-count">{tree.count} / 25 чимэглэл</span><span className="tree-visit">Мэндчилгээ үлдээх ↗</span></Link>)}</div>:<div className="community-panel tree-empty"><span aria-hidden="true">🌲</span><h3>Эхний гацуурыг та бүтээгээрэй.</h3><p className="community-muted">Энд найзуудын тань гацуур нэмэгдэнэ.</p></div>}
    </>}
    {id && data?.tree && <>
      <div className="tree-detail-heading"><div>{!embedded&&<Link href="/trees" className="community-muted">← Гацуурын төгөл</Link>}{community&&<p className="eyebrow">BANTAN CHRISTMAS SQUARE</p>}<h2>{data.tree.title}</h2><p>{data.tree.name} · {data.ornaments?.length ?? 0} чимэглэл</p></div><TreeShareControls id={id} title={data.tree.title} ornaments={(data.ornaments ?? []).map(({slot,kind})=>({slot,kind}))}/></div>
      {community&&<div className="official-tree-intro"><p>Бүгдээрээ нэг гацуураа гэрэлтүүлье. Чимэглэл өлгөөд, Монгол даяар дулаахан мэндчилгээ үлдээгээрэй.</p><div className="official-tree-actions"><span>{data.ornaments?.length ?? 0} / {COMMUNITY_TREE_SLOTS.length} мэндчилгээ</span><button type="button" className="live-button" disabled={busy || data.ornaments?.length===slots.length} onClick={()=>{let slot=slots.findIndex((_,index)=>index>0 && !data.ornaments?.some(item=>item.slot===index));if(slot<0 && !data.ornaments?.some(item=>item.slot===0))slot=0;if(slot<0)return;setSelected(slot);setKind(slot===0?'star':'bauble');setError('');setMessage('');document.getElementById(`ornament-editor-${id}`)?.scrollIntoView({behavior:'smooth',block:'center'});}}>Мэндчилгээ өлгөх +</button><button type="button" className="ghost-button" aria-pressed={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'Бүтнээр нь харах −':'Томруулж харах +'}</button><Link className="ghost-button" href={`/trees/${COMMUNITY_TREE_ID}`}>Их гацуурын холбоос ↗</Link></div><p className="community-muted">Гэрэл, жижиг бөмбөлгүүд нь суурь чимэглэл. Зочдын чимэглэл дээр дарж мэндчилгээг нь уншаарай.</p></div>}
      <div className={`tree-detail-layout ${community?'official-tree-layout':''}`}><div className={`christmas-scene ${community?'official-tree-scene':''}`}><div className="snow-sparkles" aria-hidden="true">✧　·　✦　　　　·　✧<br/>　　·　　　✧　　·<br/>✧　　　·　　　　✦</div><div ref={board} className={community?`official-tree-scroll ${expanded?'expanded':''}`:'personal-tree-scroll'} tabIndex={community?0:undefined} role={community?'region':undefined} aria-label={community?'Их гацуур — хажуу тийш гүйлгэж бүх байрлалыг үзнэ':undefined}><div className="tree-canvas"><svg viewBox="0 0 400 520" className="tree-art" aria-hidden="true"><defs><linearGradient id="pine" x1="0" x2="1"><stop stopColor="#0c5141"/><stop offset=".5" stopColor="#258264"/><stop offset="1" stopColor="#0a3f34"/></linearGradient><radialGradient id="snowglow"><stop stopColor="#b8e8df" stopOpacity=".25"/><stop offset="1" stopColor="#b8e8df" stopOpacity="0"/></radialGradient></defs><ellipse cx="200" cy="470" rx="190" ry="45" fill="url(#snowglow)"/><rect x="186" y="415" width="28" height="64" rx="5" fill="#815138"/><path d="M200 62 L271 178 L243 178 L300 259 L269 259 L330 345 L296 345 L365 440 Q282 468 200 447 Q118 468 35 440 L104 345 L70 345 L131 259 L100 259 L157 178 L129 178Z" fill="url(#pine)" stroke="#5ab68a" strokeOpacity=".25" strokeWidth="2"/><path d="M145 173 Q200 200 256 173 M115 254 Q200 290 286 254 M86 339 Q200 383 315 339 M57 426 Q200 471 344 426" stroke="#e3bf70" strokeWidth="3" fill="none" strokeDasharray="2 8" strokeLinecap="round"/><g fill="#ffe3a3"><circle cx="159" cy="180" r="4"/><circle cx="230" cy="184" r="4"/><circle cx="144" cy="267" r="4"/><circle cx="248" cy="270" r="4"/><circle cx="126" cy="350" r="4"/><circle cx="278" cy="352" r="4"/><circle cx="100" cy="438" r="4"/><circle cx="297" cy="440" r="4"/></g>{community&&<g fill="#ffdd91" stroke="#fff0b8" strokeWidth=".6">{COMMUNITY_TREE_SLOTS.filter((_,index)=>index>0 && index%5===0).map((point,index)=><g key={index}><circle cx={point.x*4} cy={point.y*5.2} r="5" fillOpacity=".13" stroke="none"/><circle cx={point.x*4} cy={point.y*5.2} r="3.5" fill={['#df7568','#e5bf72','#87c8b0'][index%3]}/></g>)}</g>}<ellipse cx="200" cy="483" rx="159" ry="9" fill="#c5e4e1" fillOpacity=".22"/></svg>
      {slots.map((position,slot)=>{
        const item=data.ornaments?.find(o=>o.slot===slot);
        return <button key={slot} type="button" className={`ornament-slot ${slot===0?'tree-star':''} ${item?'occupied':''} ${selected===slot?'selected':''} ${community&&!expanded&&!item&&slot>0?'overview-empty':''}`} style={{left:`${position.x}%`,top:`${position.y}%`}} aria-label={item?`${item.name}: ${item.message || ORNAMENTS[item.kind]}`:slot===0?'Оройн од өлгөх':`${slot} дугаар байрлалд чимэглэл өлгөх`} aria-pressed={selected===slot} onClick={()=>{setSelected(slot);setKind(slot===0?'star':'bauble');setMessage('');setError('');}}>{item?ORNAMENTS[item.kind]:slot===0?(community?'★':'☆'):'+'}</button>;
      })}</div></div><p className="tree-scene-caption">{community?expanded?'Хажуу тийш гүйлгэж + байрлал сонгоно уу.':'Мэндчилгээ өлгөх товчийг дарах эсвэл томруулж байрлалаа сонгоорой.':'Гацуур дээрх + тэмдгийг сонгоод чимэглээрэй.'}</p></div>
      <aside id={`ornament-editor-${id}`} className="community-panel ornament-editor"><p className="eyebrow">LEAVE A LITTLE JOY</p><h3>{ornament?'Нэгэн сайхан мэндчилгээ':selected===0?'Оройн одны эзэн болоорой':'Хүслээ өлгөөрэй'}</h3>
        {ornament?<div className="ornament-message"><span className="ornament-large">{ORNAMENTS[ornament.kind]}</span><blockquote>{ornament.message || 'Шинэ жилийн мэнд!'}</blockquote><p>— {ornament.name}</p>{data.userId && (mine || ornament.author_id===data.userId) && <button className="ghost-button" disabled={busy} onClick={()=>void mutate({action:'remove',treeId:id,ornamentId:ornament.id})}>Чимэглэлийг авах</button>}</div>:selected===null?<><p className="community-muted">Нэг чимэглэл, нэг дулаахан үг. Найзынхаа шинэ жилийг гэрэлтүүлээрэй.</p><div className="ornament-samples" aria-hidden="true">🔴　💌　🎁　🔔</div><p>Гацуур дээр байрлалаа сонгоно уу.</p></>:!data.userId?<><p>Чимэглэл нэмэхийн тулд нэвтэрнэ үү.</p><Link className="live-button" href={`/login?next=/trees/${id}`}>Нэвтрэх</Link></>:<form onSubmit={event=>{event.preventDefault();void mutate({action:'decorate',treeId:id,slot:selected,kind,message});}}>{selected!==0 && <fieldset><legend>Чимэглэл сонгох</legend><div className="ornament-picker">{Object.entries(ORNAMENTS).filter(([key])=>key!=='star').map(([key,emoji])=><button key={key} type="button" aria-label={key} aria-pressed={kind===key} className={kind===key?'selected':''} onClick={()=>setKind(key as OrnamentKind)}>{emoji}</button>)}</div></fieldset>}<label htmlFor="tree-wish">Мэндчилгээ <span className="community-muted">(заавал биш)</span></label><textarea id="tree-wish" maxLength={240} rows={4} value={message} onChange={event=>setMessage(event.target.value)} placeholder="Шинэ ондоо аз жаргалаар дүүрэн байгаарай!"/><p className="community-muted">{message.length}/240 · Таны нэр, мэндчилгээ нийтэд харагдана.</p><button className="live-button" disabled={busy}>{busy?'Өлгөж байна…':'Чимэглэл өлгөх ✦'}</button></form>}
        <p className="tree-editor-note community-muted">Хүн бүр 5 хүртэл чимэглэл нэмнэ. {community?'Та өөрийн чимэглэлийг авч болно.':'Гацуурын эзэн бүх чимэглэлийг, та өөрийн чимэглэлийг авч болно.'}</p>
      </aside></div>
    </>}
  </>;
}

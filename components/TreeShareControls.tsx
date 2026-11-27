'use client';

import { useEffect, useRef, useState } from 'react';
import { ShareTree } from '@/components/TreeShareCard';
import type { OrnamentKind } from '@/lib/trees';

type Format='story'|'threads';
const CANONICAL_ORIGIN='https://www.bantan.tv';

export function TreeShareControls({id,title,ornaments}:{id:string;title:string;ornaments:{slot:number;kind:OrnamentKind}[]}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const artwork=useRef<HTMLDivElement>(null);
  const pending=useRef<AbortController|null>(null);
  const objectUrl=useRef<string|null>(null);
  const [format,setFormat]=useState<Format>('story');
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState('');
  const [loading,setLoading]=useState(false);
  const [sharing,setSharing]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const url=`${CANONICAL_ORIGIN}/trees/${encodeURIComponent(id)}`;
  useEffect(()=>()=>{pending.current?.abort();if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);},[]);

  async function prepare(nextFormat:Format) {
    pending.current?.abort();
    const controller=new AbortController();pending.current=controller;
    setFormat(nextFormat);setFile(null);setPreview('');setError('');setNotice('');setLoading(true);
    if(objectUrl.current){URL.revokeObjectURL(objectUrl.current);objectUrl.current=null;}
    try {
      if(nextFormat==='threads'){setPreview('/images/tree-link-preview.png');return;}
      const svg=artwork.current?.querySelector('svg');
      if(!svg)throw new Error('Гацуурын зураг бэлэн биш байна.');
      const {createTreeStory}=await import('@/lib/tree-story-image');
      const blob=await createTreeStory(svg,title,ornaments.length);
      if(controller.signal.aborted)return;
      const image=new File([blob],`bantan-tree-${nextFormat}.png`,{type:'image/png'});
      objectUrl.current=URL.createObjectURL(image);setPreview(objectUrl.current);setFile(image);
    }catch(error){if(!controller.signal.aborted)setError(error instanceof Error?error.message:'Зураг үүсгэж чадсангүй.');}
    finally{if(!controller.signal.aborted)setLoading(false);}
  }
  function open(){dialog.current?.showModal();void prepare('story');}
  function close(){pending.current?.abort();dialog.current?.close();}

  async function shareImage() {
    if(!file || sharing)return;
    setSharing(true);setError('');setNotice('');
    // Start both privileged operations in the original tap; awaiting the
    // clipboard first can lose the user activation required by file sharing.
    const copied=navigator.clipboard?.writeText(url).then(()=>true,()=>false) ?? Promise.resolve(false);
    let shareResult:Promise<unknown>|null=null;
    try {
      if(navigator.canShare?.({files:[file]})) {
        shareResult=navigator.share({files:[file]}).then(()=>null,error=>error);
      } else if(objectUrl.current) {
        const link=document.createElement('a');link.href=objectUrl.current;link.download='bantan-tree-story.png';link.click();
      }
      const didCopy=await copied;
      setNotice(didCopy?'Холбоос хууллаа! Instagram Story → Stickers → Link → Paste.':'Холбоос автоматаар хуулагдсангүй. Доорх Хуулах товч эсвэл холбоосын талбарыг ашиглаарай.');
      const result=await shareResult;
      if(result && !(result instanceof DOMException && result.name==='AbortError'))setError('Зураг хуваалцах цонх нээгдсэнгүй. PNG зураг хадгалах товчийг ашиглаарай.');
      if(!shareResult && didCopy)setNotice('Зургийг татлаа, холбоосыг хууллаа. Instagram Story-д зургаа сонгоод Link sticker дээр Paste хийнэ үү.');
    } catch {setError('PNG зураг хадгалах болон Хуулах товчийг ашиглаарай.');}
    finally {setSharing(false);}
  }
  async function shareLink() {
    setError('');setNotice('');
    if(navigator.share) {
      try{await navigator.share({title,text:'Миний гацуурыг чимэглээрэй!',url});return;}
      catch(error){if(error instanceof DOMException && error.name==='AbortError')return;setNotice('Холбоос хуулах товчийг ашиглаарай.');return;}
    }
    await copyLink();
  }
  async function copyLink(){
    try{await navigator.clipboard.writeText(url);setNotice('Гацуурын холбоосыг хууллаа. Story дээр Link sticker нэмж холбоосоо оруулаарай.');}
    catch{setError('Холбоосыг доорх талбараас сонгож хуулна уу.');}
  }

  return <><div hidden ref={artwork} aria-hidden="true"><ShareTree tree={{id,title,name:'',ornaments}} width={400} height={520}/></div><button className="live-button" type="button" onClick={open}>Хуваалцах ↗</button>
    <dialog ref={dialog} className="tree-share-dialog" aria-labelledby="tree-share-title" onClick={event=>{if(event.target===dialog.current)close();}} onCancel={()=>pending.current?.abort()}>
      <div className="tree-share-header"><div><p className="eyebrow">SHARE A LITTLE MAGIC</p><h2 id="tree-share-title">Гацуураа хуваалцаарай</h2></div><button type="button" className="icon-button" aria-label="Хуваалцах цонх хаах" onClick={close}>×</button></div>
      <div className="tree-share-layout"><div className={`tree-share-preview ${format}`} aria-busy={loading}>
        {preview?<img src={preview} alt={`${title} — ${format==='story'?'Instagram Story':'Threads'} хуваалцах зураг`} width={format==='story'?1080:1200} height={format==='story'?1920:630}/>:<div className="tree-share-placeholder" role="status">{loading?'Зургийг бэлдэж байна…':'Зураг хараахан бэлэн биш байна.'}</div>}
      </div><div className="tree-share-options">
        <div className="share-format-options" role="group" aria-label="Зургийн хэмжээ"><button type="button" className={format==='story'?'selected':''} aria-pressed={format==='story'} onClick={()=>void prepare('story')}>Story <span>9:16</span></button><button type="button" className={format==='threads'?'selected':''} aria-pressed={format==='threads'} onClick={()=>void prepare('threads')}>Threads <span>Холбоос</span></button></div>
        <p className="community-muted">{format==='story'?'Instagram Story зурагт таны гацуурын одоогийн чимэглэлүүд багтана.':'Threads-д гацуурын нэр, холбоос, Bantan-гийн гацуурын ерөнхий зураг харагдана.'}</p>
        {format==='story'&&<><button type="button" className="live-button" disabled={!file || sharing} onClick={()=>void shareImage()}>{sharing?'Хуваалцаж байна…':'Холбоос хуулаад зураг хуваалцах ↗'}</button>
        {preview?<a className="ghost-button" href={preview} download={`bantan-tree-${format}.png`}>PNG зураг хадгалах ↓</a>:<button type="button" className="ghost-button" disabled={loading} onClick={()=>void prepare(format)}>{loading?'Бэлдэж байна…':'Зургийг дахин бэлдэх'}</button>}</>}
        <div className="tree-share-divider"/>
        <button type="button" className="ghost-button" onClick={()=>void shareLink()}>Холбоос хуваалцах ↗</button>
        <a className={format==='threads'?'live-button':'ghost-button'} href={`https://www.threads.com/intent/post?text=${encodeURIComponent('Миний гацуурыг чимэглээрэй!')}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">Threads дээр хуваалцах ↗</a>
        <label className="share-link-label" htmlFor="tree-share-link">Таны гацуурын холбоос</label><div className="tree-share-link-field"><input id="tree-share-link" value={url} readOnly onFocus={event=>event.target.select()}/><button type="button" onClick={()=>void copyLink()}>Хуулах</button></div>
        {format==='story'&&<ol className="tree-share-hint"><li>Дээрх товчийг дараад хуваалцах цонхноос Instagram сонгоно.</li><li>Гацуурын холбоос давхар хуулагдана.</li><li>Instagram Story → Stickers → <strong>Link</strong> дээр холбоосоо оруулна. Энэ sticker дээр дарж таны гацуурт зочилно.</li></ol>}
        {error&&<p className="auth-message" role="alert">{error}</p>}{notice&&<p className="community-status" role="status">{notice}</p>}
      </div></div>
    </dialog>
  </>;
}

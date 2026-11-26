'use client';

import { useEffect, useRef, useState } from 'react';

type Format='story'|'card';
const CANONICAL_ORIGIN='https://www.bantan.tv';

export function TreeShareControls({id,title,revision}:{id:string;title:string;revision:string}) {
  const dialog=useRef<HTMLDialogElement>(null);
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
      const response=await fetch(`/trees/${encodeURIComponent(id)}/share-image?format=${nextFormat}&v=${encodeURIComponent(revision)}`,{signal:controller.signal});
      if(!response.ok || !response.headers.get('content-type')?.includes('image/png'))throw new Error('Зураг үүсгэж чадсангүй. Дахин оролдоно уу.');
      const blob=await response.blob();
      if(controller.signal.aborted)return;
      const image=new File([blob],`bantan-tree-${nextFormat}.png`,{type:'image/png'});
      objectUrl.current=URL.createObjectURL(image);setPreview(objectUrl.current);setFile(image);
    }catch(error){if(!controller.signal.aborted)setError(error instanceof Error?error.message:'Зураг үүсгэж чадсангүй.');}
    finally{if(!controller.signal.aborted)setLoading(false);}
  }
  function open(){dialog.current?.showModal();void prepare('story');}
  function close(){pending.current?.abort();dialog.current?.close();}

  async function shareImage() {
    if(!file)return;
    if(!navigator.canShare?.({files:[file]})) {setNotice('Энэ төхөөрөмж зураг шууд хуваалцахгүй байна. Зургаа хадгалаад Instagram эсвэл Facebook Story-д оруулаарай.');return;}
    setSharing(true);setError('');setNotice('');
    try {await navigator.share({files:[file]});}
    catch(error){if(!(error instanceof DOMException && error.name==='AbortError'))setError('Хуваалцах цонх нээгдсэнгүй. Зураг хадгалах сонголтыг ашиглаарай.');}
    finally{setSharing(false);}
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

  return <><button className="live-button" type="button" onClick={open}>Хуваалцах ↗</button>
    <dialog ref={dialog} className="tree-share-dialog" aria-labelledby="tree-share-title" onClick={event=>{if(event.target===dialog.current)close();}} onCancel={()=>pending.current?.abort()}>
      <div className="tree-share-header"><div><p className="eyebrow">SHARE A LITTLE MAGIC</p><h2 id="tree-share-title">Гацуураа хуваалцаарай</h2></div><button type="button" className="icon-button" aria-label="Хуваалцах цонх хаах" onClick={close}>×</button></div>
      <div className="tree-share-layout"><div className={`tree-share-preview ${format}`} aria-busy={loading}>
        {preview?<img src={preview} alt={`${title} — ${format==='story'?'Story':'Facebook'} хуваалцах зураг`} width={format==='story'?1080:1200} height={format==='story'?1920:630}/>:<div className="tree-share-placeholder" role="status">{loading?'Зургийг бэлдэж байна…':'Зураг хараахан бэлэн биш байна.'}</div>}
      </div><div className="tree-share-options">
        <div className="share-format-options" role="group" aria-label="Зургийн хэмжээ"><button type="button" className={format==='story'?'selected':''} aria-pressed={format==='story'} onClick={()=>void prepare('story')}>Story <span>9:16</span></button><button type="button" className={format==='card'?'selected':''} aria-pressed={format==='card'} onClick={()=>void prepare('card')}>Facebook <span>1.91:1</span></button></div>
        <p className="community-muted">Instagram болон Facebook Story-д зориулсан зураг. Таны гацуурын одоогийн чимэглэлүүд багтана.</p>
        <button type="button" className="live-button" disabled={!file || sharing} onClick={()=>void shareImage()}>{sharing?'Хуваалцаж байна…':'Зураг хуваалцах ↗'}</button>
        {preview?<a className="ghost-button" href={preview} download={`bantan-tree-${format}.png`}>PNG зураг хадгалах ↓</a>:<button type="button" className="ghost-button" disabled={loading} onClick={()=>void prepare(format)}>{loading?'Бэлдэж байна…':'Зургийг дахин бэлдэх'}</button>}
        <div className="tree-share-divider"/>
        <button type="button" className="ghost-button" onClick={()=>void shareLink()}>Холбоос хуваалцах ↗</button>
        <a className="ghost-button facebook-share-link" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">Facebook дээр хуваалцах</a>
        <label className="share-link-label" htmlFor="tree-share-link">Таны гацуурын холбоос</label><div className="tree-share-link-field"><input id="tree-share-link" value={url} readOnly onFocus={event=>event.target.select()}/><button type="button" onClick={()=>void copyLink()}>Хуулах</button></div>
        <p className="tree-share-hint">Зургаа Story-д оруулаад <strong>Link sticker</strong> дээр гацуурынхаа холбоосыг нэмээрэй. Зураг өөрөө дарагддаг холбоос агуулахгүй.</p>
        {error&&<p className="auth-message" role="alert">{error}</p>}{notice&&<p className="community-status" role="status">{notice}</p>}
      </div></div>
    </dialog>
  </>;
}

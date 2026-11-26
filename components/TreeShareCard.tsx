import type { SharedTree } from '@/lib/tree-sharing';
import { TREE_SLOTS, type OrnamentKind } from '@/lib/trees';

function Decoration({kind}:{kind:OrnamentKind}) {
  if(kind==='star')return <path d="M0 -23 L6 -7 23 -7 10 4 15 21 0 11 -15 21 -10 4 -23 -7 -6 -7Z" fill="#ffe3a1" stroke="#fff3d5" strokeWidth="1.5"/>;
  if(kind==='heart')return <path d="M0 18 C-32 -2 -17 -28 0 -12 C17 -28 32 -2 0 18Z" fill="#ff6b7e" stroke="#ffb4b5" strokeWidth="1.5"/>;
  if(kind==='gift')return <g><rect x="-17" y="-10" width="34" height="28" rx="3" fill="#df5f52"/><path d="M0 -11V18 M-18 -2H18" stroke="#ffdda2" strokeWidth="5"/><path d="M0 -11C-25 -28 -15 -34 0 -11C25 -28 15 -34 0 -11" fill="none" stroke="#ffdda2" strokeWidth="3"/></g>;
  if(kind==='letter')return <g><rect x="-20" y="-14" width="40" height="28" rx="4" fill="#fff0d4"/><path d="M-18 -11L0 2 18 -11" fill="none" stroke="#d7aa76" strokeWidth="2"/><circle cy="3" r="5" fill="#d86662"/></g>;
  if(kind==='snow')return <g stroke="#dcf9ff" strokeWidth="3" strokeLinecap="round"><path d="M-16 0H16 M0 -16V16 M-12 -12L12 12 M12 -12L-12 12"/></g>;
  if(kind==='bell')return <g><path d="M-17 12C-9 2 -14 -17 0 -17C14 -17 9 2 17 12Z" fill="#eec779" stroke="#ffe8b2" strokeWidth="1.5"/><circle cy="16" r="4" fill="#ffe9b7"/><path d="M0 -20V-24" stroke="#ffe9b7" strokeWidth="3"/></g>;
  return <g><rect x="-5" y="-21" width="10" height="7" rx="2" fill="#e6c98f"/><circle r="17" fill="#e97163" stroke="#f9bd9d" strokeWidth="1.5"/><ellipse cx="-5" cy="-5" rx="4" ry="7" fill="#fff0d4" opacity=".55"/></g>;
}

function ShareTree({tree,width,height,top,left}:{tree:SharedTree;width:number;height:number;top?:number;left?:number}) {
  return <svg style={{position:'absolute',top,left,width,height}} xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 400 520">
    <defs><linearGradient id="share-pine" x1="0" x2="1"><stop stopColor="#124a3b"/><stop offset=".5" stopColor="#3a9c72"/><stop offset="1" stopColor="#104333"/></linearGradient><radialGradient id="share-glow"><stop stopColor="#75caa2" stopOpacity=".28"/><stop offset="1" stopColor="#75caa2" stopOpacity="0"/></radialGradient></defs>
    <ellipse cx="200" cy="290" rx="190" ry="220" fill="url(#share-glow)"/>
    <ellipse cx="200" cy="486" rx="165" ry="11" fill="#c4e5dc" opacity=".13"/>
    <rect x="186" y="415" width="28" height="63" rx="5" fill="#956440"/>
    <path d="M200 62 L271 178 L243 178 L300 259 L269 259 L330 345 L296 345 L365 440 Q282 468 200 447 Q118 468 35 440 L104 345 L70 345 L131 259 L100 259 L157 178 L129 178Z" fill="url(#share-pine)" stroke="#6abf90" strokeOpacity=".35" strokeWidth="1.5"/>
    <path d="M145 173 Q200 200 256 173 M115 254 Q200 290 286 254 M86 339 Q200 383 315 339 M57 426 Q200 471 344 426" stroke="#e8c77e" strokeWidth="2.5" fill="none" strokeDasharray="1 7" strokeLinecap="round"/>
    {[{x:159,y:180},{x:230,y:184},{x:144,y:267},{x:248,y:270},{x:126,y:350},{x:278,y:352},{x:100,y:438},{x:297,y:440}].map(({x,y})=><g key={x}><circle cx={x} cy={y} r="8" fill="#ffdc91" opacity=".12"/><circle cx={x} cy={y} r="3" fill="#ffe8ae"/></g>)}
    {!tree.ornaments.some(item=>item.slot===0)&&<g transform="translate(200 42)">{Decoration({kind:'star'})}</g>}
    {tree.ornaments.map(item=>{const position=TREE_SLOTS[item.slot];return position?<g key={item.slot} transform={`translate(${position.x*4} ${position.y*5.2}) scale(.82)`}>{Decoration({kind:item.kind})}</g>:null;})}
    <g transform="translate(100 468)">{Decoration({kind:'gift'})}</g><g transform="translate(298 468) scale(.8)">{Decoration({kind:'gift'})}</g>
  </svg>;
}

export function TreeShareCard({tree,story}:{tree:SharedTree;story:boolean}) {
  const width=story?1080:1200;const height=story?1920:630;
  return <div style={{display:'flex',position:'relative',width,height,background:'radial-gradient(ellipse at 50% 45%,#174b3d 0%,#0b231e 48%,#071411 100%)',color:'#fff2d8',overflow:'hidden',fontFamily:'sans-serif'}}>
    {Array.from({length:35},(_,i)=><div key={i} style={{position:'absolute',left:(i*173+37)%width,top:(i*281+73)%height,width:i%4===0?5:3,height:i%4===0?5:3,borderRadius:50,background:'#edd7a4',opacity:i%3===0?.45:.18,display:'flex'}}/>)}
    <div style={{position:'absolute',top:story?52:25,left:story?52:25,width:story?976:1150,height:story?1816:580,border:'1px solid #e8c77e40',borderRadius:story?38:24,display:'flex'}}/>
    <div style={{display:'flex',position:'absolute',top:story?112:57,left:story?94:64,alignItems:'center',gap:12}}><span style={{fontSize:story?46:31,fontWeight:700,color:'#fff'}}>bantan tv</span><span style={{display:'flex',gap:4,transform:'skew(-16deg)'}}>{['#ff5b28','#f8d85a','#70ced3'].map(color=><span key={color} style={{display:'flex',background:color,width:5,height:story?35:24}}/>)}</span></div>
    {story?<>
      <div style={{display:'flex',position:'absolute',top:238,left:110,width:860,justifyContent:'center',fontSize:22,letterSpacing:7,color:'#e1c68f'}}>BANTAN CHRISTMAS CLUB</div>
      <div style={{display:'flex',position:'absolute',top:315,left:95,width:890,justifyContent:'center',textAlign:'center',fontSize:tree.title.length>35?59:76,lineHeight:1.15,fontWeight:700,overflowWrap:'anywhere'}}>{tree.title}</div>
      {ShareTree({tree,width:650,height:845,top:600,left:215})}
      <div style={{display:'flex',position:'absolute',top:1500,left:100,width:880,justifyContent:'center',fontSize:25,color:'#d9c9ab'}}>{tree.ornaments.length} чимэглэл · Олон сайхан хүсэл</div>
      <div style={{display:'flex',position:'absolute',top:1605,left:100,width:880,justifyContent:'center',textAlign:'center',fontSize:43,fontWeight:700}}>Миний гацуурыг чимэглээрэй</div>
      <div style={{display:'flex',position:'absolute',top:1690,left:100,width:880,justifyContent:'center',fontSize:26,color:'#c5d7c9'}}>Нэг чимэглэл. Нэг дулаахан үг.</div>
      <div style={{display:'flex',position:'absolute',bottom:102,left:100,width:880,justifyContent:'center',fontSize:30,letterSpacing:4,color:'#e5c785'}}>BANTAN.TV / ГАЦУУР</div>
    </>:<>
      <div style={{display:'flex',position:'absolute',top:172,left:64,width:620,fontSize:tree.title.length>35?42:57,lineHeight:1.14,fontWeight:700,overflowWrap:'anywhere'}}>{tree.title}</div>
      <div style={{display:'flex',position:'absolute',top:342,left:66,width:570,fontSize:26,color:'#decaa3'}}>Миний гацуурыг чимэглээрэй</div>
      <div style={{display:'flex',position:'absolute',top:404,left:66,fontSize:19,color:'#b8cdbe'}}>{tree.ornaments.length} чимэглэл · Нэг дулаахан үг үлдээгээрэй.</div>
      <div style={{display:'flex',position:'absolute',bottom:57,left:66,fontSize:20,letterSpacing:4,color:'#e5c785'}}>BANTAN.TV / ГАЦУУР</div>
      {ShareTree({tree,width:415,height:540,top:47,left:743})}
    </>}
  </div>;
}

// Browser-only: no server rasterization or external images are needed.
export async function createTreeStory(svg:SVGSVGElement,title:string,count:number):Promise<Blob> {
  await document.fonts.ready;
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Энэ төхөөрөмж зураг үүсгэх боломжгүй байна.');
  const background=ctx.createRadialGradient(540,850,30,540,850,1200);
  background.addColorStop(0,'#174b3d');background.addColorStop(.6,'#0b231e');background.addColorStop(1,'#071411');
  ctx.fillStyle=background;ctx.fillRect(0,0,1080,1920);
  ctx.strokeStyle='#e8c77e55';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(52,52,976,1816,38);ctx.stroke();
  for(let i=0;i<35;i++){ctx.fillStyle=i%3===0?'#edd7a473':'#edd7a42e';ctx.beginPath();ctx.arc((i*173+37)%1080,(i*281+73)%1920,i%4===0?3:2,0,Math.PI*2);ctx.fill();}
  const text=(value:string,y:number,size:number,color='#fff2d8',weight=400)=>{ctx.font=`${weight} ${size}px Arial, sans-serif`;ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(value,540,y);};
  text('bantan tv',155,46,'#ffffff',700);
  text('BANTAN CHRISTMAS CLUB',265,24,'#e1c68f');
  ctx.font='700 68px Arial, sans-serif';
  const lines:string[]=[];let line='';
  for(const word of title.split(/\s+/)) {
    const next=line?`${line} ${word}`:word;
    if(ctx.measureText(next).width<=870){line=next;continue;}
    if(line){lines.push(line);line='';}
    for(const letter of Array.from(word)){if(ctx.measureText(line+letter).width>870 && line){lines.push(line);line='';}line+=letter;}
  }
  if(line)lines.push(line);
  lines.slice(0,3).forEach((value,index)=>text(value,370+index*80,68,'#fff2d8',700));
  const clone=svg.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute('style');clone.setAttribute('width','400');clone.setAttribute('height','520');
  const objectUrl=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'}));
  try {
    const image=new Image();image.src=objectUrl;await image.decode();ctx.drawImage(image,215,600,650,845);
  } finally {URL.revokeObjectURL(objectUrl);}
  text(`${count} чимэглэл · Олон сайхан хүсэл`,1515,27,'#d9c9ab');
  text('Миний гацуурыг чимэглээрэй',1620,43,'#fff2d8',700);
  text('Нэг чимэглэл. Нэг дулаахан үг.',1690,27,'#c5d7c9');
  // Leave the lower area clear for Instagram's real Link sticker.
  text('BANTAN.TV',1800,27,'#e5c785');
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Зураг үүсгэж чадсангүй.')),'image/png'));
}

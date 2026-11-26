import satori, { init as initSatori } from 'satori/wasm';
import initYoga from 'yoga-wasm-web';
import yogaWasm from 'yoga-wasm-web/dist/yoga.wasm';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import resvgWasm from '../node_modules/@resvg/resvg-wasm/index_bg.wasm';
import font from '../node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf';
import { TreeShareCard } from '../components/TreeShareCard';
import { ORNAMENTS } from '../lib/trees';
import type { SharedTree } from '../lib/tree-sharing';

let initialization:Promise<unknown>|undefined;
let rendering=false;

export default {
  async fetch(request:Request):Promise<Response> {
    if(request.method!=='POST')return new Response('Method not allowed',{status:405});
    // Keep WASM raster memory bounded even when the same isolate receives
    // overlapping requests. Only the main Worker can reach this service.
    if(rendering)return new Response('Renderer busy',{status:503,headers:{'Retry-After':'2'}});
    rendering=true;
    try {
      const text=await request.text();
      if(text.length>10000)return new Response('Payload too large',{status:413});
      const {tree,story}=JSON.parse(text) as {tree:SharedTree;story:boolean};
      if(!tree || typeof tree.title!=='string' || tree.title.length>60 || !Array.isArray(tree.ornaments) || tree.ornaments.length>25 || tree.ornaments.some(item=>!Number.isInteger(item.slot)||item.slot<0||item.slot>24||!Object.hasOwn(ORNAMENTS,item.kind)))return new Response('Invalid tree',{status:400});
      initialization ??= Promise.all([initYoga(yogaWasm).then(initSatori),initWasm(resvgWasm)]);
      await initialization;
      const width=story?1080:1200;const height=story?1920:630;
      const svg=await satori(TreeShareCard({tree,story:!!story}),{width,height,fonts:[{name:'sans-serif',data:font,weight:400,style:'normal'}]});
      const raster=new Resvg(svg,{fitTo:{mode:'width',value:width}});
      let image:ReturnType<typeof raster.render>|undefined;
      try {
        image=raster.render();
        const png=image.asPng().slice();
        return new Response(png as BodyInit,{headers:{'Content-Type':'image/png'}});
      } finally {
        image?.free();raster.free();
      }
    }catch(error){console.error('Tree renderer failed',error instanceof Error?error.message:'Unknown error');return new Response('Image temporarily unavailable',{status:503});}
    finally{rendering=false;}
  },
};

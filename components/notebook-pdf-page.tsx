'use client';
import {useEffect,useRef,useState} from 'react';
import type {PDFDocumentProxy,PDFDocumentLoadingTask} from 'pdfjs-dist';
import {assetUrl} from '@/lib/study-studio.mjs';
import {notebookPdfTask} from '@/lib/notebook-pdf';
export function NotebookPdfPage({assetId,sourcePage,width,height,owner,lazy=false,onReady}:{assetId:string;sourcePage:number;width:number;height:number;owner:string;lazy?:boolean;onReady?:()=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),host=useRef<HTMLDivElement>(null),readyCallback=useRef(onReady);
 useEffect(()=>{readyCallback.current=onReady},[onReady]);
 const [visible,setVisible]=useState(!lazy),[document,setDocument]=useState<PDFDocumentProxy|null>(null),[error,setError]=useState(''),[rendered,setRendered]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{if(!lazy)return;const target=host.current;if(!target)return;if(typeof IntersectionObserver==='undefined'){setVisible(true);return}const observer=new IntersectionObserver(entries=>setVisible(entries.some(e=>e.isIntersecting)),{rootMargin:'100px'});observer.observe(target);return()=>observer.disconnect()},[lazy]);
 useEffect(()=>{
  const controller=new AbortController();let cancelled=false,task:PDFDocumentLoadingTask|undefined;setDocument(null);setError('');setRendered(false);if(!visible)return;
  (async()=>{try{const response=await fetch(assetUrl(assetId),{cache:'no-store',credentials:'same-origin',signal:controller.signal});if(!response.ok)throw Error('Source PDF is unavailable.');const bytes=new Uint8Array(await response.arrayBuffer());if(cancelled)return;task=await notebookPdfTask(bytes);if(cancelled){await task.destroy();return}const password=new Promise<never>((_resolve,reject)=>{task!.onPassword=()=>reject(Error('Password protected PDF'))});const doc=await Promise.race([task.promise,password]);if(!cancelled)setDocument(doc);}catch{if(!cancelled)setError('The PDF could not load. Check the file is still in My Uploads, then retry.')}})();
  return()=>{cancelled=true;controller.abort();void task?.destroy().catch(()=>{});};
 },[assetId,owner,visible,retry]);
 useEffect(()=>{
  if(!document||!canvas.current)return;let cancelled=false;let render:any;setRendered(false);
  (async()=>{try{const page=await document.getPage(sourcePage);if(cancelled)return;const raw=page.getViewport({scale:1}),ratio=Math.min(window.devicePixelRatio||1,2),scale=Math.min(width/raw.width,height/raw.height)*ratio,viewport=page.getViewport({scale});const target=canvas.current;if(!target)return;target.width=Math.ceil(viewport.width);target.height=Math.ceil(viewport.height);render=page.render({canvas:target,viewport,background:'#ffffff'});await render.promise;if(!cancelled){setRendered(true);readyCallback.current?.();}}catch(e){if(!cancelled&&(e as Error).name!=='RenderingCancelledException')setError('This PDF page could not render. Please retry.')}})();
  return()=>{cancelled=true;render?.cancel();};
 },[document,sourcePage,width,height]);
 return <div ref={host} className="notebook-pdf-layer" aria-label={'PDF source page '+sourcePage} data-rendered={rendered?'true':'false'}><canvas key={`${assetId}:${sourcePage}:${width}:${height}`} ref={canvas} aria-hidden="true" style={{opacity:rendered?1:0}}/>{!rendered&&!error&&<span className="notebook-pdf-status" role={lazy?undefined:'status'}>Loading PDF page…</span>}{error&&<div className="notebook-pdf-status" role={lazy?undefined:'alert'}>{error}{!lazy&&<button type="button" className="studio-button" onClick={()=>setRetry(n=>n+1)}>Retry PDF</button>}</div>}</div>;
}

import type {PDFDocumentLoadingTask,PDFDocumentProxy} from 'pdfjs-dist';
import {notebookPdfTask} from './notebook-pdf';
import {pageSize} from './notebook-pages.mjs';
import {notebookTextLayout,type NotebookText} from './notebook-text';
import {assetUrl} from './study-studio.mjs';

type Stroke={kind:'stroke';points:[number,number][];width:number;color:string;opacity:number};
type ImageElement={kind:'image';x:number;y:number;w:number;h:number;assetId:string};
type Page={
 width?:number; height?:number; paper?:string; tone?:string;
 background?:{assetId:string;sourcePage:number}; elements:(Stroke|NotebookText|ImageElement)[];
};

async function privateAsset(id:string){
 const response=await fetch(assetUrl(id),{cache:'no-store',credentials:'same-origin'});
 if(!response.ok)throw Error('An original file is unavailable. Check My Uploads, then try exporting again.');
 return response;
}

function drawPaper(ctx:CanvasRenderingContext2D,page:Page,width:number,height:number){
 ctx.fillStyle=page.tone==='ivory'?'#fdf7e8':page.tone==='rose'?'#fbeded':'#ffffff';
 ctx.fillRect(0,0,width,height);
 const spacing=page.paper==='wide'?48:page.paper==='planner'?64:32;
 ctx.fillStyle='#8e6f6738';
 if(page.paper==='dotted'){
  for(let y=16;y<height;y+=32)for(let x=16;x<width;x+=32)ctx.fillRect(x,y,2,2);
  return;
 }
 if(!page.paper||page.paper==='blank')return;
 for(let y=spacing;y<height;y+=spacing)ctx.fillRect(0,y,width,1.5);
 if(page.paper==='grid'||page.paper==='planner'||page.paper==='cornell'){
  const column=page.paper==='planner'?width/7:page.paper==='cornell'?width*.27:32;
  const end=page.paper==='cornell'?column+1:width;
  for(let x=column;x<end;x+=column)ctx.fillRect(x,0,1.5,height);
 }
}

async function drawElement(ctx:CanvasRenderingContext2D,element:Stroke|NotebookText|ImageElement,pageWidth:number){
 if(element.kind==='stroke'){
  const [first,...remaining]=element.points;
  if(!first)return;
  ctx.save();
  ctx.globalAlpha=element.opacity;
  ctx.strokeStyle=ctx.fillStyle=element.color;
  ctx.lineWidth=element.width;
  ctx.lineCap=ctx.lineJoin='round';
  ctx.beginPath();
  ctx.moveTo(...first);
  for(const point of remaining)ctx.lineTo(...point);
  if(remaining.every(([x,y])=>x===first[0]&&y===first[1])){
   ctx.arc(first[0],first[1],element.width/2,0,Math.PI*2);
   ctx.fill();
  }else ctx.stroke();
  ctx.restore();
 }else if(element.kind==='text'){
  ctx.fillStyle=element.color;
  ctx.font=`${element.fontSize}px Arial, sans-serif`;
  const layout=notebookTextLayout(element,pageWidth);
  layout.lines.forEach((line,index)=>ctx.fillText(line,element.x,element.y+index*layout.lineHeight));
 }else{
  const bitmap=await createImageBitmap(await (await privateAsset(element.assetId)).blob());
  try{
   const scale=Math.min(element.w/bitmap.width,element.h/bitmap.height);
   const width=bitmap.width*scale,height=bitmap.height*scale;
   ctx.drawImage(bitmap,element.x+(element.w-width)/2,element.y+(element.h-height)/2,width,height);
  }finally{bitmap.close()}
 }
}

export async function exportNotebookPdf(title:string,pages:Page[],onProgress:(page:number)=>void){
 const {PDFDocument}=await import('pdf-lib');
 const output=await PDFDocument.create();
 output.setTitle(title);
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 if(!ctx)throw Error('This browser could not create a PDF canvas.');
 let task:PDFDocumentLoadingTask|undefined,source:PDFDocumentProxy|undefined,assetId:string|undefined;
 try{
  for(const [index,page] of pages.entries()){
   onProgress(index+1);
   const {width,height}=pageSize(page);
   const scale=Math.min(1,1600/Math.max(width,height));
   canvas.width=Math.ceil(width*scale);
   canvas.height=Math.ceil(height*scale);
   if(page.background){
    if(assetId!==page.background.assetId){
     await task?.destroy();
     assetId=page.background.assetId;
     task=await notebookPdfTask(new Uint8Array(await (await privateAsset(assetId)).arrayBuffer()));
     task.onPassword=()=>{void task?.destroy().catch(()=>{})};
     source=await task.promise;
    }
    const original=await source!.getPage(page.background.sourcePage);
    const raw=original.getViewport({scale:1});
    const viewport=original.getViewport({scale:Math.min(canvas.width/raw.width,canvas.height/raw.height)});
    await original.render({canvas,viewport,background:'#ffffff'}).promise;
    original.cleanup();
   }else{
    ctx.setTransform(scale,0,0,scale,0,0);
    drawPaper(ctx,page,width,height);
   }
   ctx.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);
   for(const element of page.elements)await drawElement(ctx,element,width);
   const image=await output.embedJpg(canvas.toDataURL('image/jpeg',.88));
   const pdfPage=output.addPage([width*.5,height*.5]);
   pdfPage.drawImage(image,{x:0,y:0,width:width*.5,height:height*.5});
  }
  return new Blob([await output.save() as Uint8Array<ArrayBuffer>],{type:'application/pdf'});
 }finally{
  await task?.destroy().catch(()=>{});
  canvas.width=0;
  canvas.height=0;
 }
}

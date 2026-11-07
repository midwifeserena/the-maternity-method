import type {PDFDocumentLoadingTask} from 'pdfjs-dist';
import {pdfPageDescriptor} from './notebook-pages.mjs';
let code:Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')>|undefined;
async function pdfCode(){
 code??=import('pdfjs-dist/legacy/build/pdf.mjs').catch(error=>{code=undefined;throw error});const pdf=await code;
 pdf.GlobalWorkerOptions.workerSrc='/pdfjs/pdf.worker.min.mjs';return pdf;
}
export async function notebookPdfTask(bytes:Uint8Array):Promise<PDFDocumentLoadingTask>{
 const pdf=await pdfCode();return pdf.getDocument({data:bytes,enableXfa:false,cMapUrl:'/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/pdfjs/standard_fonts/',wasmUrl:'/pdfjs/wasm/',useSystemFonts:true});
}
export async function inspectNotebookPdf(file:File,remaining:number){
 const task=await notebookPdfTask(new Uint8Array(await file.arrayBuffer()));
 const password=new Promise<never>((_resolve,reject)=>{task.onPassword=()=>reject(Error('Password protected PDF'))});
 try{
  const doc=await Promise.race([task.promise,password]);if(doc.numPages>remaining)throw Error(`This PDF has ${doc.numPages} pages; only ${remaining} page slots remain. Start a new notebook or use a shorter PDF.`);
  const sizes:{width:number;height:number}[]=[];for(let n=1;n<=doc.numPages;n++){const page=await doc.getPage(n),viewport=page.getViewport({scale:1});pdfPageDescriptor('00000000-0000-0000-0000-000000000001',n,viewport.width,viewport.height);sizes.push({width:viewport.width,height:viewport.height});page.cleanup();}return sizes;
 }catch(error){if(error instanceof Error&&/slots remain|unusually narrow/.test(error.message))throw error;throw Error('This PDF could not be opened. Use an unencrypted, valid PDF of up to 3 MB.');}
 finally{await task.destroy();}
}

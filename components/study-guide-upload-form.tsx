'use client';

import {useState} from 'react';
import Link from 'next/link';
import {zipSync} from 'fflate';

const pdfBatchLimit=2_800_000;

async function uploadBatch(body:Blob){
 const response=await fetch('/api/admin/study-guides/import',{
  method:'POST',headers:{'Content-Type':'application/zip'},body,
 });
 if(response.status===413)throw Error('The upload is too large. Select fewer PDFs or a ZIP under 3 MB.');
 const result=await response.json();
 if(!response.ok)throw Error(result.error);
 return result.uploaded as number;
}

export function StudyGuideUploadForm(){
 const [files,setFiles]=useState<File[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [uploaded,setUploaded]=useState(0);

 async function upload(){
  if(!files.length||busy)return;
  setBusy(true);
  setError('');
  setUploaded(0);
  try{
   if(files.length===1&&/\.zip$/i.test(files[0].name)){
    setUploaded(await uploadBatch(files[0]));
    return;
   }
   if(files.some(file=>!/\.pdf$/i.test(file.name))){
    throw Error('Choose the original PDFs or one ZIP.');
   }
   if(new Set(files.map(file=>file.name)).size!==files.length){
    throw Error('Select each PDF only once.');
   }
   const batches:File[][]=[[]];
   let bytes=0;
   for(const file of files){
    const entryBytes=file.size+1024;
    if(entryBytes>pdfBatchLimit)throw Error(`${file.name} is too large to upload.`);
    if(bytes+entryBytes>pdfBatchLimit){
     batches.push([]);
     bytes=0;
    }
    batches[batches.length-1].push(file);
    bytes+=entryBytes;
   }
   for(const batch of batches){
    const entries=await Promise.all(batch.map(async file=>[file.name,new Uint8Array(await file.arrayBuffer())] as const));
    const archive=zipSync(Object.fromEntries(entries),{level:0});
    const count=await uploadBatch(new Blob([archive]));
    setUploaded(total=>total+count);
   }
  }catch(error){
   setError(error instanceof Error?error.message:'Could not upload the study sheets.');
  }finally{
   setBusy(false);
  }
 }

 return <form className="surface max-w-xl space-y-4 p-6" onSubmit={event=>{event.preventDefault();void upload();}}>
  <label className="block text-sm font-semibold">
   Study sheet PDFs or one ZIP
   <input className="question-import-file mt-2 block w-full rounded-md" type="file" multiple
    accept=".pdf,application/pdf,.zip,application/zip" disabled={busy}
    onChange={event=>{setFiles(Array.from(event.target.files??[]));setError('');setUploaded(0);}}/>
  </label>
  {files.length>0&&<p className="text-sm">{files.length} {files.length===1?'file':'files'} selected</p>}
  <button type="submit" className="btn-primary" disabled={!files.length||busy}>{busy?'Uploading…':'Upload study sheets'}</button>
  {error&&<p role="alert">{error} You can retry the same selection.</p>}
  {uploaded>0&&<p role="status">{uploaded} study sheets uploaded. <Link className="text-mauve underline" href="/study-studio/sheets">Open Study Sheets</Link></p>}
 </form>;
}

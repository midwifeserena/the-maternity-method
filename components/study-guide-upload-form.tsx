'use client';

import {useState} from 'react';
import Link from 'next/link';

export function StudyGuideUploadForm(){
 const [file,setFile]=useState<File|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [uploaded,setUploaded]=useState(0);

 async function upload(){
  if(!file||busy)return;
  setBusy(true);
  setError('');
  setUploaded(0);
  try{
   const response=await fetch('/api/admin/study-guides/import',{
    method:'POST',headers:{'Content-Type':'application/zip'},body:file,
   });
   const result=await response.json();
   if(!response.ok)throw Error(result.error);
   setUploaded(result.uploaded);
  }catch(error){
   setError(error instanceof Error?error.message:'Could not upload the study sheets.');
  }finally{
   setBusy(false);
  }
 }

 return <form className="surface max-w-xl space-y-4 p-6" onSubmit={event=>{event.preventDefault();void upload();}}>
  <label className="block text-sm font-semibold">
   Study sheets ZIP
   <input className="question-import-file mt-2 block w-full rounded-md" type="file" accept=".zip,application/zip" disabled={busy}
    onChange={event=>{setFile(event.target.files?.[0]??null);setError('');setUploaded(0);}}/>
  </label>
  <button type="submit" className="btn-primary" disabled={!file||busy}>{busy?'Uploading…':'Upload study sheets'}</button>
  {error&&<p role="alert">{error}</p>}
  {uploaded>0&&<p role="status">{uploaded} study sheets uploaded. <Link className="text-mauve underline" href="/study-studio/sheets">Open Study Sheets</Link></p>}
 </form>;
}

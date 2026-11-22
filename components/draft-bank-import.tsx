'use client';
import {useState} from 'react';

export function DraftBankImport({csv=false}:{csv?:boolean}){
 const [file,setFile]=useState<File|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState(false);

 async function submit(){
  if(!file||busy)return;
  setBusy(true);setMessage('');setError(false);
  try{
   const response=await fetch('/api/admin/questions/draft-import'+(csv?'?format=csv':''),{
    method:'POST',headers:{'Content-Type':'text/plain'},body:file,
   });
   const result=await response.json();
   if(!response.ok)throw Error(result.error);
   setMessage(result.published+' questions published. '+result.skipped+' existing records skipped.');
  }catch(e){setError(true);setMessage(e instanceof Error?e.message:'Could not import the question file.');}
  finally{setBusy(false);}
 }

 return <details className="surface p-5 mb-6">
  <summary className="cursor-pointer rounded-md px-2 py-1 font-semibold text-mauve hover:bg-blush focus-visible:bg-blush">{csv?'Import question CSV':'Import and publish Pediatrics and maternity questions'}</summary>
  <label className="mt-4 block text-sm">{csv?'Question bank CSV file (MCQ, SATA, or bow-tie)':'Original ALLv Markdown file'}
   <input type="file" accept={csv?".csv,text/csv":".md,text/markdown,text/plain"} disabled={busy} className="question-import-file mt-2 block w-full rounded-md" onChange={e=>{
    setFile(e.target.files?.[0]??null);setMessage('');
   }}/>
  </label>
  <div className="mt-4 flex flex-wrap gap-2">
   <button type="button" className="btn-primary" disabled={!file||busy} onClick={()=>void submit()}>Upload and publish</button>
  </div>
  {busy&&<p className="mt-3 text-sm" role="status">Working…</p>}
  {message&&<p className="mt-3 text-sm" role={error?'alert':'status'}>{message}</p>}
 </details>;
}

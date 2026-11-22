'use client';
import {useState} from 'react';

export function DraftBankImport(){
 const [file,setFile]=useState<File|null>(null);
 const [preview,setPreview]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState(false);

 async function submit(checkOnly:boolean){
  if(!file||busy)return;
  setBusy(true);setMessage('');setError(false);
  try{
   const response=await fetch('/api/admin/questions/draft-import'+(checkOnly?'?preview=1':''),{
    method:'POST',headers:{'Content-Type':'text/plain'},body:file,
   });
   const result=await response.json();
   if(!response.ok)throw Error(result.error);
   setPreview(checkOnly);
   setMessage(checkOnly?'Validated 645 Pediatrics questions and 2 maternity questions.':'Drafts added: '+result.added+'. Existing records skipped: '+result.skipped+'. Refresh Question Studio to see the drafts.');
  }catch(e){setError(true);setMessage(e instanceof Error?e.message:'Could not import the draft file.');}
  finally{setBusy(false);}
 }

 return <details className="surface p-5 mb-6">
  <summary className="cursor-pointer font-semibold text-mauve">Import Pediatrics and maternity drafts</summary>
  <label className="mt-4 block text-sm">Original ALLv Markdown file
   <input type="file" accept=".md,text/markdown,text/plain" disabled={busy} className="mt-2 block w-full" onChange={e=>{
    setFile(e.target.files?.[0]??null);setPreview(false);setMessage('');
   }}/>
  </label>
  <div className="mt-4 flex flex-wrap gap-2">
   <button type="button" className="btn-outline" disabled={!file||busy} onClick={()=>void submit(true)}>Validate file</button>
   <button type="button" className="btn-primary" disabled={!preview||busy} onClick={()=>void submit(false)}>Import as drafts</button>
  </div>
  {busy&&<p className="mt-3 text-sm" role="status">Working…</p>}
  {message&&<p className="mt-3 text-sm" role={error?'alert':'status'}>{message}</p>}
 </details>;
}

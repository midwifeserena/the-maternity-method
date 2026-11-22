'use client';

import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';

export function QuestionBankReset({onReset}:{onReset:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const resetId=useRef('');
 const [available,setAvailable]=useState(false);
 const [busy,setBusy]=useState(false);
 const [conflict,setConflict]=useState(false);
 const [error,setError]=useState('');
 const [status,setStatus]=useState('');

 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/exams/progress',{signal:controller.signal,cache:'no-store'})
   .then(response=>setAvailable(response.ok)).catch(()=>{});
  return ()=>controller.abort();
 },[]);

 function open(){
  if(!resetId.current)resetId.current=crypto.randomUUID();
  setError('');
  setStatus('');
  setConflict(false);
  dialog.current?.showModal();
 }

 async function reset(){
  if(busy||conflict)return;
  setBusy(true);
  setError('');
  try{
   const response=await fetch('/api/exams/progress',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({confirmed:true,resetId:resetId.current}),
   });
   const data=await response.json();
   if(!response.ok){
    if(response.status===409){setConflict(true);resetId.current='';}
    throw Error(data.error||'Could not verify the reset. Try again.');
   }
   dialog.current?.close();
   resetId.current='';
   setStatus(data.reset?'Question Bank progress was reset. Your summary is under Past Performance.':'There were no exams to reset.');
   onReset();
  }catch(cause){
   setError(cause instanceof Error?cause.message:'Could not verify the reset. Try again.');
  }finally{
   setBusy(false);
  }
 }

 if(!available)return null;
 return <section className="mb-8">
  <button type="button" className="btn-outline" onClick={open}>Reset Question Bank progress</button>
  {status&&<p className="mt-3" role="status">{status} <Link className="text-mauve underline" href="/performance">View Performance</Link></p>}
  <dialog ref={dialog}
   className="surface m-auto w-[calc(100%-2rem)] max-w-lg p-6 text-espresso backdrop:bg-black/40"
   aria-labelledby="reset-qbank-title" aria-describedby="reset-qbank-description"
   onCancel={event=>{if(busy)event.preventDefault()}}>
   <h2 id="reset-qbank-title" className="text-2xl">Reset Question Bank progress?</h2>
   <p id="reset-qbank-description" className="mt-4">
    This permanently deletes your completed and unfinished exams, including answers and reviews. All questions become unused and your current performance starts fresh.
   </p>
   <p className="mt-3">A dated summary of your current results will be saved under Past Performance. Your Study Studio work is kept.</p>
   {error&&<p role="alert" className="mt-4 text-mauve">{error}</p>}
   <div className="mt-6 flex flex-wrap justify-end gap-3">
    <button type="button" className="btn-outline" autoFocus disabled={busy} onClick={()=>dialog.current?.close()}>Cancel</button>
    <button type="button" className="btn-primary" disabled={busy||conflict} onClick={()=>void reset()}>
     {busy?'Resetting…':'Yes, reset my progress'}
    </button>
   </div>
  </dialog>
 </section>;
}

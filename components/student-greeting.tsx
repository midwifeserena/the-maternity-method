'use client';

import {useState, type FormEvent} from 'react';
import {Heart, Pencil} from 'lucide-react';
import {createClient} from '@/lib/supabase/client';

export function StudentGreeting({initialName,dashboard=false}:{initialName:string;dashboard?:boolean}){
 const [name,setName]=useState(initialName);
 const [draft,setDraft]=useState(initialName);
 const [editing,setEditing]=useState(false);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [announcement,setAnnouncement]=useState('');

 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(saving)return;
  const next=draft.trim();
  if(next.length>60)return;
  setSaving(true);
  setError('');
  try{
   const {error}=await createClient().auth.updateUser({data:{greeting_name:next||null}});
   if(error)throw error;
   setName(next);
   setEditing(false);
   setAnnouncement('Greeting updated.');
  }catch{
   setError('Your greeting couldn’t be saved. Please try again.');
  }finally{
   setSaving(false);
  }
 }

 return <div className="min-w-0">
  <div className={'flex flex-wrap items-center gap-x-3 gap-y-2'+(dashboard?' rounded-2xl bg-[#895f48] px-4 py-2 text-[#fff9f2] shadow-sm':'')}>
   <p className={'font-display text-2xl sm:text-3xl'+(dashboard?'':' text-espresso')}>
    <span className="wrap-anywhere">{name?`Hello, ${name}`:'Welcome'}</span>{' '}
    <Heart className={dashboard?'inline-block':'inline-block text-mauve'} size={18} strokeWidth={1.6} aria-hidden="true"/>
   </p>
   {!editing&&<button type="button" className={'inline-flex min-h-10 items-center gap-1.5 px-2 text-sm font-semibold '+(dashboard?'rounded-full border border-white/55 hover:bg-white/15 focus-visible:outline-white':'rounded-lg text-mauve hover:bg-blush')} onClick={()=>{
    setDraft(name);setEditing(true);setError('');setAnnouncement('');
   }}><Pencil size={13} aria-hidden="true"/>{name?'Edit greeting':'What should we call you?'}</button>}
  </div>
  {editing&&<form className="surface mt-3 max-w-lg p-4" onSubmit={save}>
   <label className="block text-sm font-semibold" htmlFor="student-greeting-name">What should we call you?</label>
   <input id="student-greeting-name" className="mt-2 w-full rounded-lg border border-rose bg-white px-3 py-2" value={draft}
    onChange={event=>setDraft(event.target.value)} maxLength={60} placeholder="Your preferred name"
    autoComplete="nickname" autoFocus disabled={saving}/>
   <div className="mt-3 flex flex-wrap items-center gap-2">
    <button type="submit" className="btn-primary" disabled={saving||draft.trim()===name}>{saving?'Saving…':'Save greeting'}</button>
    <button type="button" className="btn-outline" disabled={saving} onClick={()=>setEditing(false)}>Cancel</button>
   </div>
   {error&&<p className="mt-2 text-sm text-mauve" role="alert">{error}</p>}
  </form>}
  <p className="sr-only" role="status">{announcement}</p>
 </div>;
}

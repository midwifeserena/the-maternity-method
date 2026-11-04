'use client';

import {useEffect,useMemo,useState} from 'react';
import {createClient} from '@/lib/supabase/client';

type Card={id:string;card_number:number;topic:string;front:string;back:string;high_yield:boolean};

export default function FlashcardsPage(){
 const [cards,setCards]=useState<Card[]>([]);
 const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
 const [error,setError]=useState('');
 const [retry,setRetry]=useState(0);
 const [topic,setTopic]=useState('All');
 const [search,setSearch]=useState('');
 const [highYield,setHighYield]=useState(false);
 const [order,setOrder]=useState<string[]>([]);
 const [position,setPosition]=useState(0);
 const [flipped,setFlipped]=useState(false);

 useEffect(()=>{
  const controller=new AbortController();
  setStatus('loading');
  (async()=>{
   try{
    const db=createClient();
    const {data:{user}}=await db.auth.getUser();
    if(controller.signal.aborted)return;
    if(!user){setError('Please sign in again to study flashcards.');setStatus('error');return}
    const loaded:Card[]=[];
    const pageSize=500;
    for(let start=0;;start+=pageSize){
     const {data,error:loadError}=await db.from('flashcard_library')
      .select('id,card_number,topic,front,back,high_yield')
      .eq('published',true).eq('review_status','approved')
      .order('card_number',{ascending:true}).order('id',{ascending:true})
      .range(start,start+pageSize-1).abortSignal(controller.signal);
     if(controller.signal.aborted)return;
     if(loadError)throw loadError;
     loaded.push(...(data??[]) as Card[]);
     if((data??[]).length<pageSize)break;
    }
    setCards(loaded);setStatus('ready');
   }catch{
    if(!controller.signal.aborted){setError('Flashcards could not load. Please try again.');setStatus('error')}
   }
  })();
  return()=>controller.abort();
 },[retry]);

 const topics=useMemo(()=>Array.from(new Set(cards.map(card=>card.topic))),[cards]);
 const filtered=useMemo(()=>{
  const term=search.trim().toLowerCase();
  return cards.filter(card=>(topic==='All'||card.topic===topic)&&(!highYield||card.high_yield)&&(!term||card.front.toLowerCase().includes(term)));
 },[cards,topic,highYield,search]);
 const deck=useMemo(()=>{
  if(!order.length)return filtered;
  const byId=new Map(filtered.map(card=>[card.id,card]));
  return order.flatMap(id=>{const card=byId.get(id);return card?[card]:[]});
 },[filtered,order]);
 const active=deck[position];
 function reset(){setOrder([]);setPosition(0);setFlipped(false)}
 function move(next:number){setPosition(next);setFlipped(false)}
 function shuffle(){
  const ids=filtered.map(card=>card.id);
  for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}
  setOrder(ids);setPosition(0);setFlipped(false);
 }

 return <div className="max-w-5xl space-y-6">
  <header>
   <p className="uppercase tracking-[.28em] font-bold text-mauve text-[11px]">The Maternity Method</p>
   <h1 className="text-4xl md:text-5xl mt-5">Flashcards</h1>
   <p className="text-sm text-espresso/70 mt-3">Choose a topic, recall the answer, then flip the card to check.</p>
  </header>
  {status==='loading'?<p className="surface p-8" role="status">Loading flashcards…</p>
   :status==='error'?<div className="surface p-8" role="alert"><p>{error}</p><button type="button" className="btn-primary mt-4" onClick={()=>setRetry(value=>value+1)}>Try again</button></div>
   :!cards.length?<p className="surface p-8" role="status">No published flashcards are available yet. Please check back soon.</p>
   :<>
    <section className="surface p-5 md:p-7 space-y-5" aria-label="Flashcard filters">
     <div className="grid sm:grid-cols-2 gap-4">
      <label className="text-sm font-semibold">Topic<select value={topic} onChange={event=>{setTopic(event.target.value);reset()}} className="block w-full mt-2 rounded-xl border border-rose/40 bg-white p-3"><option value="All">All topics</option>{topics.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
      <label className="text-sm font-semibold">Search questions<input type="search" value={search} onChange={event=>{setSearch(event.target.value);reset()}} placeholder="For example, GTPAL" className="block w-full mt-2 rounded-xl border border-rose/40 bg-white p-3"/></label>
     </div>
     <div className="flex flex-wrap justify-between gap-4 items-center">
      <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={highYield} onChange={event=>{setHighYield(event.target.checked);reset()}} className="accent-mauve"/>High-yield cards only</label>
      <p className="text-sm text-espresso/65" role="status">{filtered.length} matching cards · {cards.length} total</p>
     </div>
    </section>
    {!active?<div className="surface p-8"><p>No cards match these filters.</p><button type="button" className="btn-outline mt-4" onClick={()=>{setTopic('All');setSearch('');setHighYield(false);reset()}}>Clear filters</button></div>
     :<section className="surface p-5 md:p-8 space-y-5" aria-label="Flashcard study area">
      <div className="flex flex-wrap justify-between items-center gap-3"><span className="pill">{active.topic}</span><p className="text-sm text-espresso/65" aria-live="polite">Card {position+1} of {deck.length}</p>{active.high_yield&&<span className="pill">High yield</span>}</div>
      <button type="button" aria-pressed={flipped} aria-label={flipped?'Show question':'Show answer'} onClick={()=>setFlipped(value=>!value)} className="w-full min-h-64 rounded-2xl border border-rose/50 bg-cream p-6 md:p-10 text-left hover:border-mauve focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mauve">
       <span className="block text-xs uppercase tracking-widest font-bold text-mauve mb-5">{flipped?'Answer':'Question'}</span>
       <span className={'block whitespace-pre-wrap leading-relaxed '+(flipped?'text-base md:text-lg':'text-2xl md:text-3xl font-display')}>{flipped?active.back:active.front}</span>
       <span className="block text-xs text-espresso/55 mt-6">{flipped?'Click to return to the question':'Click to reveal the answer'}</span>
      </button>
      <div className="flex flex-wrap justify-between gap-3">
       <button type="button" className="btn-outline disabled:opacity-40" disabled={position===0} onClick={()=>move(position-1)}>← Previous</button>
       <button type="button" className="btn-primary" onClick={()=>setFlipped(value=>!value)}>{flipped?'Show question':'Show answer'}</button>
       <button type="button" className="btn-outline disabled:opacity-40" disabled={position===deck.length-1} onClick={()=>move(position+1)}>Next →</button>
      </div>
      <div className="flex flex-wrap gap-3 border-t border-rose/30 pt-5">
       <button type="button" className="btn-outline disabled:opacity-40" disabled={deck.length<2} onClick={shuffle}>Shuffle cards</button>
       <button type="button" className="btn-outline" onClick={()=>move(0)}>Start again</button>
      </div>
     </section>}
   </>}
 </div>;
}

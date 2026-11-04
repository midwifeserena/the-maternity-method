'use client';
import {useEffect,useState} from 'react';

type Card={id:string;card_number:number;topic:string;front:string;back:string;high_yield:boolean;review_status:string;published:boolean};
type Draft=Pick<Card,'card_number'|'topic'|'front'|'back'|'high_yield'>;
const input='block w-full mt-2 rounded-xl border border-rose/40 bg-white p-3 text-sm';

export function FlashcardStudio(){
 const [cards,setCards]=useState<Card[]>([]);
 const [selected,setSelected]=useState<string|null>(null);
 const [draft,setDraft]=useState<Draft>({card_number:1,topic:'Antepartum',front:'',back:'',high_yield:false});
 const [search,setSearch]=useState('');
 const [review,setReview]=useState('All');
 const [source,setSource]=useState('');
 const [message,setMessage]=useState('');
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const current=cards.find(card=>card.id===selected);
 const filtered=cards.filter(card=>(review==='All'||(review==='published'?card.published:!card.published))&&(card.front+' '+card.topic+' '+card.card_number).toLowerCase().includes(search.trim().toLowerCase()));
 function choose(card?:Card){
  setSelected(card?.id??null);
  setDraft(card?{card_number:card.card_number,topic:card.topic,front:card.front,back:card.back,high_yield:card.high_yield}:{card_number:Math.max(0,...cards.map(c=>c.card_number))+1,topic:'Antepartum',front:'',back:'',high_yield:false});
 }
 async function request(method:string,data?:unknown){
  const response=await fetch('/api/admin/flashcards',{method,cache:'no-store',headers:data?{'Content-Type':'application/json'}:undefined,body:data?JSON.stringify(data):undefined});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Flashcards could not be loaded or saved.');return result;
 }
 async function load(preferred?:string){
  const result=await request('GET');const list=result.cards as Card[];setCards(list);
  const card=list.find(c=>c.id===preferred)??list[0];
  if(card){setSelected(card.id);setDraft({card_number:card.card_number,topic:card.topic,front:card.front,back:card.back,high_yield:card.high_yield})}
  else{setSelected(null);setDraft({card_number:1,topic:'Antepartum',front:'',back:'',high_yield:false})}
 }
 useEffect(()=>{let active=true;(async()=>{try{const result=await request('GET');if(!active)return;const list=result.cards as Card[];setCards(list);const first=list[0];if(first){setSelected(first.id);setDraft({card_number:first.card_number,topic:first.topic,front:first.front,back:first.back,high_yield:first.high_yield})}}catch(error){if(active)setMessage(error instanceof Error?error.message:'Could not load cards.')}finally{if(active)setLoading(false)}})();return()=>{active=false}},[]);
 async function act(work:()=>Promise<void>){setBusy(true);setMessage('');try{await work()}catch(error){setMessage(error instanceof Error?error.message:'The request failed.')}finally{setBusy(false)}}
 async function save(){await act(async()=>{
  if(selected){await request('PATCH',{id:selected,action:'save',card:draft});await load(selected);setMessage('Changes saved as an unpublished draft. Review the saved version before publishing.')}
  else{const id=crypto.randomUUID();await request('POST',{cards:[{id,...draft}]});await load(id);setMessage('New card saved as an unpublished draft.')}
 })}
 async function publish(ids:string[],action:'approve_publish'|'unpublish'){
  await act(async()=>{await request('PATCH',{ids,action});await load(selected??undefined);setMessage(action==='approve_publish'?ids.length+' cards approved and published.':ids.length+' cards unpublished.')});
 }
 async function importCards(){await act(async()=>{
  const result=await request('POST',{source});await load(selected??undefined);setSource('');setMessage(result.inserted+' new cards imported as drafts; '+result.skipped+' existing IDs preserved.');
 })}
 const changed=current&&(['card_number','topic','front','back','high_yield'] as const).some(key=>draft[key]!==current[key]);

 return <div className="space-y-6">
  {message&&<p role="status" className="rounded-xl bg-oatmeal p-4 text-sm">{message}</p>}
  <section className="surface p-5 md:p-7 space-y-4">
   <h2 className="text-2xl">Import flashcards</h2><p className="text-sm text-espresso/65">Upload or paste CSV, JSON, or your flashcard SQL. Only card content is imported; database commands are ignored. New cards stay unpublished. Matching IDs are skipped to preserve edits.</p>
   <label className="block text-sm font-semibold">Choose an import file<input className="block mt-2 w-full text-sm" type="file" accept=".csv,.json,.sql,.txt" disabled={busy} onChange={async event=>{const file=event.target.files?.[0];if(!file)return;if(file.size>1000000){setMessage('Import files must be smaller than 1 MB.');return}setSource(await file.text());setMessage('File loaded. Check the content below, then choose Import as drafts.')}}/></label>
   <label className="block text-sm font-semibold">Import content<textarea value={source} onChange={event=>setSource(event.target.value)} rows={5} className={input+' font-mono text-xs'} placeholder="Paste flashcard SQL, CSV, or a JSON array here"/></label>
   <p className="text-xs text-espresso/60">CSV columns: card_number, topic, front, back. Optional: id and high_yield. Include IDs when you want to safely repeat an import. Maximum 1,000 cards per import.</p>
   <button type="button" className="btn-primary disabled:opacity-40" disabled={busy||!source.trim()} onClick={()=>void importCards()}>Import as drafts</button>
  </section>
  <div className="grid lg:grid-cols-[minmax(260px,35%)_1fr] gap-5 items-start">
   <aside className="surface p-5 space-y-4">
    <div className="flex justify-between gap-3 items-center"><h2 className="text-2xl">Library</h2><span className="pill">{cards.length} cards</span></div>
    <button type="button" className="btn-primary" disabled={busy} onClick={()=>{choose();setMessage('')}}>Add new card</button>
    <label className="block text-sm font-semibold">Find a card<input value={search} onChange={event=>setSearch(event.target.value)} className={input}/></label>
    <label className="block text-sm font-semibold">Publication status<select value={review} onChange={event=>setReview(event.target.value)} className={input}><option value="All">All cards</option><option value="draft">Unpublished</option><option value="published">Published</option></select></label>
    <div className="max-h-[60vh] overflow-auto space-y-2" aria-label="Flashcard list">{loading?<p>Loading cards…</p>:!filtered.length?<p className="text-sm">No cards match.</p>:filtered.map(card=><button key={card.id} type="button" disabled={busy} onClick={()=>{choose(card);setMessage('')}} aria-pressed={selected===card.id} className={'block w-full text-left rounded-xl border p-3 '+(selected===card.id?'border-mauve bg-blush':'border-rose/30 bg-white')}><span className="text-xs text-mauve">{card.topic} · {card.card_number}</span><span className="block text-sm font-semibold mt-1">{card.front}</span><span className="block text-xs mt-2">{card.published?'Published':card.review_status==='approved'?'Approved · unpublished':'Needs review'}</span></button>)}</div>
   </aside>
   <section className="surface p-5 md:p-7 space-y-5" aria-label="Flashcard editor">
    <h2 className="text-2xl">{selected?'Edit flashcard':'New flashcard'}</h2>
    <div className="grid sm:grid-cols-2 gap-4"><label className="text-sm font-semibold">Card number<input type="number" min="1" step="1" value={draft.card_number} onChange={event=>setDraft({...draft,card_number:Number(event.target.value)})} className={input}/></label><label className="text-sm font-semibold">Topic<input value={draft.topic} maxLength={80} onChange={event=>setDraft({...draft,topic:event.target.value})} className={input}/></label></div>
    <div><label htmlFor="flashcard-front" className="block text-sm font-semibold">Question (front)</label><textarea id="flashcard-front" value={draft.front} maxLength={4000} rows={4} onChange={event=>setDraft({...draft,front:event.target.value})} className={input}/></div>
    <div><label htmlFor="flashcard-back" className="block text-sm font-semibold">Answer (back)</label><textarea id="flashcard-back" value={draft.back} maxLength={12000} rows={7} onChange={event=>setDraft({...draft,back:event.target.value})} className={input}/></div>
    <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={draft.high_yield} onChange={event=>setDraft({...draft,high_yield:event.target.checked})} className="accent-mauve"/>High yield</label>
    <p className="text-xs text-espresso/60">Saving content changes returns the card to an unpublished draft. Save first, review the saved card, then approve and publish.</p>
    <div className="flex flex-wrap gap-3"><button type="button" className="btn-primary disabled:opacity-40" disabled={busy||!draft.front.trim()||!draft.back.trim()||!draft.topic.trim()} onClick={()=>void save()}>Save draft</button><button type="button" className="btn-outline disabled:opacity-40" disabled={busy||!selected||Boolean(changed)} onClick={()=>selected&&void publish([selected],'approve_publish')}>Approve &amp; publish card</button><button type="button" className="btn-outline disabled:opacity-40" disabled={busy||!selected||!current?.published} onClick={()=>selected&&void publish([selected],'unpublish')}>Unpublish card</button></div>
   </section>
  </div>
  <section className="surface p-5 md:p-7 space-y-4"><h2 className="text-2xl">Publish reviewed cards</h2><p className="text-sm text-espresso/65">These actions apply to the {filtered.length} saved cards matching your library search and publication filter. Review the content before approving it. Unsaved editor changes are not included.</p><div className="flex flex-wrap gap-3"><button type="button" className="btn-primary disabled:opacity-40" disabled={busy||!filtered.length||filtered.length>1000||Boolean(changed)} onClick={()=>void publish(filtered.map(card=>card.id),'approve_publish')}>Approve &amp; publish {filtered.length} filtered cards</button><button type="button" className="btn-outline disabled:opacity-40" disabled={busy||!filtered.length||filtered.length>1000} onClick={()=>void publish(filtered.map(card=>card.id),'unpublish')}>Unpublish filtered cards</button></div></section>
 </div>;
}

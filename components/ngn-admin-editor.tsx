'use client';
import {useEffect,useMemo,useState} from 'react';
type Case={id:string;case_number:number;topic:string;title:string;intro:string;tabs:Record<string,string>;review_status:string;published:boolean};
type Item={id:string;case_id:string;item_number:number;item_type:string;stem:string;content:Record<string,unknown>;scoring_rule:string;review_status:string;published:boolean};
type Answer={item_id:string;case_id:string;answer:Record<string,unknown>;answer_text:string;rationale:string};
type Data={cases:Case[];items:Item[];answers:Answer[]};
const input='w-full rounded-xl bg-white border border-[#DCCBC5] p-3 text-sm text-[#4E3629] focus:outline-none focus:ring-2 focus:ring-[#8E4A55]/35';
export function NgnAdminEditor(){
 const [data,setData]=useState<Data>({cases:[],items:[],answers:[]}),[selected,setSelected]=useState(''),[activeItem,setActiveItem]=useState(''),[search,setSearch]=useState('');
 const [draft,setDraft]=useState<Record<string,unknown>>({}),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [mode,setMode]=useState<'case'|'item'>('case');
 async function load(keep=true){const r=await fetch('/api/admin/ngn',{cache:'no-store'});const j=await r.json();if(!r.ok)throw Error(j.error||'Could not load cases');setData(j);const id=keep&&selected&&j.cases.some((c:Case)=>c.id===selected)?selected:j.cases[0]?.id??'';setSelected(id);return j as Data}
 useEffect(()=>{load(false).catch(e=>setStatus(e.message)).finally(()=>setLoading(false))},[]);
 const current=data.cases.find(c=>c.id===selected);
 const items=useMemo(()=>data.items.filter(i=>i.case_id===selected).sort((a,b)=>a.item_number-b.item_number),[data.items,selected]);
 const item=data.items.find(i=>i.id===activeItem&&i.case_id===selected);
 const answer=data.answers.find(a=>a.item_id===item?.id);
 const [tabDraft,setTabDraft]=useState<Record<string,string>>({});
 useEffect(()=>{setDraft({});setTabDraft(current?.tabs??{});setActiveItem('');setMode('case');setStatus('')},[selected]);
 useEffect(()=>{setDraft({});setStatus('')},[activeItem,mode]);
 const list=data.cases.filter(c=>(c.title+' '+c.topic+' '+c.case_number).toLowerCase().includes(search.toLowerCase()));
 const change=(key:string,value:unknown)=>setDraft(d=>({...d,[key]:value}));
 async function patch(kind:'case'|'item'|'answer',id:string,fields:Record<string,unknown>){
  const r=await fetch('/api/admin/ngn',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,id,fields})});const j=await r.json();if(!r.ok)throw Error(j.error||'Save failed');return j;
 }
 async function act(task:()=>Promise<void>,success:string){
  setBusy(true);setStatus('');try{await task();await load();setDraft({});setStatus(success)}catch(e){setStatus('Error: '+(e instanceof Error?e.message:String(e)))}finally{setBusy(false)}
 }
 async function saveCase(){if(!current)return;await act(async()=>{await patch('case',current.id,{...draft,tabs:tabDraft})},'Case saved as a draft. Review is required again.')}
 async function saveItem(){if(!item)return;await act(async()=>{
  const fields={...draft};
  for(const k of ['content','answer'])if(typeof fields[k]==='string'){try{fields[k]=JSON.parse(fields[k] as string)}catch{throw Error('Invalid JSON in '+k)}}
  const aFields:Record<string,unknown>={};for(const k of ['answer','answer_text','rationale'])if(k in fields){aFields[k]=fields[k];delete fields[k]}
  if(Object.keys(fields).length)await patch('item',item.id,fields);
  if(Object.keys(aFields).length)await patch('answer',item.id,aFields);
 },'Question and answer saved. Item returned to Needs Review if content changed.')}
 const field=(label:string,key:string,initial:string,multiline=false,rows=3)=><label className="block text-sm font-semibold text-[#4E3629]">{label}{multiline?<textarea rows={rows} className={input+' mt-2'} value={String(draft[key]??initial??'')} onChange={e=>change(key,e.target.value)}/>:<input className={input+' mt-2'} value={String(draft[key]??initial??'')} onChange={e=>change(key,e.target.value)}/>}</label>;
 const badge=(v:string,p:boolean)=><span className={'text-xs px-2.5 py-1 rounded-full font-semibold '+(p?'bg-[#DFEADC] text-[#3B623C]':v==='approved'?'bg-[#EEE4D0] text-[#805C2F]':'bg-[#F2E2DD] text-[#8E4A55]')}>{p?'Published':v==='approved'?'Approved':'Needs review'}</span>;
 if(loading)return <p className="p-8">Loading NGN administration…</p>;
 return <div className="grid gap-5 lg:grid-cols-[290px_1fr] items-start text-[#4E3629]">
  <aside className="rounded-2xl bg-[#FFF9F2] border border-[#E6D4CA] p-4 lg:sticky lg:top-6">
   <div className="flex justify-between items-center mb-4"><h2 className="font-display text-2xl">Case library</h2><span className="text-xs text-[#8E4A55]">{data.cases.length} cases</span></div>
   <input className={input} placeholder="Find a case…" aria-label="Find a case" value={search} onChange={e=>setSearch(e.target.value)}/>
   <div className="mt-4 space-y-2 max-h-[65vh] overflow-auto">{list.map(c=><button type="button" key={c.id} onClick={()=>setSelected(c.id)} className={'w-full text-left p-3 rounded-xl border '+(selected===c.id?'border-[#8E4A55] bg-[#E6D4CA]':'border-[#E6D4CA] bg-white hover:bg-[#F2E7DA]')}><p className="text-[11px] uppercase tracking-wider text-[#8E4A55]">{c.topic} · Case {c.case_number}</p><p className="font-semibold mt-1 text-sm">{c.title}</p><div className="mt-2">{badge(c.review_status,c.published)}</div></button>)}</div>
  </aside>
  <main className="space-y-4 min-w-0">
   {!current?<div className="rounded-2xl p-8 bg-[#FFF9F2]">No cases found. Check your Supabase import and admin access.</div>:<>
    <div className="rounded-2xl border border-[#E6D4CA] bg-[#FFF9F2] p-5 md:p-7">
     <div className="flex flex-wrap justify-between items-start gap-3"><div><p className="text-xs uppercase tracking-[.2em] text-[#8E4A55]">Case {current.case_number} · {current.topic}</p><h2 className="font-display text-3xl mt-2">{current.title}</h2></div>{badge(current.review_status,current.published)}</div>
     <div className="mt-6 flex gap-2 flex-wrap"><button onClick={()=>setMode('case')} className={'px-4 py-2 rounded-full text-sm font-semibold '+(mode==='case'?'bg-[#8E4A55] text-white':'bg-[#F2E7DA]')}>Patient chart</button><button onClick={()=>{setMode('item');if(!activeItem)setActiveItem(items[0]?.id??'')}} className={'px-4 py-2 rounded-full text-sm font-semibold '+(mode==='item'?'bg-[#8E4A55] text-white':'bg-[#F2E7DA]')}>Questions ({items.length})</button></div>
    </div>
    {mode==='case'?<section className="rounded-2xl border border-[#E6D4CA] bg-[#FFF9F2] p-5 md:p-7 space-y-5">
     <h3 className="font-display text-2xl">Patient chart details</h3>
     {field('Case title','title',current.title)}
     <label className="block text-sm font-semibold">Category<select className={input+' mt-2'} value={String(draft.topic??current.topic)} onChange={e=>change('topic',e.target.value)}>{['Antepartum','Intrapartum','Postpartum','Newborn'].map(x=><option key={x}>{x}</option>)}</select></label>
     {field('Case introduction','intro',current.intro,true,4)}
     <h4 className="font-semibold text-lg pt-2">Clinical chart tabs</h4><p className="text-sm text-[#4E3629]/60">Edit patient notes, vital signs, lab results, or other chart information.</p>
     {Object.keys(tabDraft).map(key=><label key={key} className="block font-semibold text-sm">{key}<textarea rows={5} value={tabDraft[key]} onChange={e=>setTabDraft(d=>({...d,[key]:e.target.value}))} className={input+' mt-2'}/></label>)}
     <button disabled={busy} onClick={saveCase} className="px-5 py-3 bg-[#8E4A55] text-white rounded-xl font-semibold disabled:opacity-50">Save chart changes</button>
    </section>:<section className="rounded-2xl border border-[#E6D4CA] bg-[#FFF9F2] p-5 md:p-7 space-y-5">
     <div className="flex flex-wrap gap-2">{items.map(i=><button key={i.id} onClick={()=>setActiveItem(i.id)} className={'rounded-full px-4 py-2 text-xs font-bold '+(i.id===activeItem?'bg-[#8E4A55] text-white':'bg-[#F2E7DA]')}>Q{i.item_number}</button>)}</div>
     {item?<><div className="flex justify-between flex-wrap gap-2"><h3 className="font-display text-2xl">Question {item.item_number}</h3>{badge(item.review_status,item.published)}</div>
      {field('Question stem','stem',item.stem,true,3)}
      <label className="block text-sm font-semibold">Question type<input className={input+' mt-2'} value={String(draft.item_type??item.item_type)} onChange={e=>change('item_type',e.target.value)}/></label>
      <label className="block text-sm font-semibold">Choices and interactive configuration (JSON)<textarea spellCheck={false} rows={10} className={input+' mt-2 font-mono text-xs'} value={String(draft.content??JSON.stringify(item.content,null,2))} onChange={e=>change('content',e.target.value)}/></label>
      {field('Scoring rule','scoring_rule',item.scoring_rule)}
      <div className="border-t border-[#E6D4CA] pt-5 space-y-4"><h4 className="font-display text-2xl">Answer & rationale</h4>
       <label className="block text-sm font-semibold">Correct answer (JSON)<textarea spellCheck={false} rows={5} className={input+' mt-2 font-mono text-xs'} value={String(draft.answer??JSON.stringify(answer?.answer??{},null,2))} onChange={e=>change('answer',e.target.value)}/></label>
       {field('Correct answer explanation','answer_text',answer?.answer_text??'',true,3)}
       {field('Clinical rationale','rationale',answer?.rationale??'',true,8)}
      </div><button disabled={busy} onClick={saveItem} className="px-5 py-3 bg-[#8E4A55] text-white rounded-xl font-semibold disabled:opacity-50">Save question and answer</button></>:<p>No questions imported for this case.</p>}
    </section>}
    <section className="rounded-2xl border border-[#E6D4CA] bg-white p-5 md:p-7">
     <h3 className="font-display text-xl mb-2">Review & publishing</h3><p className="text-sm text-[#4E3629]/65 mb-4">Save edits first. Approval and publication are separate steps; students see only published cases and items.</p>
     <div className="flex gap-2 flex-wrap">
      <button disabled={busy||(mode==='item'&&!item)} className="border border-[#8E4A55] text-[#8E4A55] rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40" onClick={()=>act(async()=>{if(mode==='case')await patch('case',current.id,{review_status:'approved'});else if(item)await patch('item',item.id,{review_status:'approved'})},'Approval saved')}>Approve {mode==='case'?'case':'question'}</button>
      <button disabled={busy||(mode==='item'&&!item)} className="bg-[#8E4A55] text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40" onClick={()=>act(async()=>{if(mode==='case')await patch('case',current.id,{published:true});else if(item)await patch('item',item.id,{published:true})},'Publication updated')}>Publish {mode==='case'?'case':'question'}</button>
      <button disabled={busy||(mode==='item'&&!item)} className="border border-[#DCCBC5] rounded-xl px-4 py-2 text-sm disabled:opacity-40" onClick={()=>act(async()=>{if(mode==='case')await patch('case',current.id,{published:false});else if(item)await patch('item',item.id,{published:false})},'Unpublished')}>Unpublish</button>
     </div>
     <p className="text-xs mt-4 text-[#4E3629]/60">Recommended order: approve each question → publish each question → approve case → publish case.</p>
    </section>
    {status&&<div role="status" className="rounded-xl p-4 bg-[#F2E7DA] text-sm">{status}</div>}
   </>}
  </main>
 </div>;
}

'use client';
import {useEffect,useMemo,useState} from 'react';

type Case={id:string;case_number:number;topic:string;title:string;intro:string;tabs:Record<string,string>};
type Item={id:string;case_id:string;item_number:number;item_type:string;stem:string;content:Record<string,any>;scoring_rule:string};
type Result={itemId:string;earned:number;possible:number;answer:Record<string,unknown>;answerText:string;rationale:string};
type Response=Record<string,unknown>;
const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function ItemControl({item,value,onChange,disabled}:{item:Item;value:Response;onChange:(next:Response)=>void;disabled:boolean}){
 const c=item.content;
 const toggle=(key:string,v:string|number,max?:number)=>{const original=Array.isArray(value[key])?value[key] as (string|number)[]:[];const next=original.includes(v)?original.filter(x=>x!==v):max&&original.length>=max?[...original.slice(1),v]:[...original,v];onChange({...value,[key]:next})};
 const choices=(c.options as string[]|undefined);
 if(choices){
  const multi=item.item_type==='Select All That Apply'||item.item_type.startsWith('Drag and Drop');
  const selected=(value.correct as string[]|undefined)??[];
  return <div className="space-y-2">{choices.map((option,i)=>{const letter=letters[i];return <label key={i} className="flex gap-3 items-start rounded-xl border border-rose/30 p-3 bg-white cursor-pointer"><input disabled={disabled} type={multi?'checkbox':'radio'} name={'opt-'+item.id} checked={selected.includes(letter)} onChange={()=>onChange({correct:multi?(selected.includes(letter)?selected.filter(x=>x!==letter):[...selected,letter]):[letter]})} className="accent-mauve mt-1"/><span className="text-sm">{multi?'':letter+'. '}{option}</span></label>})}</div>;
 }
 if(item.item_type==='Highlight'){
  const selected=(value.highlight_segments as number[]|undefined)??[];
  return <div><p className="text-xs font-bold text-mauve mb-3">{c.heading}</p><div className="space-y-2">{(c.segments as string[]).map((segment,i)=><button type="button" disabled={disabled} key={i} aria-pressed={selected.includes(i+1)} onClick={()=>toggle('highlight_segments',i+1)} className={'block w-full text-left rounded-xl border p-3 text-sm '+(selected.includes(i+1)?'bg-[#E6D4CA] border-mauve':'bg-white border-rose/30')}>{segment}</button>)}</div></div>;
 }
 if(item.item_type.startsWith('Matrix')){
  const columns=c.columns as string[];const rows=c.rows as string[];const current=(value.rows as string[][]|undefined)??[];
  return <div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead><tr><th className="p-3 text-left">Finding / action</th>{columns.map(v=><th key={v} className="p-3 text-center text-xs">{v}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i} className="border-t border-rose/30"><td className="p-3">{r}</td>{columns.map(col=><td key={col} className="text-center p-2"><input aria-label={r+': '+col} disabled={disabled} type={c.multiple_per_row?'checkbox':'radio'} name={'row-'+item.id+'-'+i} checked={(current[i]??[]).includes(col)} onChange={()=>{const next=Array.from({length:rows.length},(_,j)=>current[j]??[]);next[i]=c.multiple_per_row?(next[i].includes(col)?next[i].filter(x=>x!==col):[...next[i],col]):[col];onChange({rows:next})}} className="accent-mauve"/></td>)}</tr>)}</tbody></table></div>;
 }
 if(item.item_type.includes('Cloze')){
  const bank=(c.blanks??[]) as string[][];
  const words=(c.word_bank??[]) as string[];
  const blanks=bank.length?bank:Array.from({length:(String(c.template??'').match(/\{\d+\}/g)??[]).length},()=>words);
  const selected=(value.blanks as string[]|undefined)??[];
  const parts=String(c.template??'').split(/\{\d+\}/);
  return <div className="text-base leading-[3] rounded-xl bg-white border border-rose/30 px-4 py-3">{parts.map((part,i)=><span key={i}>{part}{i<blanks.length&&<select disabled={disabled} value={selected[i]??''} aria-label={'Blank '+(i+1)} onChange={e=>{const next=[...selected];next[i]=e.target.value;onChange({blanks:next})}} className="mx-1 rounded-lg border border-rose/50 bg-cream px-2 py-2 text-sm max-w-full"><option value="">Choose…</option>{blanks[i].map(s=><option key={s}>{s}</option>)}</select>}</span>)}</div>;
 }
 if(item.item_type==='Bowtie'){
  const groups=[['potential_conditions','Most likely condition'],['actions_to_take','Actions to take'],['parameters_to_monitor','Parameters to monitor']] as const;
  return <div className="grid gap-4 md:grid-cols-3">{groups.map(([key,label])=><div key={key} className="rounded-xl p-4 bg-white border border-rose/30"><h3 className="font-semibold text-sm mb-3">{label} · select {c.select_counts?.[key]??1}</h3>{(c[key] as string[]).map(option=><label key={option} className="flex gap-2 py-2 text-xs"><input disabled={disabled} type="checkbox" className="accent-mauve" checked={((value[key] as string[])??[]).includes(option)} onChange={()=>toggle(key,option,c.select_counts?.[key]??1)}/>{option}</label>)}</div>)}</div>;
 }
 return <p className="text-sm text-red-700">Unsupported item type: {item.item_type}</p>;
}
export function NgnBuilder(){
 const [cases,setCases]=useState<Case[]>([]),[items,setItems]=useState<Item[]>([]);
 const [category,setCategory]=useState('All'),[selected,setSelected]=useState<string[]>([]);
 const [active,setActive]=useState<Case|null>(null),[index,setIndex]=useState(0),[tab,setTab]=useState('');
 const [responses,setResponses]=useState<Record<string,Response>>({}),[results,setResults]=useState<Result[]|null>(null),[score,setScore]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{fetch('/api/ngn',{cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error);setCases(data.cases);setItems(data.items)}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
 const filtered=useMemo(()=>cases.filter(c=>category==='All'||c.topic===category),[cases,category]);
 const current=useMemo(()=>active?items.filter(i=>i.case_id===active.id).sort((a,b)=>a.item_number-b.item_number):[],[active,items]);
 const item=current[index];
 function start(c:Case){setActive(c);setSelected([c.id]);setIndex(0);setTab(Object.keys(c.tabs)[0]??'');setResponses({});setResults(null);setScore('');setError('')}
 function back(){setActive(null);setResults(null);setError('')}
 async function submit(){if(!active)return;setBusy(true);setError('');try{const r=await fetch('/api/ngn',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({caseId:active.id,responses})});const data=await r.json();if(!r.ok)throw Error(data.error);setResults(data.results);setScore(data.earned+'/'+data.possible);setIndex(0)}catch(e){setError(e instanceof Error?e.message:'Submission failed')}finally{setBusy(false)}}
 const shell='rounded-2xl border border-rose/30 bg-[#FFF9F2] p-5 md:p-7';
 if(loading)return <div className={shell}>Loading your NGN case studies…</div>;
 if(!active)return <div className="space-y-5 max-w-6xl">
  <div className={shell}><div className="flex justify-between gap-4 flex-wrap"><div><h2 className="text-2xl">Build an NGN case-study session</h2><p className="text-sm mt-2 text-espresso/65">Select a maternity topic and open a published clinical case.</p></div><span className="pill">{cases.length} available cases</span></div><div className="flex flex-wrap gap-2 mt-6">{['All','Antepartum','Intrapartum','Postpartum','Newborn'].map(x=><button key={x} onClick={()=>setCategory(x)} className={'rounded-full px-4 py-2 text-sm font-semibold '+(category===x?'bg-mauve text-white':'bg-oatmeal text-mauve')}>{x}</button>)}</div></div>
  {error&&<p role="alert" className="text-red-700">{error}</p>}
  {!filtered.length&&<div className={shell}><h3 className="text-xl">No published case studies yet</h3><p className="text-sm mt-2 text-espresso/65">Your imported cases are saved as drafts. They will appear here once their clinical review is complete and both cases and items are published.</p></div>}
  <div className="grid md:grid-cols-2 gap-4">{filtered.map(c=><article key={c.id} className={shell}><span className="pill">{c.topic} · Case {c.case_number}</span><h3 className="text-2xl mt-4">{c.topic} Case Study {c.case_number}</h3><p className="text-sm text-espresso/65 mt-2">{c.intro}</p><div className="mt-5 flex items-center justify-between"><span className="text-xs text-espresso/60">{items.filter(i=>i.case_id===c.id).length} NGN items</span><button onClick={()=>start(c)} className="btn-primary">Start Case →</button></div></article>)}</div>
 </div>;
 if(!item)return <div className={shell}><button onClick={back} className="btn-outline">← Case library</button><p className="mt-5">This case has no published items.</p></div>;
 const result=results?.find(r=>r.itemId===item.id);
 return <div className="space-y-4 max-w-7xl">
  <div className="flex flex-wrap gap-3 justify-between items-center"><button onClick={back} className="btn-outline">← Case library</button><div className="text-sm font-semibold text-mauve">{active.topic} · Case {active.case_number} · Question {index+1} of {current.length}</div>{results&&<span className="pill">Score: {score}</span>}</div>
  <div className="h-2 bg-oatmeal rounded-full overflow-hidden"><div style={{width:((index+1)/current.length*100)+'%'}} className="h-full bg-mauve"/></div>
  <div className="grid lg:grid-cols-[minmax(280px,42%)_1fr] gap-4 items-start">
   <aside className={shell}><div className="flex items-center justify-between"><h2 className="text-2xl">Patient Chart</h2><span className="pill">{active.topic}</span></div><p className="mt-3 text-sm">{active.intro}</p><div role="tablist" className="flex flex-wrap gap-2 mt-6">{Object.keys(active.tabs).map(t=><button role="tab" aria-selected={tab===t} onClick={()=>setTab(t)} key={t} className={'rounded-lg px-3 py-2 text-xs font-semibold '+(tab===t?'bg-mauve text-white':'bg-oatmeal text-mauve')}>{t}</button>)}</div><div role="tabpanel" className="mt-4 whitespace-pre-wrap leading-relaxed text-sm bg-white rounded-xl border border-rose/20 p-4 min-h-40">{active.tabs[tab]}</div></aside>
   <section className={shell}><div className="flex flex-wrap gap-2 justify-between mb-5"><span className="pill">{item.item_type}</span><span className="text-xs text-espresso/60">Scoring: {item.scoring_rule}</span></div><h2 className="text-xl md:text-2xl mb-6">{item.stem}</h2><ItemControl item={item} value={responses[item.id]??{}} disabled={!!results} onChange={v=>setResponses(s=>({...s,[item.id]:v}))}/>
    {result&&<div className="mt-6 rounded-xl bg-oatmeal p-5"><h3 className="font-bold">Review · {result.earned}/{result.possible} points</h3><p className="text-sm mt-3 whitespace-pre-wrap"><strong>Correct response: </strong>{result.answerText}</p><p className="text-sm mt-4 whitespace-pre-wrap"><strong>Rationale: </strong>{result.rationale}</p></div>}
    {error&&<p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}
    <div className="mt-7 flex flex-wrap justify-between gap-3"><button className="btn-outline disabled:opacity-40" disabled={index===0} onClick={()=>setIndex(i=>i-1)}>← Previous</button><div className="flex gap-2">{index<current.length-1?<button className="btn-primary" onClick={()=>setIndex(i=>i+1)}>Next →</button>:!results?<button className="btn-primary disabled:opacity-40" disabled={busy||current.some(i=>!responses[i.id])} onClick={submit}>{busy?'Checking…':'Submit case for review →'}</button>:<button className="btn-primary" onClick={back}>Finish case →</button>}</div></div>
   </section>
  </div><div className="flex flex-wrap gap-2">{current.map((i,n)=><button onClick={()=>setIndex(n)} aria-label={'Go to item '+(n+1)} key={i.id} className={'rounded-full w-9 h-9 text-sm font-semibold '+(n===index?'bg-mauve text-white':responses[i.id]?'bg-blush text-mauve':'bg-oatmeal text-espresso/70')}>{n+1}</button>)}</div>
 </div>;
}

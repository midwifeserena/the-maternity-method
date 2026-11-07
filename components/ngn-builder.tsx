'use client';
import {Exam} from './exam';
import {ExamImages} from './exam-images';
import {NgnExamWindow} from './ngn-exam-window';
import {useChoiceStrikeout} from './use-choice-strikeout';
import {QuestionResponse} from './question-response';
import {NursingTip} from './nursing-tip';
import {useEffect,useMemo,useState} from 'react';

type Case={id:string;case_number:number;topic:string;title:string;intro:string;tabs:Record<string,string>};
type Item={id:string;case_id:string;item_number:number;item_type:string;stem:string;content:Record<string,any>;scoring_rule:string};
type Result={itemId:string;earned:number;possible:number;answer:Record<string,unknown>;answerText:string;rationale:string};
type Response=Record<string,unknown>;
const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const noStandaloneQuestions:string[]=[];
function ItemControl({item,value,onChange,disabled,solution,struck,onToggleStrike}:{struck:string[];onToggleStrike:(id:string)=>void;solution?:unknown;item:Item;value:Response;onChange:(next:Response)=>void;disabled:boolean}){
 const c=item.content;
 const choiceEvents=useChoiceStrikeout(value,onChange,onToggleStrike,!disabled&&item.item_type!=='Select All That Apply'&&!item.item_type.startsWith('Drag and Drop'));
 if(c.question)return <QuestionResponse struckOptions={struck} onToggleStrike={onToggleStrike} question={c.question} answer={value.response} solution={solution} disabled={disabled} onChange={response=>onChange({response})}/>;
 const toggle=(key:string,v:string|number,max?:number)=>{const original=Array.isArray(value[key])?value[key] as (string|number)[]:[];const next=original.includes(v)?original.filter(x=>x!==v):max&&original.length>=max?[...original.slice(1),v]:[...original,v];onChange({...value,[key]:next})};
 const choices=(c.options as string[]|undefined);
 if(choices){
  const multi=item.item_type==='Select All That Apply'||item.item_type.startsWith('Drag and Drop');
  const selected=(value.correct as string[]|undefined)??[];
  const expected=(solution as {correct?:string[]}|undefined)?.correct;
  return <div>{choices.map((option,i)=>{const letter=letters[i],chosen=selected.includes(letter),correct=expected?.includes(letter),crossed=struck.includes(letter);return <div key={i} className={'ngn-choice-row'+(expected?(correct?' ngn-answer-correct':chosen?' ngn-answer-incorrect':''):'')}><label className="ngn-choice" onMouseDown={choiceEvents.onMouseDown} onDoubleClick={event=>choiceEvents.onDoubleClick(letter,event)}><input aria-label={option} disabled={disabled} type={multi?'checkbox':'radio'} name={'opt-'+item.id} checked={chosen} onChange={()=>onChange({correct:multi?(chosen?selected.filter(x=>x!==letter):[...selected,letter]):[letter]})}/><span className={crossed?'ngn-choice-crossed':''}>{letter}. {option}{expected&&<small className="block">{chosen?'Your answer. ':''}{correct?'Correct answer. ':''}</small>}</span></label>{!multi&&!disabled&&<button type="button" className="ngn-choice-strike" aria-label={(crossed?'Restore ':'Cross out ')+option} aria-pressed={crossed} onClick={()=>onToggleStrike(letter)}>{crossed?'Restore':'Cross out'}</button>}</div>})}</div>;
 }
 if(item.item_type==='Highlight'){
  const selected=(value.highlight_segments as number[]|undefined)??[];
  return <div><p className="text-xs font-bold text-mauve mb-3">{c.heading}</p><div className="space-y-2">{(c.segments as string[]).map((segment,i)=><button type="button" disabled={disabled} key={i} aria-pressed={selected.includes(i+1)} onClick={()=>toggle('highlight_segments',i+1)} className={'block w-full text-left rounded-xl border p-3 text-sm '+(selected.includes(i+1)?'bg-[#E6D4CA] border-mauve':'bg-white border-rose/30')}>{segment}</button>)}</div></div>;
 }
 if(item.item_type.startsWith('Matrix')){
  const columns=c.columns as string[];const rows=c.rows as string[];const current=(value.rows as string[][]|undefined)??[];
  return <div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead><tr><th className="p-3 text-left">Finding / action</th>{columns.map(v=><th key={v} className="p-3 text-center text-xs">{v}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i} className="border-t border-rose/30"><td className="p-3">{r}</td>{columns.map(col=><td key={col} className={'text-center p-2'+(solution?((solution as {rows?:string[][]}).rows?.[i]?.includes(col)?' ngn-answer-correct':(current[i]??[]).includes(col)?' ngn-answer-incorrect':''):'')}><input aria-label={r+': '+col} disabled={disabled} type={c.multiple_per_row?'checkbox':'radio'} name={'row-'+item.id+'-'+i} checked={(current[i]??[]).includes(col)} onChange={()=>{const next=Array.from({length:rows.length},(_,j)=>current[j]??[]);next[i]=c.multiple_per_row?(next[i].includes(col)?next[i].filter(x=>x!==col):[...next[i],col]):[col];onChange({rows:next})}} className="accent-mauve"/></td>)}</tr>)}</tbody></table></div>;
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
export function NgnBuilder({entryPoint='library'}:{entryPoint?:'library'|'create-exam'}){
 const [cases,setCases]=useState<Case[]>([]),[items,setItems]=useState<Item[]>([]);
 const [category,setCategory]=useState('All');
 const [unifiedReady,setUnifiedReady]=useState(false);
 const [active,setActive]=useState<Case|null>(null),[index,setIndex]=useState(0),[tab,setTab]=useState('');
 const examCaseIds=useMemo(()=>active?[active.id]:[],[active]);
 const [strikes,setStrikes]=useState<Record<string,string[]>>({});
 const [responses,setResponses]=useState<Record<string,Response>>({}),[results,setResults]=useState<Result[]|null>(null),[score,setScore]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let present=true;Promise.all([fetch('/api/ngn?formats=extended-v1',{cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error);return data}),fetch('/api/exams/capabilities',{cache:'no-store'}).then(async r=>r.ok?(await r.json()).caseExams===true:false).catch(()=>false)]).then(([data,ready])=>{if(present){setCases(data.cases);setItems(data.items);setUnifiedReady(ready)}}).catch(e=>{if(present)setError(e.message)}).finally(()=>{if(present)setLoading(false)});return()=>{present=false};},[]);
 const filtered=useMemo(()=>cases.filter(c=>category==='All'||c.topic===category),[cases,category]);
 const current=useMemo(()=>active?items.filter(i=>i.case_id===active.id).sort((a,b)=>a.item_number-b.item_number):[],[active,items]);
 const item=current[index];
 function start(c:Case){setStrikes({});setActive(c);setIndex(0);setTab(Object.keys(c.tabs)[0]??'');setResponses({});setResults(null);setScore('');setError('')}
 function back(){setActive(null);setResults(null);setError('')}
 async function submit(){if(!active)return;setBusy(true);setError('');try{const r=await fetch('/api/ngn?formats=extended-v1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({caseId:active.id,responses})});const data=await r.json();if(!r.ok)throw Error(data.error);setResults(data.results);setScore(data.earned+'/'+data.possible);setIndex(0)}catch(e){setError(e instanceof Error?e.message:'Submission failed')}finally{setBusy(false)}}
 const shell='rounded-2xl border border-rose/30 bg-[#FFF9F2] p-5 md:p-7';
 if(loading)return <div className={shell}>Loading your NGN case studies…</div>;
 if(active&&unifiedReady&&current.length===6)return <Exam selectedIds={noStandaloneQuestions} caseIds={examCaseIds} initialMode="study" onExit={back}/>;
 if(!active)return <div className="space-y-5 max-w-6xl">
  <div className={shell}><div className="flex justify-between gap-4 flex-wrap"><div><h2 className="text-2xl">{entryPoint==='create-exam'?'Choose an NGN case study':'Build an NGN case-study session'}</h2><p className="text-sm mt-2 text-espresso/65">Select a maternity topic and open a published clinical case.</p></div><span className="pill">{cases.length} available cases</span></div><div className="flex flex-wrap gap-2 mt-6">{['All','Antepartum','Intrapartum','Postpartum','Newborn'].map(x=><button key={x} onClick={()=>setCategory(x)} className={'rounded-full px-4 py-2 text-sm font-semibold '+(category===x?'bg-mauve text-white':'bg-oatmeal text-mauve')}>{x}</button>)}</div></div>
  {error&&<p role="alert" className="text-red-700">{error}</p>}
  {!filtered.length&&<div className={shell}><h3 className="text-xl">No published case studies yet</h3><p className="text-sm mt-2 text-espresso/65">Your imported cases are saved as drafts. They will appear here once their clinical review is complete and both cases and items are published.</p></div>}
  <div className="grid md:grid-cols-2 gap-4">{filtered.map(c=><article key={c.id} className={shell}><span className="pill">{c.topic} · Case {c.case_number}</span><h3 className="text-2xl mt-4">{c.topic} Case Study {c.case_number}</h3><p className="text-sm text-espresso/65 mt-2">{c.intro}</p><div className="mt-5 flex items-center justify-between"><span className="text-xs text-espresso/60">{items.filter(i=>i.case_id===c.id).length} NGN items</span><button onClick={()=>start(c)} className="btn-primary">Start Case →</button></div></article>)}</div>
 </div>;
 if(!item)return <div className={shell}><button onClick={back} className="btn-outline">← Case library</button><p className="mt-5">This case has no published items.</p></div>;
 const result=results?.find(r=>r.itemId===item.id);
 const chart=(item.content.question as any)?.chart??active.tabs;
 const currentTab=Object.hasOwn(chart,tab)?tab:Object.keys(chart)[0]??'';
 return <NgnExamWindow caseLabel={`${active.topic} · Case ${active.case_number}`} itemId={item.id} index={index} count={current.length} tabKey={currentTab} score={score} review={Boolean(results)} busy={busy} answered={current.map(i=>Boolean(responses[i.id]))} onPrevious={()=>setIndex(i=>i-1)} onNext={()=>setIndex(i=>i+1)} onJump={setIndex} onSubmit={submit} onExit={back}
  chart={<><p className="ngn-exam-intro" data-exam-annotation="intro">{active.intro}</p><div role="tablist" aria-label="Patient chart sections" className="ngn-exam-tabs">{Object.keys(chart).map((t,n)=><button id={`ngn-chart-tab-${n}`} aria-controls={`ngn-chart-panel-${n}`} type="button" role="tab" aria-selected={currentTab===t} onClick={()=>setTab(t)} key={t}>{t}</button>)}</div><div id={`ngn-chart-panel-${Object.keys(chart).indexOf(currentTab)}`} aria-labelledby={`ngn-chart-tab-${Object.keys(chart).indexOf(currentTab)}`} role="tabpanel" tabIndex={0} className="ngn-exam-tab-content" data-exam-annotation={'chart:'+currentTab}>{chart[currentTab]}</div></>}
  question={<><p className="ngn-item-type">{item.item_type} · Scoring: {item.scoring_rule==='dyad'?'1 point when both blanks are correct':item.scoring_rule}</p><h1 className="ngn-stem" data-exam-annotation="stem">{item.stem}</h1><ExamImages images={item.content.question?.images} label="Question image"/><ItemControl struck={strikes[item.id]??[]} onToggleStrike={id=>setStrikes(old=>({...old,[item.id]:(old[item.id]??[]).includes(id)?old[item.id].filter(x=>x!==id):[...(old[item.id]??[]),id]}))} solution={result?.answer?.answer_key??result?.answer} item={item} value={responses[item.id]??{}} disabled={!!results||busy} onChange={v=>setResponses(old=>{const next={...old};if(!Object.keys(v).length||(Object.keys(v).length===1&&'response' in v&&v.response===undefined))delete next[item.id];else next[item.id]=v;return next;})}/>
   {result&&<section className="ngn-result" aria-label="Answer explanation"><h2>Review · {result.earned}/{result.possible} points</h2><p><strong>Correct response: </strong>{result.answerText}</p><p data-exam-annotation="rationale"><strong>Rationale: </strong>{result.rationale}</p><ExamImages images={result.answer.rationale_images as {url:string;alt:string}[]|undefined} label="Rationale image"/><NursingTip text={typeof result.answer.nursing_tip==='string'?result.answer.nursing_tip:null}/></section>}
   {error&&<p className="mt-4 text-red-700" role="alert">{error}</p>}
  </>}/>;
}

'use client';
import './ngn-question.css';
import {ExtendedResponse} from './extended-response';
type Props={question:any;answer:unknown;solution?:unknown;disabled?:boolean;onChange?:(answer:any)=>void};
export function NgnQuestion({question:q,answer,solution,disabled=false,onChange}:Props){
 if(['calculation','ordered'].includes(q.ngn_format))return <ExtendedResponse question={q} answer={answer} solution={solution} disabled={disabled} onChange={onChange}/>;
 const c=q.ngn_config??{},options=q.options??[],revealed=solution!==undefined&&solution!==null,locked=disabled||revealed;
 const list=(v:unknown):string[]=>Array.isArray(v)?v:[];
 const option=(id:string)=>options.find((o:any)=>o.id===id)?.label??id;
 const selected=(id:string,row?:string)=>row?list((answer as any)?.[row]).includes(id):list(answer).includes(id);
 const right=(id:string,row?:string)=>row?list((solution as any)?.[row]).includes(id):list(solution).includes(id);
 const style=(chosen:boolean,correct:boolean)=>revealed?(correct?'ngn-right':chosen?'ngn-wrong':''):chosen?'ngn-selected':'';
 const note=(chosen:boolean,correct:boolean)=>revealed?<small>{chosen?'Your answer. ':''}{correct?'Correct answer. ':chosen?'Incorrect selection. ':''}</small>:null;
 function toggle(id:string,row?:string,max?:number){if(locked)return;const current=row?list((answer as any)?.[row]):list(answer),next=current.includes(id)?current.filter(v=>v!==id):max&&current.length>=max?current:[...current,id];onChange?.(row?{...(answer as object??{}),[row]:next}:next)}
 if(q.ngn_format==='bowtie')return <div className="ngn-interaction ngn-bowtie" aria-label="Bowtie question">{(c.groups??[]).map((group:any)=><fieldset key={group.id}><legend>{group.label} · select {group.select}</legend><p>{list((answer as any)?.[group.id]).length} of {group.select} selected</p>{group.option_ids.map((id:string)=>{const chosen=selected(id,group.id),correct=right(id,group.id);return <label key={id} className={style(chosen,correct)}><input type="checkbox" disabled={locked||!chosen&&list((answer as any)?.[group.id]).length>=group.select} checked={chosen} onChange={()=>toggle(id,group.id,group.select)}/><span>{option(id)}{note(chosen,correct)}</span></label>})}</fieldset>)}</div>;
 if(q.ngn_format==='highlight'||q.ngn_format==='drag-select'){
  const drag=q.ngn_format==='drag-select';
  const entry=(o:any)=>{const chosen=selected(o.id),correct=right(o.id);return <button key={o.id} type="button" draggable={drag&&!locked} onDragStart={event=>event.dataTransfer.setData('text/plain',o.id)} disabled={locked} aria-pressed={chosen} onClick={()=>toggle(o.id,undefined,c.select_count)} className={style(chosen,correct)}>{o.label}{note(chosen,correct)}</button>};
  return <section className="ngn-interaction ngn-highlight" aria-label={drag?'Drag and drop selection':'Highlight findings'}><h3>{c.heading||'Clinical findings'}</h3><p>{drag?'Drag choices into the target box, or click a choice to select or remove it.':'Click or tap each finding to highlight it. Activate it again to remove the highlight.'}{c.select_count?` Select ${c.select_count}.`:''}</p>{drag?<div className="ngn-select-layout"><div aria-label="Available findings">{options.filter((o:any)=>!selected(o.id)).map(entry)}</div><div className="ngn-drop-target" aria-label="Selected findings" onDragOver={e=>{if(!locked)e.preventDefault()}} onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');if(!locked&&options.some((o:any)=>o.id===id)&&!selected(id))toggle(id)}}><h4>{c.heading||'Selected findings'}</h4>{options.filter((o:any)=>selected(o.id)).map(entry)}{!list(answer).length&&<p>Drop or select findings here.</p>}</div></div>:<div>{options.map(entry)}</div>}</section>;
 }
 const blanks=c.blanks??[],template=typeof c.template==='string'?c.template:'',drag=q.ngn_format==='drag-cloze';
 const change=(id:string,value:string)=>{if(!locked)onChange?.({...((answer&&typeof answer==='object'?answer:{}) as object),[id]:value})};
 const bank=[...new Set<string>(options.map((o:any)=>o.label))];
 return <section className="ngn-interaction ngn-cloze" aria-label={drag?'Drag and drop cloze':'Drop-down cloze'}>{q.ngn_format==='dyad-cloze'&&<p>These two blanks form a linked pair. Both must be correct to earn the point.</p>}<p>{drag?'Drag a word to a blank, or use its menu with a keyboard or touch screen.':'Choose an answer for each blank.'}</p>{drag&&<div className="ngn-word-bank" aria-label="Word choices">{bank.map(label=><span key={label} draggable={!locked} onDragStart={e=>e.dataTransfer.setData('text/plain',label)}>{label}</span>)}</div>}<div className="ngn-cloze-sentence">{template.split(/(\{\d+\})/).map((part:string,index:number)=>{
  const match=part.match(/^\{(\d+)\}$/);if(!match)return <span key={index}>{part}</span>;
  const n=Number(match[1]),blank=blanks[n-1];if(!blank)return <span key={index}>[Blank unavailable]</span>;
  const value=typeof (answer as any)?.[blank.id]==='string'?(answer as any)[blank.id]:'',correct=(solution as any)?.[blank.id];
  return <span key={index} className={'ngn-blank '+style(Boolean(value),Boolean(correct)&&value===correct)} onDragOver={e=>{if(drag&&!locked)e.preventDefault()}} onDrop={e=>{e.preventDefault();if(!drag||locked)return;const label=e.dataTransfer.getData('text/plain'),id=blank.option_ids.find((id:string)=>option(id)===label);if(id)change(blank.id,id)}}><select aria-label={'Blank '+n} value={value} disabled={locked} onChange={e=>change(blank.id,e.target.value)}><option value="">Select…</option>{blank.option_ids.map((id:string)=><option key={id} value={id}>{option(id)}</option>)}</select>{revealed&&<small>Your answer: {value?option(value):'Unanswered'}. Correct answer: {correct?option(correct):'Unavailable'}.</small>}</span>;
 })}</div></section>;
}

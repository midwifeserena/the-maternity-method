'use client';
import {useEffect,useMemo,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {isNgnQuestion} from '@/lib/ngn-standalone.mjs';
import {completeExamCases,CASE_ITEM_COUNT,MAX_EXAM_ITEMS} from '@/lib/case-exam.mjs';
import {planExamSelection} from '@/lib/exam-selection.mjs';
import {Exam} from '@/components/exam';
import type {Question,Category} from '@/lib/questions';

type Status='unused'|'incorrect'|'correct'|'omitted';
const pillars:Category[]=['Antepartum','Intrapartum','Postpartum','Newborn'];
const statusLabels:{key:Status;label:string}[]=[
  {key:'unused',label:'Unused'},{key:'incorrect',label:'Incorrect'},
  {key:'omitted',label:'Omitted'},{key:'correct',label:'Correct'}
];
type Format='standard'|'ngn'|'cases';
type CaseChoice={id:string;case_number:number;topic:string;intro:string};
export function QuestionBuilder({initialMode='study'}:{initialMode?:'study'|'test'}){
 const [formats,setFormats]=useState<Format[]>(['standard']);
 const [allQuestions,setAllQuestions]=useState(false);
 const includeCases=formats.includes('cases'),includeStandalone=formats.some(format=>format!=='cases');
 const [cases,setCases]=useState<CaseChoice[]>([]);
 const [caseReady,setCaseReady]=useState(false),[caseLoading,setCaseLoading]=useState(true),[caseError,setCaseError]=useState(''),[reload,setReload]=useState(0);
 useEffect(()=>{let active=true;setCaseLoading(true);setCaseError('');Promise.all([
  fetch('/api/ngn?formats=extended-v1',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error();return r.json()}),
  fetch('/api/exams/capabilities',{cache:'no-store'}).then(async r=>r.ok?(await r.json()).caseExams===true:false).catch(()=>false)
 ]).then(([data,ready])=>{if(active){setCases(completeExamCases<CaseChoice>(data.cases??[],data.items??[]));setCaseReady(ready)}}).catch(()=>{if(active)setCaseError('Could not load the case library. Please try again.')}).finally(()=>{if(active)setCaseLoading(false)});return()=>{active=false};},[reload]);
 const [mode,setMode]=useState<'standard'|'custom'>('standard');
 const [examMode,setExamMode]=useState<'study'|'test'>(initialMode);
 const [topics,setTopics]=useState<Category[]>([...pillars]);
 const [statuses,setStatuses]=useState<Status[]>(['unused','incorrect','omitted','correct']);
 const [count,setCount]=useState(20);
 const [questions,setQuestions]=useState<Question[]>([]);
 const [latest,setLatest]=useState<Record<string,Status>>({});
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [started,setStarted]=useState<{questionIds:string[];caseIds:string[]}|null>(null);
 useEffect(()=>{let ignore=false;setLoading(true);setError('');(async()=>{
   try{
    const response=await fetch('/api/questions?formats=extended-v1&category=All',{cache:'no-store'});
    if(!response.ok)throw new Error('Could not load published questions');
    const body=await response.json() as {questions:Question[]};
    const db=createClient();
    const {data:{user}}=await db.auth.getUser();
    if(!user)throw new Error('Sign in to build a test');
    const {data:records,error:historyError}=await db.from('exam_responses')
     .select('question_id,response,earned,possible,attempt_id').eq('user_id',user.id).limit(10000);
    if(historyError)throw historyError;
    const {data:attempts}=await db.from('exam_attempts').select('id,completed_at').eq('user_id',user.id).not('completed_at','is',null).order('completed_at',{ascending:false}).limit(1000);
    const order=new Map((attempts??[]).map((a,i)=>[a.id,i]));
    const sorted=(records??[]).filter(r=>order.has(r.attempt_id)).sort((a,b)=>(order.get(a.attempt_id)??99999)-(order.get(b.attempt_id)??99999));
    const lookup:Record<string,Status>={};
    for(const r of sorted){
      if(lookup[r.question_id])continue;
      lookup[r.question_id]=r.response===null?'omitted':r.earned===r.possible?'correct':'incorrect';
    }
    if(!ignore){setQuestions(body.questions??[]);setLatest(lookup)}
   }catch(e){if(!ignore)setError(e instanceof Error?e.message:'Unable to load question bank')}
   finally{if(!ignore)setLoading(false)}
 })();return()=>{ignore=true}},[]);
 const matchesFormat=(q:Question)=>formats.includes(isNgnQuestion(q)?'ngn':'standard');
 const eligible=questions.filter(q=>topics.includes(q.category)&&matchesFormat(q)&&statuses.includes(latest[q.id]??'unused'));
 const availableCases=useMemo(()=>cases.filter(c=>topics.includes(c.topic as Category)),[cases,topics]);
 const countByStatus=(status:Status)=>questions.filter(q=>topics.includes(q.category)&&matchesFormat(q)&&(latest[q.id]??'unused')===status).length;
 const plan=planExamSelection({count,formats,allQuestions,standard:eligible.filter(q=>!isNgnQuestion(q)).map(q=>q.id),ngn:eligible.filter(isNgnQuestion).map(q=>q.id),cases:availableCases.map(c=>c.id)});
 const blocked=includeStandalone&&loading? 'Loading questions…':(includeStandalone?error:'')||(includeCases&&caseLoading?'Loading cases…':includeCases&&caseError?caseError:includeCases&&(!allQuestions||availableCases.length>0)&&!caseReady?'Case-study exams need the combined-exam database setup. Ask your administrator to run 202611100001_combined_exam_sessions.sql, then 202611110001_exam_limit_150.sql.':plan.error);
 function toggleTopic(topic:Category){setTopics(current=>current.includes(topic)?current.filter(t=>t!==topic):[...current,topic])}
 function toggleStatus(status:Status){setStatuses(current=>current.includes(status)?current.filter(t=>t!==status):[...current,status])}
 function toggleFormat(format:Format){setAllQuestions(false);setFormats(current=>current.includes(format)?current.filter(f=>f!==format):[...current,format])}
 function build(){if(blocked)return;const shuffled=(ids:string[])=>{const result=[...ids];if(mode==='standard')for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result};
  const selected=planExamSelection({count,formats,allQuestions,standard:shuffled(eligible.filter(q=>!isNgnQuestion(q)).map(q=>q.id)),ngn:shuffled(eligible.filter(isNgnQuestion).map(q=>q.id)),cases:shuffled(availableCases.map(c=>c.id))});
  if(!selected.error)setStarted({questionIds:selected.questionIds,caseIds:selected.caseIds});
 }
 if(started)return <Exam selectedIds={started.questionIds} caseIds={started.caseIds.length?started.caseIds:undefined} initialMode={examMode} onExit={()=>setStarted(null)}/>;
 const shell='rounded-2xl border border-rose/30 bg-[#FFF9F2] p-5 md:p-7';
 const pill=(active:boolean)=>`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${active?'bg-mauve text-white':'text-mauve hover:bg-blush'}`;
 return <div className="space-y-5 max-w-5xl">
  <div className={shell}>
    <div className="flex items-center gap-2"><h2 className="text-2xl">Question Mode</h2><span className="text-rose text-sm" title="Standard randomizes eligible questions; Custom keeps database order.">ⓘ</span></div>
    <div className="inline-flex bg-oatmeal rounded-full p-1 mt-5" role="group" aria-label="Question mode">
      <button className={pill(mode==='standard')} aria-pressed={mode==='standard'} onClick={()=>setMode('standard')}>Standard</button>
      <button className={pill(mode==='custom')} aria-pressed={mode==='custom'} onClick={()=>setMode('custom')}>Custom</button>
    </div>
    <p className="text-sm text-espresso/65 mt-3">{mode==='standard'?'A randomized selection from your chosen filters.':'Choose categories and an exact question count.'}</p>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mt-7">
      {statusLabels.map(({key,label})=><label key={key} className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" className="accent-mauve h-4 w-4" checked={statuses.includes(key)} onChange={()=>toggleStatus(key)}/>
        <span className="text-sm">{label}</span><span className="pill">{countByStatus(key)}</span>
      </label>)}
    </div>
    <p className="mt-5 text-xs text-espresso/60">Status filters apply to standalone questions. Complete case studies are selected by subject and kept together in their original six-question order.</p>
  </div>
  <div className={shell}>
    <h2 className="text-2xl">Question Category <span className="text-rose text-sm" title="Select one or more maternity pillars">ⓘ</span></h2>
    <div className="flex flex-wrap gap-2 mt-5" role="group" aria-label="Question category">
      <button type="button" className={pill(allQuestions)} aria-pressed={allQuestions} onClick={()=>{setAllQuestions(true);setFormats(['standard','ngn','cases'])}}>All Questions</button>
      {([['standard','Standalone Only'],['cases','NGN Case Studies Only'],['ngn','NGN Questions']] as const).map(([value,label])=><button type="button" key={value} className={pill(!allQuestions&&formats.length===1&&formats[0]===value)} aria-pressed={!allQuestions&&formats.length===1&&formats[0]===value} onClick={()=>{setAllQuestions(false);setFormats([value])}}>{label}</button>)}
    </div>
    <p className="mt-3 text-sm text-espresso/70">Choose one format above, or combine formats below. All Questions includes the available standalone and NGN formats, including complete case studies.</p>
    <fieldset className="flex flex-wrap gap-4 mt-4"><legend className="text-sm font-semibold mb-2">Combine question formats</legend>{([['standard','Standalone questions'],['ngn','Standalone NGN questions'],['cases','NGN case studies']] as const).map(([value,label])=><label key={value} className="inline-flex items-center gap-2 text-sm"><input type="checkbox" className="accent-mauve" checked={formats.includes(value)} onChange={()=>toggleFormat(value)}/>{label}</label>)}</fieldset>
    <div className="inline-flex bg-oatmeal rounded-full p-1 mt-5"><span className={pill(true)}>Subjects</span><span className="px-5 py-2 text-sm text-espresso/40">Client Needs · coming soon</span></div>
    <div className="mt-6"><label className="inline-flex items-center gap-2 font-semibold text-sm">
      <input type="checkbox" className="accent-mauve h-4 w-4" checked={topics.length===pillars.length} onChange={()=>setTopics(topics.length===pillars.length?[]:[...pillars])}/> All maternity subjects
    </label></div>
    <div className="grid sm:grid-cols-2 gap-x-10 gap-y-5 mt-6">
      {pillars.map(topic=><label key={topic} className="flex items-center justify-between gap-3 cursor-pointer rounded-xl border border-rose/25 bg-cream/45 px-4 py-3">
        <span className="flex gap-3 items-center"><input type="checkbox" className="accent-mauve h-4 w-4" checked={topics.includes(topic)} onChange={()=>toggleTopic(topic)}/><span className="text-sm font-medium">{topic}</span></span>
        <span className="pill">{questions.filter(q=>q.category===topic&&matchesFormat(q)).length+(includeCases?cases.filter(c=>c.topic===topic).length*CASE_ITEM_COUNT:0)}</span>
      </label>)}
    </div>
    <p className="mt-6 text-sm text-espresso/70">NGN Questions includes standalone bowties, highlighted findings, cloze, drag-and-drop, and matrix questions. NGN Case Studies adds complete six-question patient-chart cases automatically from your selected subjects.</p>
    <p className="mt-3 text-xs text-espresso/60">Only published questions appear. Counts reflect your Supabase content, not the example platform.</p>
  </div>
  <div className={shell}>
    <div className="flex flex-wrap items-center gap-5 justify-between">
      <div><h2 className="text-2xl">Number of Questions</h2><p className="mt-1 text-sm text-espresso/60">Up to {MAX_EXAM_ITEMS} questions per exam, including case-study questions.</p></div>
      <input aria-label="Number of questions" type="number" min={1} max={MAX_EXAM_ITEMS} value={count} onChange={e=>setCount(Number(e.target.value))} className="w-24 rounded-xl border border-rose/40 p-3 bg-white text-center"/>
    </div>
    <p className="mt-4 text-sm text-espresso/70">{plan.questionIds.length} standalone questions + {plan.caseIds.length*CASE_ITEM_COUNT} case-study questions · {plan.caseIds.length} complete cases</p>
    {includeCases&&<p className="mt-2 text-sm text-espresso/65">Available: {availableCases.length} complete cases ({availableCases.length*CASE_ITEM_COUNT} questions). Cases always contain all six questions. For case studies only, choose a multiple of six (6, 12, 18…150).</p>}
    {includeCases&&caseError&&<button type="button" className="mt-3 underline" onClick={()=>setReload(n=>n+1)}>Retry cases</button>}
    <div className="mt-6 flex items-center gap-3"><span className="text-sm font-semibold">Exam experience:</span>
      <button className={pill(examMode==='study')} aria-pressed={examMode==='study'} onClick={()=>setExamMode('study')}>Study</button>
      <button className={pill(examMode==='test')} aria-pressed={examMode==='test'} onClick={()=>setExamMode('test')}>Timed Test</button>
    </div>
  </div>
  <div className="flex flex-wrap justify-between gap-4 items-center rounded-2xl bg-oatmeal p-5">
    <div className="text-sm text-espresso/70">{blocked||`Ready to generate ${count} questions`}</div>
    <button className="btn-primary disabled:opacity-50" disabled={!!blocked} onClick={build}>Generate Test →</button>
  </div>
 </div>
}

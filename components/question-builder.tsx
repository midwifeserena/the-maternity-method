'use client';
import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {createClient} from '@/lib/supabase/client';
import {isNgnQuestion} from '@/lib/ngn-standalone.mjs';
import {completeExamCases,CASE_ITEM_COUNT} from '@/lib/case-exam.mjs';
import {Exam} from '@/components/exam';
import type {Question,Category} from '@/lib/questions';

type Status='unused'|'incorrect'|'correct'|'omitted';
const pillars:Category[]=['Antepartum','Intrapartum','Postpartum','Newborn'];
const statusLabels:{key:Status;label:string}[]=[
  {key:'unused',label:'Unused'},{key:'incorrect',label:'Incorrect'},
  {key:'omitted',label:'Omitted'},{key:'correct',label:'Correct'}
];
const isStatus=(v:string):v is Status=>['unused','incorrect','correct','omitted'].includes(v);
function StandaloneQuestionBuilder({initialMode='study',contentMode='standalone',caseIds=[],caseSelection,caseReady=true,caseLoading=false}:{initialMode?:'study'|'test';contentMode?:'standalone'|'cases'|'both';caseIds?:string[];caseSelection?:ReactNode;caseReady?:boolean;caseLoading?:boolean}){
 const includeStandalone=contentMode!=='cases',includeCases=contentMode!=='standalone',caseQuestionCount=includeCases?caseIds.length*CASE_ITEM_COUNT:0;
 const [mode,setMode]=useState<'standard'|'custom'>('standard');
 const [examMode,setExamMode]=useState<'study'|'test'>(initialMode);
 const [topics,setTopics]=useState<Category[]>([...pillars]);
 const [statuses,setStatuses]=useState<Status[]>(['unused','incorrect','omitted','correct']);
 const [section,setSection]=useState<'all'|'standard'|'ngn'>('all');
 const [count,setCount]=useState(20);
 const [questions,setQuestions]=useState<Question[]>([]);
 const [latest,setLatest]=useState<Record<string,Status>>({});
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [started,setStarted]=useState<string[]|null>(null);
 useEffect(()=>{let ignore=false;setLoading(includeStandalone);setError('');if(!includeStandalone){setQuestions([]);return()=>{ignore=true};}(async()=>{
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
 })();return()=>{ignore=true}},[includeStandalone]);
 const eligible=useMemo(()=>questions.filter(q=>topics.includes(q.category)&&
   (section==='all'||(section==='ngn'?isNgnQuestion(q):!isNgnQuestion(q)))&&statuses.includes(latest[q.id]??'unused')
 ),[questions,topics,section,statuses,latest]);
 const countByStatus=(status:Status)=>questions.filter(q=>topics.includes(q.category)&&(section==='all'||(section==='ngn'?isNgnQuestion(q):!isNgnQuestion(q)))&&(latest[q.id]??'unused')===status).length;
 const max=includeStandalone?Math.min(50-caseQuestionCount,eligible.length):0;
 const selectionMessage=loading?'Loading questions…':error||(includeCases&&caseLoading?'Loading cases…':includeCases&&!caseReady?'Case-study exams are being prepared. Standalone questions remain available.':includeCases&&!caseIds.length?'Select at least one complete case.':includeStandalone&&max===0?'No standalone questions match your filters.':includeStandalone&&(!Number.isInteger(count)||count<1||count>max)?`Choose a whole number from 1 to ${max} for standalone questions. Your cases use ${caseQuestionCount} of the 50 available slots.`:`Ready to generate ${(includeStandalone?count:0)+caseQuestionCount} questions`);
 function toggleTopic(topic:Category){setTopics(current=>current.includes(topic)?current.filter(t=>t!==topic):[...current,topic])}
 function toggleStatus(status:Status){setStatuses(current=>current.includes(status)?current.filter(t=>t!==status):[...current,status])}
 function build(){if((includeStandalone&&!max)||(includeCases&&(!caseReady||caseLoading||!caseIds.length)))return;const pool=mode==='standard'?[...eligible].sort(()=>Math.random()-.5):eligible;
  setStarted(includeStandalone?pool.slice(0,Math.min(Math.max(1,count),max)).map(q=>q.id):[])}
 if(started)return <Exam key={started.join(',')} selectedIds={started} caseIds={includeCases?caseIds:undefined} initialMode={examMode} onExit={()=>setStarted(null)}/>;
 const shell='rounded-2xl border border-rose/30 bg-[#FFF9F2] p-5 md:p-7';
 const pill=(active:boolean)=>`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${active?'bg-mauve text-white':'text-mauve hover:bg-blush'}`;
 return <div className="space-y-5 max-w-5xl">
  {includeStandalone&&<>
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
    <p className="mt-5 text-xs text-espresso/60">Status is based on saved completed exam responses. “Marked” is not shown because flags are not yet stored in your database.</p>
  </div>
  <div className={shell}>
    <h2 className="text-2xl">Question Category <span className="text-rose text-sm" title="Select one or more maternity pillars">ⓘ</span></h2>
    <div className="flex flex-wrap gap-2 mt-5" role="group" aria-label="Question bank section">{([['all','All Questions'],['standard','Standard Questions'],['ngn','NGN Questions']] as const).map(([value,label])=><button key={value} className={pill(section===value)} aria-pressed={section===value} onClick={()=>setSection(value)}>{label}</button>)}</div><div className="inline-flex bg-oatmeal rounded-full p-1 mt-5"><span className={pill(true)}>Subjects</span><span className="px-5 py-2 text-sm text-espresso/40">Client Needs · coming soon</span></div>
    <div className="mt-6"><label className="inline-flex items-center gap-2 font-semibold text-sm">
      <input type="checkbox" className="accent-mauve h-4 w-4" checked={topics.length===pillars.length} onChange={()=>setTopics(topics.length===pillars.length?[]:[...pillars])}/> All maternity subjects
    </label></div>
    <div className="grid sm:grid-cols-2 gap-x-10 gap-y-5 mt-6">
      {pillars.map(topic=><label key={topic} className="flex items-center justify-between gap-3 cursor-pointer rounded-xl border border-rose/25 bg-cream/45 px-4 py-3">
        <span className="flex gap-3 items-center"><input type="checkbox" className="accent-mauve h-4 w-4" checked={topics.includes(topic)} onChange={()=>toggleTopic(topic)}/><span className="text-sm font-medium">{topic}</span></span>
        <span className="pill">{questions.filter(q=>q.category===topic&&(section==='all'||(section==='ngn'?isNgnQuestion(q):!isNgnQuestion(q)))).length}</span>
      </label>)}
    </div>
    <p className="mt-6 text-sm text-espresso/70">NGN Questions includes standalone bowties, highlighted findings, cloze, drag-and-drop, and matrix questions. Use the content options above to include complete patient-chart cases.</p>
    <p className="mt-3 text-xs text-espresso/60">Only published questions appear. Counts reflect your Supabase content, not the example platform.</p>
  </div>
  </>}
  {caseSelection}
  <div className={shell}>
    {includeStandalone&&<div className="flex flex-wrap items-center gap-5 justify-between">
      <div><h2 className="text-2xl">Number of Standalone Questions</h2><p className="mt-1 text-sm text-espresso/60">{eligible.length} matching questions · Up to {max} per test</p></div>
      <input aria-label="Number of questions" type="number" min={1} max={Math.max(1,max)} value={count} onChange={e=>setCount(Number(e.target.value))} className="w-24 rounded-xl border border-rose/40 p-3 bg-white text-center"/>
    </div>}
    <p className="mt-4 text-sm text-espresso/70">{includeStandalone?Math.min(Math.max(1,count),Math.max(0,max)):0} standalone questions + {caseQuestionCount} case items · {includeCases?caseIds.length:0} complete cases · Up to 50 questions total</p>
    <div className="mt-6 flex items-center gap-3"><span className="text-sm font-semibold">Exam experience:</span>
      <button className={pill(examMode==='study')} onClick={()=>setExamMode('study')}>Study</button>
      <button className={pill(examMode==='test')} onClick={()=>setExamMode('test')}>Timed Test</button>
    </div>
  </div>
  <div className="flex flex-wrap justify-between gap-4 items-center rounded-2xl bg-oatmeal p-5">
    <div className="text-sm text-espresso/70">{selectionMessage}</div>
    <button className="btn-primary disabled:opacity-50" disabled={loading||!!error||(includeStandalone&&(max===0||!Number.isInteger(count)||count<1||count>max))||(includeCases&&(!caseReady||caseLoading||!caseIds.length||caseQuestionCount>50))} onClick={build}>Generate Test →</button>
  </div>
 </div>
}

type CaseChoice={id:string;case_number:number;topic:string;intro:string};
export function QuestionBuilder({initialMode='study'}:{initialMode?:'study'|'test'}){
 const [content,setContent]=useState<'standalone'|'cases'|'both'>('standalone');
 const [caseIds,setCaseIds]=useState<string[]>([]),[cases,setCases]=useState<CaseChoice[]>([]),[caseTopic,setCaseTopic]=useState('All');
 const [caseReady,setCaseReady]=useState(false),[caseLoading,setCaseLoading]=useState(true),[caseError,setCaseError]=useState(''),[reload,setReload]=useState(0);
 useEffect(()=>{let active=true;setCaseLoading(true);setCaseError('');Promise.all([
  fetch('/api/ngn?formats=extended-v1',{cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw Error('Could not load published cases.');return data}),
  fetch('/api/exams/capabilities',{cache:'no-store'}).then(async r=>r.ok?(await r.json()).caseExams===true:false).catch(()=>false)
 ]).then(([data,ready])=>{if(!active)return;const available=completeExamCases<CaseChoice>(data.cases??[],data.items??[]);setCases(available);setCaseIds(ids=>ids.filter(id=>available.some(c=>c.id===id)));setCaseReady(ready);}).catch(()=>{if(active)setCaseError('Could not load the case library. Please try again.');}).finally(()=>{if(active)setCaseLoading(false)});return()=>{active=false};},[reload]);
 const includeCases=content!=='standalone';
 const selection=includeCases?<section className="rounded-2xl border border-rose/30 bg-[#FFF9F2] p-5 md:p-7" aria-label="Select complete NGN cases"><h2 className="text-2xl">Choose complete NGN cases</h2><p className="mt-2 text-sm text-espresso/65">Each selected case adds all six questions in their original order. Choose up to eight cases within the 50-question exam limit.</p>
  <div role="group" aria-label="Case topics" className="flex flex-wrap gap-2 mt-4">{['All',...pillars].map(topic=><button type="button" key={topic} aria-pressed={caseTopic===topic} onClick={()=>setCaseTopic(topic)} className={'rounded-full px-4 py-2 text-sm font-semibold '+(caseTopic===topic?'bg-mauve text-white':'bg-oatmeal text-mauve')}>{topic}</button>)}</div>
  {caseLoading?<p role="status" className="mt-4">Loading case studies…</p>:caseError?<p role="alert" className="mt-4">{caseError} <button type="button" className="underline" onClick={()=>setReload(n=>n+1)}>Retry cases</button></p>:<div className="grid sm:grid-cols-2 gap-3 mt-5">{cases.filter(c=>caseTopic==='All'||c.topic===caseTopic).map(c=><label key={c.id} className="flex gap-3 items-start rounded-xl border border-rose/30 p-4 cursor-pointer"><input type="checkbox" className="accent-mauve mt-1" checked={caseIds.includes(c.id)} disabled={!caseIds.includes(c.id)&&caseIds.length>=8} onChange={()=>setCaseIds(ids=>ids.includes(c.id)?ids.filter(id=>id!==c.id):[...ids,c.id])}/><span><strong>{c.topic} Case Study {c.case_number}</strong><span className="block text-xs text-espresso/65 mt-1">6 questions</span></span></label>)}</div>}
  {!caseLoading&&!caseError&&!cases.length&&<p className="mt-4">No complete published cases are available yet.</p>}
  {!caseLoading&&!caseError&&!caseReady&&<p role="status" className="mt-4 text-sm text-espresso/70">Case-study exams are being prepared. You can continue with standalone questions.</p>}
  <p className="mt-4 text-sm font-semibold text-mauve">{caseIds.length} cases selected · {caseIds.length*CASE_ITEM_COUNT} case questions</p>
 </section>:undefined;
 return <div className="space-y-5 max-w-6xl"><section className="rounded-2xl border border-rose/30 bg-[#FFF9F2] p-5 md:p-7" aria-label="Choose exam content"><h2 className="text-2xl">Choose your exam content</h2><p className="mt-2 text-sm text-espresso/65">Choose standalone questions, complete NGN case studies, or both together in one exam.</p><div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Exam content type">{([['standalone','Standalone Questions'],['cases','NGN Case Studies'],['both','Both Together']] as const).map(([value,label])=><button type="button" key={value} aria-pressed={content===value} aria-controls="exam-content-builder" onClick={()=>setContent(value)} className={'rounded-full border px-5 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mauve '+(content===value?'bg-mauve text-white border-mauve':'border-rose/50 text-mauve hover:bg-blush')}>{label}</button>)}</div></section>
  <div id="exam-content-builder"><StandaloneQuestionBuilder initialMode={initialMode} contentMode={content} caseIds={caseIds} caseSelection={selection} caseReady={caseReady} caseLoading={caseLoading}/></div>
 </div>;
}

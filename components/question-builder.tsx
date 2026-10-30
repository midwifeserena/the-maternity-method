'use client';
import {useEffect,useMemo,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {Exam} from '@/components/exam';
import type {Question,Category} from '@/lib/questions';

type Status='unused'|'incorrect'|'correct'|'omitted';
const pillars:Category[]=['Antepartum','Intrapartum','Postpartum','Newborn'];
const statusLabels:{key:Status;label:string}[]=[
  {key:'unused',label:'Unused'},{key:'incorrect',label:'Incorrect'},
  {key:'omitted',label:'Omitted'},{key:'correct',label:'Correct'}
];
const isStatus=(v:string):v is Status=>['unused','incorrect','correct','omitted'].includes(v);
export function QuestionBuilder({initialMode='study'}:{initialMode?:'study'|'test'}){
 const [mode,setMode]=useState<'standard'|'custom'>('standard');
 const [examMode,setExamMode]=useState<'study'|'test'>(initialMode);
 const [topics,setTopics]=useState<Category[]>([...pillars]);
 const [statuses,setStatuses]=useState<Status[]>(['unused','incorrect','omitted','correct']);
 const [includeNGN,setIncludeNGN]=useState(true);
 const [count,setCount]=useState(20);
 const [questions,setQuestions]=useState<Question[]>([]);
 const [latest,setLatest]=useState<Record<string,Status>>({});
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [started,setStarted]=useState<string[]|null>(null);
 useEffect(()=>{let ignore=false;(async()=>{
   try{
    const response=await fetch('/api/questions?category=All',{cache:'no-store'});
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
 const eligible=useMemo(()=>questions.filter(q=>topics.includes(q.category)&&
   (includeNGN||q.type!=='matrix')&&statuses.includes(latest[q.id]??'unused')
 ),[questions,topics,includeNGN,statuses,latest]);
 const countByStatus=(status:Status)=>questions.filter(q=>topics.includes(q.category)&&(includeNGN||q.type!=='matrix')&&(latest[q.id]??'unused')===status).length;
 const max=Math.min(50,eligible.length);
 function toggleTopic(topic:Category){setTopics(current=>current.includes(topic)?current.filter(t=>t!==topic):[...current,topic])}
 function toggleStatus(status:Status){setStatuses(current=>current.includes(status)?current.filter(t=>t!==status):[...current,status])}
 function build(){if(!max)return;const pool=mode==='standard'?[...eligible].sort(()=>Math.random()-.5):eligible;
  setStarted(pool.slice(0,Math.min(Math.max(1,count),max)).map(q=>q.id))}
 if(started)return <div><button className="btn-outline mb-6" onClick={()=>setStarted(null)}>← Back to test builder</button><Exam key={started.join(',')} selectedIds={started} initialMode={examMode}/></div>;
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
    <p className="mt-5 text-xs text-espresso/60">Status is based on saved completed exam responses. “Marked” is not shown because flags are not yet stored in your database.</p>
  </div>
  <div className={shell}>
    <h2 className="text-2xl">Question Category <span className="text-rose text-sm" title="Select one or more maternity pillars">ⓘ</span></h2>
    <div className="inline-flex bg-oatmeal rounded-full p-1 mt-5"><span className={pill(true)}>Subjects</span><span className="px-5 py-2 text-sm text-espresso/40">Client Needs · coming soon</span></div>
    <div className="mt-6"><label className="inline-flex items-center gap-2 font-semibold text-sm">
      <input type="checkbox" className="accent-mauve h-4 w-4" checked={topics.length===pillars.length} onChange={()=>setTopics(topics.length===pillars.length?[]:[...pillars])}/> All maternity subjects
    </label></div>
    <div className="grid sm:grid-cols-2 gap-x-10 gap-y-5 mt-6">
      {pillars.map(topic=><label key={topic} className="flex items-center justify-between gap-3 cursor-pointer rounded-xl border border-rose/25 bg-cream/45 px-4 py-3">
        <span className="flex gap-3 items-center"><input type="checkbox" className="accent-mauve h-4 w-4" checked={topics.includes(topic)} onChange={()=>toggleTopic(topic)}/><span className="text-sm font-medium">{topic}</span></span>
        <span className="pill">{questions.filter(q=>q.category===topic).length}</span>
      </label>)}
    </div>
    <label className="flex items-center gap-2 mt-6 text-sm"><input type="checkbox" className="accent-mauve" checked={includeNGN} onChange={e=>setIncludeNGN(e.target.checked)}/> Include NGN matrix items</label>
    <p className="mt-3 text-xs text-espresso/60">Only published questions appear. Counts reflect your Supabase content, not the example platform.</p>
  </div>
  <div className={shell}>
    <div className="flex flex-wrap items-center gap-5 justify-between">
      <div><h2 className="text-2xl">Number of Questions</h2><p className="mt-1 text-sm text-espresso/60">{eligible.length} matching questions · Up to {max} per test</p></div>
      <input aria-label="Number of questions" type="number" min={1} max={Math.max(1,max)} value={count} onChange={e=>setCount(Number(e.target.value))} className="w-24 rounded-xl border border-rose/40 p-3 bg-white text-center"/>
    </div>
    <div className="mt-6 flex items-center gap-3"><span className="text-sm font-semibold">Exam experience:</span>
      <button className={pill(examMode==='study')} onClick={()=>setExamMode('study')}>Study</button>
      <button className={pill(examMode==='test')} onClick={()=>setExamMode('test')}>Timed Test</button>
    </div>
  </div>
  <div className="flex flex-wrap justify-between gap-4 items-center rounded-2xl bg-oatmeal p-5">
    <div className="text-sm text-espresso/70">{loading?'Loading questions…':error||`Ready to generate ${Math.min(Math.max(1,count),max)} questions`}</div>
    <button className="btn-primary disabled:opacity-50" disabled={loading||!!error||max===0||count<1||count>max} onClick={build}>Generate Test →</button>
  </div>
 </div>
}

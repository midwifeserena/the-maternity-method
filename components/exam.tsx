'use client';
import {ExamWindow,ExamHeader,ExamFooter} from './exam-window';
import {useExamAnnotations} from './use-exam-annotations';
import {useChoiceStrikeout} from './use-choice-strikeout';
import './exam-annotations.css';
import {useCallback,useEffect,useRef,useState,type CSSProperties} from 'react';
import {useRouter} from 'next/navigation';
import {Bookmark,Calculator,Check,ChevronLeft,ChevronRight,Highlighter,ListChecks,LogOut,Pause,Play,Settings,Strikethrough,X} from 'lucide-react';
import {calculateExpression,formatExamTime,isQuestionAnswered} from '@/lib/exam-tools.mjs';
import type {Question,Category} from '@/lib/questions';
import {FormattedText} from './formatted-text';
import {AnswerExplanations} from './answer-explanations';
import {NgnQuestion} from './ngn-question';
import {QuestionMatrix} from './question-matrix';
import {NursingTip} from './nursing-tip';
import {ExamCaseChart} from './exam-case-chart';
import {ExamImages} from './exam-images';
import './exam.css';

type Answer=string|string[]|Record<string,string|string[]>;
type Feedback={earned:number;possible:number;rationale:string;answer_key:unknown;rationale_images?:{url:string;alt:string}[];nursing_tip?:string|null;row_explanations?:Record<string,string>;answer_explanations?:Record<string,string>;rationale_format?:'plain'|'markdown';test_taking_tip?:string|null};
type Panel='settings'|'calculator'|'navigator'|'end'|null;
const DURATION=30*60;
const THEME_KEY='maternity-method-exam-theme';

export function Exam({category='All',initialMode='study',selectedIds,caseIds,onExit,resumeAttemptId}:{category?:Category|'All';initialMode?:'study'|'test';selectedIds?:string[];caseIds?:string[];onExit?:()=>void;resumeAttemptId?:string}){
 const router=useRouter();
 const [mode,setMode]=useState(initialMode);const withCases=Boolean(caseIds?.length);
 const shell=useRef<HTMLDialogElement>(null),popup=useRef<HTMLDialogElement>(null),stem=useRef<HTMLHeadingElement>(null);
 const clock=useRef({milliseconds:0,started:null as number|null});
 const telemetry=useRef({milliseconds:{} as Record<string,number>,firstAnswers:{} as Record<string,string>});
 const flushQuestionTime=useRef<()=>void>(()=>{});
 const submitting=useRef(false),autoSubmitted=useRef(false);
 const [phase,setPhase]=useState<'loading'|'active'|'error'|'submitting'|'complete'>('loading');
 const [items,setItems]=useState<Question[]>([]),[index,setIndex]=useState(0);
 const [attemptId,setAttemptId]=useState<string|null>(null),[reviewAvailable,setReviewAvailable]=useState(true);
 const [answers,setAnswers]=useState<Record<string,Answer>>({}),[feedback,setFeedback]=useState<Record<string,Feedback>>({});
 const [message,setMessage]=useState(''),[retry,setRetry]=useState(0),[elapsed,setElapsed]=useState(0),[paused,setPaused]=useState(false);
 const [flags,setFlags]=useState<string[]>([]),[highlights,setHighlights]=useState<string[]>([]),[strikes,setStrikes]=useState<Record<string,string[]>>({}),[strikeMode,setStrikeMode]=useState(false);
 const [tab,setTab]=useState(''),[panel,setPanel]=useState<Panel>(null),[checking,setChecking]=useState(false);
 const [theme,setTheme]=useState<'light'|'dark'>('light'),[preferencesReady,setPreferencesReady]=useState(false),[fontSize,setFontSize]=useState(16);
 const [calculation,setCalculation]=useState(''),[calculatorError,setCalculatorError]=useState(''),[sessionMark,setSessionMark]=useState('');
 const [saving,setSaving]=useState(false),[saveNotice,setSaveNotice]=useState(''),[draftReady,setDraftReady]=useState(false);
 const draftRevision=useRef(0),saveQueue=useRef(Promise.resolve()),latestDraft=useRef<any>(null),savedDraft=useRef(''),progressActions=useRef<any>(null),restoreAnnotations=useRef<any>(null),mounted=useRef(true),conflict=useRef(false);
 const [result,setResult]=useState<{attemptId?:string;earned:number;possible:number}|null>(null);
 const remaining=Math.max(0,DURATION-elapsed),expired=mode==='test'&&remaining===0;
 const question=items[index],answer=question?answers[question.id]:undefined,review=question?feedback[question.id]:undefined;
 const annotations=useExamAnnotations(shell,question?.id??'',tab);restoreAnnotations.current=annotations.restoreHighlights;
 const choiceEvents=useChoiceStrikeout<Answer|undefined>(answer,value=>{if(value!==undefined)choose(value);else if(question){delete telemetry.current.firstAnswers[question.id];setAnswers(old=>{const next={...old};delete next[question.id];return next;});}},id=>{if(!question)return;setStrikes(old=>({...old,[question.id]:(old[question.id]??[]).includes(id)?old[question.id].filter(x=>x!==id):[...(old[question.id]??[]),id]}));},question?.type==='single'&&!review&&!checking&&phase==='active'&&!paused);
 const answered=items.filter(item=>isQuestionAnswered(item,answers[item.id])).length;
 const exit=useCallback(()=>{if(onExit)onExit();else router.push(resumeAttemptId?'/previous-tests':'/question-bank')},[onExit,router,resumeAttemptId]);

 useEffect(()=>{
  const dialog=shell.current;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  if(dialog&&!dialog.open)dialog.showModal();
  setSessionMark(document.getElementById('protected-course-content')?.dataset.watermark??'');
  try{const stored=localStorage.getItem(THEME_KEY);if(stored==='light'||stored==='dark')setTheme(stored)}catch{}
  setPreferencesReady(true);
  return()=>{dialog?.close();document.body.style.overflow=overflow};
 },[]);
 useEffect(()=>{if(preferencesReady)try{localStorage.setItem(THEME_KEY,theme)}catch{}},[theme,preferencesReady]);
 useEffect(()=>{
  const dialog=popup.current;if(!dialog)return;
  if(panel&&!dialog.open)dialog.showModal();else if(!panel&&dialog.open)dialog.close();
 },[panel]);
 useEffect(()=>{
  const controller=new AbortController();
  setDraftReady(false);draftRevision.current=0;savedDraft.current='';conflict.current=false;setSaveNotice('');setPhase('loading');setAttemptId(null);setMessage('');setItems([]);setIndex(0);setAnswers({});setFeedback({});setResult(null);setFlags([]);setStrikes({});setHighlights([]);setPaused(false);setElapsed(0);setPanel(null);
  telemetry.current={milliseconds:{},firstAnswers:{}};
  clock.current={milliseconds:0,started:null};autoSubmitted.current=false;submitting.current=false;
  (async()=>{
   try{
    if(resumeAttemptId){
     const response=await fetch('/api/exams/'+resumeAttemptId+'/progress',{cache:'no-store',signal:controller.signal}),data=await response.json();if(controller.signal.aborted)return;if(!response.ok)throw Error(data.error||'Could not resume this exam.');
     const state=data.state;draftRevision.current=data.revision;setMode(data.mode);setAttemptId(data.attemptId);setReviewAvailable(true);setItems(data.questions);setIndex(state.index);setAnswers(state.answers);setFeedback(data.feedback??{});setFlags(state.flags);setHighlights(state.highlights);setStrikes(state.strikes);telemetry.current=state.telemetry;clock.current={milliseconds:state.elapsed*1000,started:null};setElapsed(state.elapsed);restoreAnnotations.current(state.annotations??{});setPaused(true);setDraftReady(true);setPhase('active');return;
    }
    setMode(initialMode);let ids=selectedIds;
    if(!ids){
     const bank=await fetch('/api/questions?formats=extended-v1&category='+encodeURIComponent(category),{cache:'no-store',signal:controller.signal});
     const data=await bank.json();if(!bank.ok||!Array.isArray(data.questions))throw Error(data.error||'Could not load questions.');
     ids=(data.questions as Question[]).slice(0,150).map(item=>item.id);
    }
    const response=await fetch('/api/exams/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({questionIds:ids,mode:initialMode,...(withCases?{caseIds}: {})}),signal:controller.signal});
    const data=await response.json();if(controller.signal.aborted)return;
    if(!response.ok||!Array.isArray(data.questions))throw Error(data.error||'Could not prepare your test.');
    const selected=data.questions as Question[];
    if(!selected.length||selected.length>150||(!withCases&&selected.length!==ids.length)||(withCases&&selected.length<ids.length+(caseIds?.length??0)*6))throw Error('Some selected questions are no longer available. Return to the builder and generate another test.');
    setAttemptId(data.attemptId??null);setReviewAvailable(Boolean(data.reviewSnapshotAvailable));
    setItems(selected);setDraftReady(true);setPhase('active');
   }catch(error){if(!controller.signal.aborted){setMessage(error instanceof Error?error.message:'Could not load your test.');setPhase('error')}}
  })();
  return()=>controller.abort();
 },[category,selectedIds,caseIds,retry,initialMode,withCases,resumeAttemptId]);
 useEffect(()=>{
  if(phase!=='active'||paused||!items.length)return;
  const activeClock=clock.current;activeClock.started=performance.now();
  const update=()=>setElapsed(Math.floor((activeClock.milliseconds+performance.now()-(activeClock.started??performance.now()))/1000));
  const interval=window.setInterval(update,250);
  return()=>{
   clearInterval(interval);
   if(activeClock.started!==null){activeClock.milliseconds+=Math.max(0,performance.now()-activeClock.started);activeClock.started=null;}
   if(clock.current===activeClock)setElapsed(Math.floor(activeClock.milliseconds/1000));
  };
 },[phase,paused,items.length]);
 useEffect(()=>{
  if(phase!=='active'||paused||!question||review)return;
  const id=question.id,record=telemetry.current;let began:number|null=null;
  const flush=()=>{if(began!==null){record.milliseconds[id]=(record.milliseconds[id]??0)+Math.max(0,performance.now()-began);began=null;}};
  const visibility=()=>{flush();if(!document.hidden){record.milliseconds[id]??=0;began=performance.now();}};
  visibility();const saveTiming=()=>{flush();if(!document.hidden)began=performance.now()};flushQuestionTime.current=saveTiming;document.addEventListener('visibilitychange',visibility);
  return()=>{flush();document.removeEventListener('visibilitychange',visibility);if(flushQuestionTime.current===saveTiming)flushQuestionTime.current=()=>{};};
 },[question,phase,paused,review]);
 const finish=useCallback(async()=>{
  if(submitting.current||result||!items.length)return;
  flushQuestionTime.current();
  submitting.current=true;setPhase('submitting');setPanel(null);setMessage('');
  const activeClock=clock.current;
  const activeSeconds=Math.floor((activeClock.milliseconds+(activeClock.started===null?0:Math.max(0,performance.now()-activeClock.started)))/1000);
  const duration=mode==='test'?Math.min(DURATION,activeSeconds):activeSeconds;
  try{
   const response=await fetch('/api/exams/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,questionIds:items.map(item=>item.id),answers,telemetry:{version:1,...telemetry.current},durationSeconds:duration,attemptId:attemptId??undefined})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Could not save your test.');
   setResult(data);setPhase('complete');
  }catch(error){setMessage(error instanceof Error?error.message:'Could not save your test. Your responses are still here; please try again.');setPaused(true);setPhase('active')}
  finally{submitting.current=false}
 },[answers,items,mode,result,attemptId]);
 useEffect(()=>{if(expired&&phase==='active'&&!autoSubmitted.current){autoSubmitted.current=true;setPaused(true);void finish()}},[expired,phase,finish]);

 function progress(){const c=clock.current;return {version:1,index,elapsed:Math.min(86400,Math.floor((c.milliseconds+(c.started===null?0:Math.max(0,performance.now()-c.started)))/1000)),answers,flags,highlights,strikes,checked:Object.keys(feedback),annotations:annotations.exportHighlights(),telemetry:{milliseconds:{...telemetry.current.milliseconds},firstAnswers:{...telemetry.current.firstAnswers}}};}
 latestDraft.current={attemptId,state:progress(),phase};
 function saveProgress(keepalive=false){
  flushQuestionTime.current();if(latestDraft.current)latestDraft.current.state=progress();
  const job=saveQueue.current.catch(()=>{}).then(async()=>{
   const latest=latestDraft.current;if(!latest.attemptId)throw Error('This session cannot be saved until exam snapshots are enabled.');if(latest.phase!=='active')return;
   if(conflict.current)throw Error('This exam changed in another window. Reopen it from Previous Exams before continuing.');
   const state=latest.state,serialized=JSON.stringify(state);if(serialized===savedDraft.current)return;
   if(mounted.current){setSaving(true);setSaveNotice('Saving progress…');}
   try{const response=await fetch('/api/exams/'+latest.attemptId+'/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:draftRevision.current,state}),keepalive:keepalive&&serialized.length<50000}),data=await response.json();if(!response.ok){if(response.status===409)conflict.current=true;throw Error(data.error||'Could not save progress.');}draftRevision.current=data.revision;savedDraft.current=serialized;if(mounted.current){const edits=(value:any)=>JSON.stringify({...value,elapsed:0,telemetry:null});setSaveNotice(edits(state)===edits(latestDraft.current.state)?'Progress saved · No score yet':'Unsaved changes · Saving shortly…');}}
   catch(e){if(mounted.current)setSaveNotice((e as Error).message);throw e;}finally{if(mounted.current)setSaving(false);}
  });saveQueue.current=job;return job;
 }
 async function saveAndExit(){setPaused(true);setMessage('');try{await saveProgress();setPanel(null);router.push('/previous-tests');}catch(e){setMessage((e as Error).message);}}
 progressActions.current={save:saveProgress,snapshot:progress};
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
 useEffect(()=>{if(!draftReady||phase!=='active'||!attemptId)return;setSaveNotice('Unsaved changes · Saving shortly…');const timer=setTimeout(()=>{void progressActions.current.save().catch(()=>{})},800);return()=>clearTimeout(timer)},[draftReady,phase,attemptId,answers,index,flags,highlights,strikes,feedback,paused,annotations.revision]);
 useEffect(()=>{if(!draftReady||phase!=='active'||!attemptId)return;const timer=setInterval(()=>{latestDraft.current.state=progressActions.current.snapshot();void progressActions.current.save().catch(()=>{})},15000);return()=>clearInterval(timer)},[draftReady,phase,attemptId,index,answers,flags,highlights,strikes,feedback]);
 useEffect(()=>{const checkpoint=()=>{if(document.hidden&&latestDraft.current?.phase==='active'&&latestDraft.current.attemptId)void progressActions.current.save(true).catch(()=>{})};document.addEventListener('visibilitychange',checkpoint);return()=>document.removeEventListener('visibilitychange',checkpoint)},[]);
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{const latest=latestDraft.current;if(latest?.phase==='active'&&JSON.stringify(latest.state)!==savedDraft.current){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[]);
 function move(next:number){setIndex(next);setTab('');setPanel(null);setMessage('');requestAnimationFrame(()=>stem.current?.focus())}
 function choose(value:Answer){if(question&&!review&&!checking&&phase==='active'&&!paused){
  if(question.type==='single'&&!question.ngn_format&&typeof value==='string'&&question.options.some(o=>o.id===value)&&telemetry.current.firstAnswers[question.id]===undefined)telemetry.current.firstAnswers[question.id]=value;
  setAnswers(current=>({...current,[question.id]:value}));
 }}
 async function check(){
  if(!question||checking||!isQuestionAnswered(question,answer))return;
  setChecking(true);setMessage('');
  try{
   const response=await fetch('/api/study/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({questionId:question.id,answer,attemptId:attemptId??undefined})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Could not check your answer.');
   setFeedback(current=>({...current,[question.id]:data}));
  }catch(error){setMessage(error instanceof Error?error.message:'Could not check your answer. Please try again.')}finally{setChecking(false)}
 }
 function calculate(){try{setCalculation(calculateExpression(calculation));setCalculatorError('')}catch(error){setCalculatorError(error instanceof Error?error.message:'Invalid calculation')}}
 const chart=question?.chart??{},chartTabs=Object.keys(chart),currentTab=chartTabs.includes(tab)?tab:chartTabs[0];
 const disabled=phase!=='active'||paused||checking;

 return <ExamWindow onContextMenu={annotations.onContextMenu} onMouseUp={annotations.rememberSelection} onKeyUp={annotations.rememberSelection} ref={shell} data-theme={theme} style={{'--exam-font-size':fontSize+'px'} as CSSProperties} aria-label={mode==='study'?'Study test':'Timed practice exam'} onCancel={event=>{if(event.target===shell.current){event.preventDefault();if(phase==='active')setPanel('end')}}}>
  <ExamHeader label={mode==='study'?'Study test (Tutored, Untimed)':'Practice exam (Timed)'} time={formatExamTime(mode==='test'?remaining:elapsed)} timeLabel={mode==='test'?'Time remaining':'Elapsed study time'} position={`Question ${items.length?index+1:0} of ${items.length}`}/>
  <nav className="exam-toolbar" aria-label="Exam tools">
   <button type="button" onClick={()=>setPanel('calculator')} disabled={phase!=='active'}><Calculator size={18}/>Calculator</button>
   <button type="button" onMouseDown={event=>event.preventDefault()} onClick={()=>annotations.highlightSelection()}><Highlighter size={18}/>Highlight selection</button><button type="button" onClick={annotations.clearHighlights}>Clear text highlights</button><span className="exam-sr-only" role="status">{annotations.notice}</span>
   <button type="button" onClick={()=>setHighlights(current=>current.includes(question.id)?current.filter(id=>id!==question.id):[...current,question.id])} disabled={disabled||!question} aria-pressed={question?highlights.includes(question.id):false}><Highlighter size={18}/>Highlight</button>
   <button type="button" onClick={()=>setStrikeMode(value=>!value)} disabled={disabled||!question} aria-pressed={strikeMode}><Strikethrough size={18}/>Strike options</button>
   <span className="exam-toolbar-spacer"/>
   <button type="button" onClick={()=>setPanel('settings')}><Settings size={18}/>Settings</button>
   <button type="button" onClick={()=>setFlags(current=>current.includes(question.id)?current.filter(id=>id!==question.id):[...current,question.id])} disabled={disabled||!question} aria-pressed={question?flags.includes(question.id):false}><Bookmark size={18} fill={question&&flags.includes(question.id)?'currentColor':'none'}/>Mark for Review</button>
   <button type="button" disabled={phase!=='active'||saving||checking||expired} onClick={()=>void saveAndExit()} aria-label="Save and close test"><X size={18}/>Save &amp; close</button>
  </nav>
  <main className={phase==='active'&&!paused&&!result&&question?.case_context?'exam-main exam-case-main':'exam-main'}>
   {phase==='loading'?<p role="status">Loading your test…</p>
    :phase==='error'?<section className="exam-centered"><h1>Test unavailable</h1><p role="alert">{message}</p><div className="exam-actions"><button type="button" onClick={()=>setRetry(value=>value+1)}>Try again</button><button type="button" onClick={exit}>Return to test builder</button></div></section>
    :phase==='submitting'?<section className="exam-centered" role="status"><h1>Saving your test…</h1><p>Please keep this page open.</p></section>
    :result?<section className="exam-centered"><p>Test submitted</p><h1>Your results</h1><strong className="exam-score">{result.possible?Math.round(result.earned/result.possible*100):0}%</strong><p>{result.earned} of {result.possible} available points</p><p>Your attempt is saved in Previous Exams and Performance.</p><div className="exam-actions"><button type="button" onClick={()=>router.push('/previous-tests')}>View previous exams</button>{result.attemptId&&<button type="button" onClick={()=>router.push('/previous-tests/'+result.attemptId)}>Review this exam</button>}<button type="button" onClick={exit}>Return to test builder</button></div></section>
    :paused?<section className="exam-centered"><h1>{expired?'Time is up':'Test paused'}</h1><p>{expired?'Submit your responses to save this attempt.':'Your questions are hidden and the timer is stopped.'}</p>{message&&<p role="alert">{message}</p>}<div className="exam-actions">{expired?<button type="button" onClick={()=>void finish()}>Retry submission</button>:<><button type="button" onClick={()=>{setPaused(false);setMessage('')}}>Resume test</button><button type="button" disabled={saving} onClick={()=>void saveAndExit()}>Save and exit</button><button type="button" onClick={()=>setPanel('end')}>End test</button></>}</div></section>
    :question&&<div className={question.case_context?'exam-question-layout exam-case-layout':chartTabs.length?'exam-question-layout exam-with-chart':'exam-question-layout'}>
     {question.case_context&&<ExamCaseChart key={question.id} context={question.case_context} scenario={question.clinical_scenario} format={question.content_format} chart={chart}/>}{!question.case_context&&chartTabs.length>0&&<aside className="exam-chart" aria-label="Patient chart"><h2>Patient chart</h2><div className="exam-chart-tabs" role="tablist" aria-label="Clinical chart sections">{chartTabs.map((title,n)=><button type="button" role="tab" id={'exam-chart-tab-'+n} aria-selected={currentTab===title} aria-controls="exam-chart-panel" key={title} onClick={()=>setTab(title)}>{title}</button>)}</div><div id="exam-chart-panel" role="tabpanel" aria-labelledby={'exam-chart-tab-'+chartTabs.indexOf(currentTab)} className="exam-chart-content" data-exam-annotation={'chart:'+currentTab}>{chart[currentTab]}</div></aside>}
     <article className="exam-question">
      {!reviewAvailable&&<p className="exam-question-kind">Detailed question snapshots are not enabled for this session.</p>}
      <p className="exam-question-kind">{question.category} · {question.ngn_format?({'calculation':'Calculation','ordered':'Ordered response','dyad-cloze':'Paired rationale cloze','bowtie':'Bowtie','highlight':'Highlight findings','cloze':'Drop-down cloze','drag-cloze':'Drag-and-drop cloze','drag-select':'Drag-and-drop selection'} as Record<string,string>)[question.ngn_format]:question.type==='sata'?'Select all that apply':question.type==='matrix'?'Matrix question':'Select the best answer'}</p>
      <>{!question.case_context&&question.clinical_scenario&&<p data-exam-annotation="scenario" className="exam-clinical-scenario"><FormattedText text={question.clinical_scenario} format={question.content_format}/></p>}</><h1 data-exam-annotation="stem" ref={stem} tabIndex={-1} className={highlights.includes(question.id)?'exam-stem exam-highlight':'exam-stem'}><FormattedText text={question.stem} format={question.content_format}/></h1>
      <ExamImages images={question.images} label="Question image"/>
      {question.ngn_format?<NgnQuestion question={question} answer={answer} solution={review?.answer_key} disabled={Boolean(review)||checking} onChange={choose}/>:question.type==='matrix'?<QuestionMatrix question={question} answer={answer} solution={review?.answer_key} rowExplanations={review?.row_explanations} disabled={Boolean(review)||checking} onChange={choose}/>
       :<fieldset className="exam-options"><legend className="exam-sr-only">{question.type==='sata'?'Select all correct answers':'Select one answer'}</legend>{question.options.map((option,n)=>{
        const selected=question.type==='single'?answer===option.id:Array.isArray(answer)&&answer.includes(option.id);
        const correct=Boolean(review&&(Array.isArray(review.answer_key)?review.answer_key.includes(option.id):review.answer_key===option.id));
        const crossed=(strikes[question.id]??[]).includes(option.id);
        return <div className={'exam-option-row'+(review?(correct?' exam-option-correct':selected?' exam-option-incorrect':''):'')} key={option.id}>
         <label className="exam-option" onMouseDown={choiceEvents.onMouseDown} onDoubleClick={event=>choiceEvents.onDoubleClick(option.id,event)}><input type={question.type==='single'?'radio':'checkbox'} name={question.id} disabled={Boolean(review)||checking} checked={Boolean(selected)} onChange={()=>choose(question.type==='single'?option.id:selected?(answer as string[]).filter(id=>id!==option.id):[...(Array.isArray(answer)?answer:[]),option.id])}/><span className="exam-option-number">{n+1}.</span><span className={crossed?'exam-option-crossed':''}>{option.label}<ExamImages images={option.images} label="Answer choice image"/></span>{correct&&<Check size={18} aria-label="Correct option"/>}</label>
         {strikeMode&&!review&&<button type="button" className="exam-strike-button" aria-label={'Strike option '+(n+1)} aria-pressed={crossed} onClick={()=>setStrikes(current=>({...current,[question.id]:crossed?(current[question.id]??[]).filter(id=>id!==option.id):[...(current[question.id]??[]),option.id]}))}><Strikethrough size={17}/></button>}
        </div>;
       })}</fieldset>}
      {mode==='study'&&!review&&!question.case_context&&<button type="button" className="exam-submit-answer" disabled={checking||!isQuestionAnswered(question,answer)} onClick={()=>void check()}>{checking?'Checking…':'Submit answer'}</button>}
      {question.case_context&&!review&&<p className="exam-question-kind">Case answers and rationales are available after you submit the exam.</p>}
      {review&&<section className="exam-rationale" aria-label="Answer rationale"><h2>Answer rationale · {review.earned}/{review.possible} points</h2><p><FormattedText text={review.rationale} format={review.rationale_format}/></p>{question.type!=='matrix'&&<AnswerExplanations options={question.options} answerKey={review.answer_key} explanations={review.answer_explanations}/>}<ExamImages images={review.rationale_images} label="Rationale image"/><NursingTip text={review.nursing_tip}/><NursingTip text={review.test_taking_tip} title="NCLEX Test-taking Tip"/></section>}
      {message&&<p role="alert" className="exam-error">{message}</p>}
     </article>
    </div>}
  </main>
  {phase==='active'&&<p className="exam-save-status" role="status">{saveNotice||'Saving progress keeps this exam incomplete and ungraded.'}</p>}
  <ExamFooter>
   <div className="exam-footer-group"><button type="button" onClick={()=>phase==='active'?setPanel('end'):exit()} disabled={phase==='submitting'||checking}><LogOut size={19}/>End</button><button type="button" disabled={phase!=='active'||expired||checking} onClick={()=>setPaused(value=>!value)}>{paused?<Play size={19}/>:<Pause size={19}/>} {paused?'Resume':'Pause'}</button></div>
   <span className="exam-session-mark">The Maternity Method{sessionMark?' · '+sessionMark:''}</span>
   <div className="exam-footer-group"><button type="button" disabled={disabled||index===0} onClick={()=>move(index-1)}><ChevronLeft size={22}/>Previous</button><button type="button" disabled={disabled||!items.length} onClick={()=>setPanel('navigator')}><ListChecks size={19}/>Navigator</button><button type="button" disabled={disabled||!items.length} onClick={()=>index<items.length-1?move(index+1):setPanel('end')}>{index<items.length-1?'Next':'Finish'}<ChevronRight size={22}/></button></div>
  </ExamFooter>
  <dialog ref={popup} className={'exam-popup exam-popup-'+(panel??'closed')} aria-label={panel==='settings'?'Test settings':panel==='calculator'?'Calculator':panel==='navigator'?'Question navigator':'End test'} onCancel={event=>{event.preventDefault();event.stopPropagation();setPanel(null)}} onClose={()=>setPanel(null)}>
   <div className="exam-popup-heading"><h2>{panel==='settings'?'Settings':panel==='calculator'?'Calculator':panel==='navigator'?'Question navigator':'End test'}</h2><button type="button" aria-label="Close panel" onClick={()=>setPanel(null)}><X size={20}/></button></div>
   {panel==='settings'&&<div className="exam-settings"><fieldset><legend>Viewing mode</legend>{(['light','dark'] as const).map(value=><label key={value}><input type="radio" name="exam-theme" checked={theme===value} onChange={()=>setTheme(value)}/>{value==='light'?'Light view':'Dark view'}</label>)}</fieldset><label>Question text size<select value={fontSize} onChange={event=>setFontSize(Number(event.target.value))}><option value={16}>Standard</option><option value={18}>Large</option><option value={20}>Extra large</option></select></label></div>}
   {panel==='calculator'&&<div className="exam-calculator"><label className="exam-sr-only" htmlFor="exam-calculation">Calculation</label><input id="exam-calculation" value={calculation} inputMode="decimal" autoComplete="off" onChange={event=>{setCalculation(event.target.value);setCalculatorError('')}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();calculate()}}}/>{calculatorError&&<p role="alert">{calculatorError}</p>}<div className="exam-calculator-keys">{['C','⌫','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','(',')','0','.'].map(key=><button type="button" key={key} aria-label={key==='⌫'?'Backspace':key==='C'?'Clear calculation':key} onClick={()=>{setCalculatorError('');setCalculation(value=>key==='C'?'':key==='⌫'?value.slice(0,-1):value+key)}}>{key}</button>)}</div><button type="button" className="exam-calculate" onClick={calculate}>Calculate =</button></div>}
   {panel==='navigator'&&<><p className="exam-navigation-summary">{answered} answered · {items.length-answered} unanswered · {flags.length} marked for review</p><div className="exam-navigator-grid">{items.map((item,n)=>{const complete=isQuestionAnswered(item,answers[item.id]),marked=flags.includes(item.id);return <button type="button" key={item.id} className={(complete?'is-answered ':'')+(n===index?'is-current':'')} aria-label={'Question '+(n+1)+', '+(complete?'answered':'unanswered')+(marked?', marked for review':'')} aria-current={n===index?'step':undefined} onClick={()=>move(n)}>{n+1}{marked&&<Bookmark size={12} fill="currentColor"/>}</button>})}</div></>}
   {panel==='end'&&<>{message&&<p role="alert">{message}</p>}<p>You have answered {answered} of {items.length} questions.</p>{answered<items.length&&<p>{items.length-answered} questions are unanswered or incomplete. You can return to them before submitting.</p>}<p>Save and exit keeps this exam incomplete without a score. Submit only when you are ready to be graded.</p><div className="exam-end-actions"><button type="button" disabled={saving||checking||expired} onClick={()=>void saveAndExit()}>Save and exit</button><button type="button" onClick={()=>setPanel(null)}>Continue test</button><button type="button" onClick={()=>void finish()}>Submit and end test</button><button type="button" className="exam-discard" onClick={exit}>Exit without saving recent changes</button></div></>}
  </dialog>
 </ExamWindow>;
}

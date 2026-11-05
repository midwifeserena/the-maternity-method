'use client';
import {useCallback,useEffect,useRef,useState,type CSSProperties} from 'react';
import {useRouter} from 'next/navigation';
import {Bookmark,Calculator,Check,ChevronLeft,ChevronRight,Clock,Highlighter,ListChecks,LogOut,Pause,Play,Settings,Strikethrough,X} from 'lucide-react';
import {calculateExpression,formatExamTime,isQuestionAnswered} from '@/lib/exam-tools.mjs';
import type {Question,Category} from '@/lib/questions';
import {FormattedText} from './formatted-text';
import {AnswerExplanations} from './answer-explanations';
import {NgnQuestion} from './ngn-question';
import {QuestionMatrix} from './question-matrix';
import {NursingTip} from './nursing-tip';
import {ExamImages} from './exam-images';
import './exam.css';

type Answer=string|string[]|Record<string,string|string[]>;
type Feedback={earned:number;possible:number;rationale:string;answer_key:unknown;rationale_images?:{url:string;alt:string}[];nursing_tip?:string|null;row_explanations?:Record<string,string>;answer_explanations?:Record<string,string>;rationale_format?:'plain'|'markdown';test_taking_tip?:string|null};
type Panel='settings'|'calculator'|'navigator'|'end'|null;
const DURATION=30*60;
const THEME_KEY='maternity-method-exam-theme';

export function Exam({category='All',initialMode='study',selectedIds,onExit}:{category?:Category|'All';initialMode?:'study'|'test';selectedIds?:string[];onExit?:()=>void}){
 const router=useRouter();
 const mode=initialMode;
 const shell=useRef<HTMLDialogElement>(null),popup=useRef<HTMLDialogElement>(null),stem=useRef<HTMLHeadingElement>(null);
 const clock=useRef({milliseconds:0,started:null as number|null});
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
 const [result,setResult]=useState<{attemptId?:string;earned:number;possible:number}|null>(null);
 const remaining=Math.max(0,DURATION-elapsed),expired=mode==='test'&&remaining===0;
 const question=items[index],answer=question?answers[question.id]:undefined,review=question?feedback[question.id]:undefined;
 const answered=items.filter(item=>isQuestionAnswered(item,answers[item.id])).length;
 const exit=useCallback(()=>{if(onExit)onExit();else router.push('/question-bank')},[onExit,router]);

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
  setPhase('loading');setAttemptId(null);setMessage('');setItems([]);setIndex(0);setAnswers({});setFeedback({});setResult(null);setFlags([]);setStrikes({});setHighlights([]);setPaused(false);setElapsed(0);setPanel(null);
  clock.current={milliseconds:0,started:null};autoSubmitted.current=false;submitting.current=false;
  (async()=>{
   try{
    let ids=selectedIds;
    if(!ids){
     const bank=await fetch('/api/questions?category='+encodeURIComponent(category),{cache:'no-store',signal:controller.signal});
     const data=await bank.json();if(!bank.ok||!Array.isArray(data.questions))throw Error(data.error||'Could not load questions.');
     ids=(data.questions as Question[]).slice(0,50).map(item=>item.id);
    }
    const response=await fetch('/api/exams/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({questionIds:ids,mode}),signal:controller.signal});
    const data=await response.json();if(controller.signal.aborted)return;
    if(!response.ok||!Array.isArray(data.questions))throw Error(data.error||'Could not prepare your test.');
    const selected=data.questions as Question[];
    if(!selected.length||selected.length!==ids.length)throw Error('Some selected questions are no longer available. Return to the builder and generate another test.');
    setAttemptId(data.attemptId??null);setReviewAvailable(Boolean(data.reviewSnapshotAvailable));
    setItems(selected);setPhase('active');
   }catch(error){if(!controller.signal.aborted){setMessage(error instanceof Error?error.message:'Could not load your test.');setPhase('error')}}
  })();
  return()=>controller.abort();
 },[category,selectedIds,retry,mode]);
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
 const finish=useCallback(async()=>{
  if(submitting.current||result||!items.length)return;
  submitting.current=true;setPhase('submitting');setPanel(null);setMessage('');
  const activeClock=clock.current;
  const activeSeconds=Math.floor((activeClock.milliseconds+(activeClock.started===null?0:Math.max(0,performance.now()-activeClock.started)))/1000);
  const duration=mode==='test'?Math.min(DURATION,activeSeconds):activeSeconds;
  try{
   const response=await fetch('/api/exams/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,questionIds:items.map(item=>item.id),answers,durationSeconds:duration,attemptId:attemptId??undefined})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Could not save your test.');
   setResult(data);setPhase('complete');
  }catch(error){setMessage(error instanceof Error?error.message:'Could not save your test. Your responses are still here; please try again.');setPaused(true);setPhase('active')}
  finally{submitting.current=false}
 },[answers,items,mode,result,attemptId]);
 useEffect(()=>{if(expired&&phase==='active'&&!autoSubmitted.current){autoSubmitted.current=true;setPaused(true);void finish()}},[expired,phase,finish]);

 function move(next:number){setIndex(next);setTab('');setPanel(null);setMessage('');requestAnimationFrame(()=>stem.current?.focus())}
 function choose(value:Answer){if(question&&!review&&!checking&&phase==='active'&&!paused)setAnswers(current=>({...current,[question.id]:value}))}
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

 return <dialog ref={shell} className="exam-shell" data-theme={theme} style={{'--exam-font-size':fontSize+'px'} as CSSProperties} aria-label={mode==='study'?'Study test':'Timed practice exam'} onCancel={event=>{if(event.target===shell.current){event.preventDefault();if(phase==='active')setPanel('end')}}}>
  <header className="exam-topbar">
   <span>{mode==='study'?'Study test (Tutored, Untimed)':'Practice exam (Timed)'}</span><strong className="exam-brand">The Maternity Method</strong>
   <div className="exam-meta"><span className="exam-clock" aria-label={mode==='test'?'Time remaining':'Elapsed study time'}><Clock size={18}/>{formatExamTime(mode==='test'?remaining:elapsed)}</span><span>Question {items.length?index+1:0} of {items.length}</span></div>
  </header>
  <nav className="exam-toolbar" aria-label="Exam tools">
   <button type="button" onClick={()=>setPanel('calculator')} disabled={phase!=='active'}><Calculator size={18}/>Calculator</button>
   <button type="button" onClick={()=>setHighlights(current=>current.includes(question.id)?current.filter(id=>id!==question.id):[...current,question.id])} disabled={disabled||!question} aria-pressed={question?highlights.includes(question.id):false}><Highlighter size={18}/>Highlight</button>
   <button type="button" onClick={()=>setStrikeMode(value=>!value)} disabled={disabled||!question} aria-pressed={strikeMode}><Strikethrough size={18}/>Strike options</button>
   <span className="exam-toolbar-spacer"/>
   <button type="button" onClick={()=>setPanel('settings')}><Settings size={18}/>Settings</button>
   <button type="button" onClick={()=>setFlags(current=>current.includes(question.id)?current.filter(id=>id!==question.id):[...current,question.id])} disabled={disabled||!question} aria-pressed={question?flags.includes(question.id):false}><Bookmark size={18} fill={question&&flags.includes(question.id)?'currentColor':'none'}/>Mark for Review</button>
  </nav>
  <main className="exam-main">
   {phase==='loading'?<p role="status">Loading your test…</p>
    :phase==='error'?<section className="exam-centered"><h1>Test unavailable</h1><p role="alert">{message}</p><div className="exam-actions"><button type="button" onClick={()=>setRetry(value=>value+1)}>Try again</button><button type="button" onClick={exit}>Return to test builder</button></div></section>
    :phase==='submitting'?<section className="exam-centered" role="status"><h1>Saving your test…</h1><p>Please keep this page open.</p></section>
    :result?<section className="exam-centered"><p>Test submitted</p><h1>Your results</h1><strong className="exam-score">{result.possible?Math.round(result.earned/result.possible*100):0}%</strong><p>{result.earned} of {result.possible} available points</p><p>Your attempt is saved in Previous Tests and Performance.</p><div className="exam-actions"><button type="button" onClick={()=>router.push('/previous-tests')}>View previous tests</button>{result.attemptId&&<button type="button" onClick={()=>router.push('/previous-tests/'+result.attemptId)}>Review this exam</button>}<button type="button" onClick={exit}>Return to test builder</button></div></section>
    :paused?<section className="exam-centered"><h1>{expired?'Time is up':'Test paused'}</h1><p>{expired?'Submit your responses to save this attempt.':'Your questions are hidden and the timer is stopped.'}</p>{message&&<p role="alert">{message}</p>}<div className="exam-actions">{expired?<button type="button" onClick={()=>void finish()}>Retry submission</button>:<><button type="button" onClick={()=>{setPaused(false);setMessage('')}}>Resume test</button><button type="button" onClick={()=>setPanel('end')}>End test</button></>}</div></section>
    :question&&<div className={chartTabs.length?'exam-question-layout exam-with-chart':'exam-question-layout'}>
     {chartTabs.length>0&&<aside className="exam-chart" aria-label="Patient chart"><h2>Patient chart</h2><div className="exam-chart-tabs" role="tablist" aria-label="Clinical chart sections">{chartTabs.map((title,n)=><button type="button" role="tab" id={'exam-chart-tab-'+n} aria-selected={currentTab===title} aria-controls="exam-chart-panel" key={title} onClick={()=>setTab(title)}>{title}</button>)}</div><div id="exam-chart-panel" role="tabpanel" aria-labelledby={'exam-chart-tab-'+chartTabs.indexOf(currentTab)} className="exam-chart-content">{chart[currentTab]}</div></aside>}
     <article className="exam-question">
      {!reviewAvailable&&<p className="exam-question-kind">Detailed question snapshots are not enabled for this session.</p>}
      <p className="exam-question-kind">{question.category} · {question.ngn_format?({'bowtie':'Bowtie','highlight':'Highlight findings','cloze':'Drop-down cloze','drag-cloze':'Drag-and-drop cloze','drag-select':'Drag-and-drop selection'} as Record<string,string>)[question.ngn_format]:question.type==='sata'?'Select all that apply':question.type==='matrix'?'Matrix question':'Select the best answer'}</p>
      <>{question.clinical_scenario&&<p className="exam-clinical-scenario"><FormattedText text={question.clinical_scenario} format={question.content_format}/></p>}</><h1 ref={stem} tabIndex={-1} className={highlights.includes(question.id)?'exam-stem exam-highlight':'exam-stem'}><FormattedText text={question.stem} format={question.content_format}/></h1>
      <ExamImages images={question.images} label="Question image"/>
      {question.ngn_format?<NgnQuestion question={question} answer={answer} solution={review?.answer_key} disabled={Boolean(review)||checking} onChange={choose}/>:question.type==='matrix'?<QuestionMatrix question={question} answer={answer} solution={review?.answer_key} rowExplanations={review?.row_explanations} disabled={Boolean(review)||checking} onChange={choose}/>
       :<fieldset className="exam-options"><legend className="exam-sr-only">{question.type==='sata'?'Select all correct answers':'Select one answer'}</legend>{question.options.map((option,n)=>{
        const selected=question.type==='single'?answer===option.id:Array.isArray(answer)&&answer.includes(option.id);
        const correct=Boolean(review&&(Array.isArray(review.answer_key)?review.answer_key.includes(option.id):review.answer_key===option.id));
        const crossed=(strikes[question.id]??[]).includes(option.id);
        return <div className={'exam-option-row'+(review?(correct?' exam-option-correct':selected?' exam-option-incorrect':''):'')} key={option.id}>
         <label className="exam-option"><input type={question.type==='single'?'radio':'checkbox'} name={question.id} disabled={Boolean(review)||checking} checked={Boolean(selected)} onChange={()=>choose(question.type==='single'?option.id:selected?(answer as string[]).filter(id=>id!==option.id):[...(Array.isArray(answer)?answer:[]),option.id])}/><span className="exam-option-number">{n+1}.</span><span className={crossed?'exam-option-crossed':''}>{option.label}<ExamImages images={option.images} label="Answer choice image"/></span>{correct&&<Check size={18} aria-label="Correct option"/>}</label>
         {strikeMode&&!review&&<button type="button" className="exam-strike-button" aria-label={'Strike option '+(n+1)} aria-pressed={crossed} onClick={()=>setStrikes(current=>({...current,[question.id]:crossed?(current[question.id]??[]).filter(id=>id!==option.id):[...(current[question.id]??[]),option.id]}))}><Strikethrough size={17}/></button>}
        </div>;
       })}</fieldset>}
      {mode==='study'&&!review&&<button type="button" className="exam-submit-answer" disabled={checking||!isQuestionAnswered(question,answer)} onClick={()=>void check()}>{checking?'Checking…':'Submit answer'}</button>}
      {review&&<section className="exam-rationale" aria-label="Answer rationale"><h2>Answer rationale · {review.earned}/{review.possible} points</h2><p><FormattedText text={review.rationale} format={review.rationale_format}/></p>{question.type!=='matrix'&&<AnswerExplanations options={question.options} answerKey={review.answer_key} explanations={review.answer_explanations}/>}<ExamImages images={review.rationale_images} label="Rationale image"/><NursingTip text={review.nursing_tip}/><NursingTip text={review.test_taking_tip} title="NCLEX Test-taking Tip"/></section>}
      {message&&<p role="alert" className="exam-error">{message}</p>}
     </article>
    </div>}
  </main>
  <footer className="exam-footer">
   <div className="exam-footer-group"><button type="button" onClick={()=>phase==='active'?setPanel('end'):exit()} disabled={phase==='submitting'||checking}><LogOut size={19}/>End</button><button type="button" disabled={phase!=='active'||expired||checking} onClick={()=>setPaused(value=>!value)}>{paused?<Play size={19}/>:<Pause size={19}/>} {paused?'Resume':'Pause'}</button></div>
   <span className="exam-session-mark">The Maternity Method{sessionMark?' · '+sessionMark:''}</span>
   <div className="exam-footer-group"><button type="button" disabled={disabled||index===0} onClick={()=>move(index-1)}><ChevronLeft size={22}/>Previous</button><button type="button" disabled={disabled||!items.length} onClick={()=>setPanel('navigator')}><ListChecks size={19}/>Navigator</button><button type="button" disabled={disabled||!items.length} onClick={()=>index<items.length-1?move(index+1):setPanel('end')}>{index<items.length-1?'Next':'Finish'}<ChevronRight size={22}/></button></div>
  </footer>
  <dialog ref={popup} className={'exam-popup exam-popup-'+(panel??'closed')} aria-label={panel==='settings'?'Test settings':panel==='calculator'?'Calculator':panel==='navigator'?'Question navigator':'End test'} onCancel={event=>{event.preventDefault();event.stopPropagation();setPanel(null)}} onClose={()=>setPanel(null)}>
   <div className="exam-popup-heading"><h2>{panel==='settings'?'Settings':panel==='calculator'?'Calculator':panel==='navigator'?'Question navigator':'End test'}</h2><button type="button" aria-label="Close panel" onClick={()=>setPanel(null)}><X size={20}/></button></div>
   {panel==='settings'&&<div className="exam-settings"><fieldset><legend>Viewing mode</legend>{(['light','dark'] as const).map(value=><label key={value}><input type="radio" name="exam-theme" checked={theme===value} onChange={()=>setTheme(value)}/>{value==='light'?'Light view':'Dark view'}</label>)}</fieldset><label>Question text size<select value={fontSize} onChange={event=>setFontSize(Number(event.target.value))}><option value={16}>Standard</option><option value={18}>Large</option><option value={20}>Extra large</option></select></label></div>}
   {panel==='calculator'&&<div className="exam-calculator"><label className="exam-sr-only" htmlFor="exam-calculation">Calculation</label><input id="exam-calculation" value={calculation} inputMode="decimal" autoComplete="off" onChange={event=>{setCalculation(event.target.value);setCalculatorError('')}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();calculate()}}}/>{calculatorError&&<p role="alert">{calculatorError}</p>}<div className="exam-calculator-keys">{['C','⌫','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','(',')','0','.'].map(key=><button type="button" key={key} aria-label={key==='⌫'?'Backspace':key==='C'?'Clear calculation':key} onClick={()=>{setCalculatorError('');setCalculation(value=>key==='C'?'':key==='⌫'?value.slice(0,-1):value+key)}}>{key}</button>)}</div><button type="button" className="exam-calculate" onClick={calculate}>Calculate =</button></div>}
   {panel==='navigator'&&<><p className="exam-navigation-summary">{answered} answered · {items.length-answered} unanswered · {flags.length} marked for review</p><div className="exam-navigator-grid">{items.map((item,n)=>{const complete=isQuestionAnswered(item,answers[item.id]),marked=flags.includes(item.id);return <button type="button" key={item.id} className={(complete?'is-answered ':'')+(n===index?'is-current':'')} aria-label={'Question '+(n+1)+', '+(complete?'answered':'unanswered')+(marked?', marked for review':'')} aria-current={n===index?'step':undefined} onClick={()=>move(n)}>{n+1}{marked&&<Bookmark size={12} fill="currentColor"/>}</button>})}</div></>}
   {panel==='end'&&<><p>You have answered {answered} of {items.length} questions.</p>{answered<items.length&&<p>{items.length-answered} questions are unanswered or incomplete. You can return to them before submitting.</p>}<p>Submit to save your score and finish this session.</p><div className="exam-end-actions"><button type="button" onClick={()=>setPanel(null)}>Continue test</button><button type="button" onClick={()=>void finish()}>Submit and end test</button><button type="button" className="exam-discard" onClick={exit}>Exit without saving</button></div></>}
  </dialog>
 </dialog>;
}

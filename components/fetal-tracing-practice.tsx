'use client';

import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {Activity,ArrowRight,Check,ChevronLeft,ChevronRight,Pause,Play,RotateCcw} from 'lucide-react';
import {practiceCases,tracingAnswers,tracingFields,tracingSamples,type TracingField} from '@/lib/fetal-tracing';

import styles from './fetal-tracing-console.module.css';

const heartTicks=[60,90,120,150,180,210];
const activityTicks=[0,25,50,75,100];
const duration=600;
const playbackOptions=[20,40,60];
const windowSeconds=180;
const left=65;
const width=810;
const right=left+width;
const heartY=(rate:number)=>224-(rate-60)*1.2;
const activityY=(activity:number)=>348-activity*.9;
const displayTime=(seconds:number)=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds)%60).padStart(2,'0')}`;

function TracingChart({item,index,onMove,playbackSeconds,onSpeedChange}:{
 item:typeof practiceCases[number];
 index:number;
 onMove:(index:number)=>void;
 playbackSeconds:number;
 onSpeedChange:(seconds:number)=>void;
}){
 const speed=duration/playbackSeconds;
 const id=useId();
 const [position,setPosition]=useState(0);
 const [playing,setPlaying]=useState(false);
 const cursor=useRef(0);
 const chartWindow=useRef<HTMLDivElement>(null);
 const paths=useMemo(()=>{
  const samples=tracingSamples(item);
  const path=(y:(sample:typeof samples[number])=>number)=>samples.map((sample,i)=>
   `${i?'L':'M'}${sample.seconds} ${y(sample).toFixed(2)}`).join(' ');
  return [path(sample=>heartY(sample.heartRate)),path(sample=>activityY(sample.uterineActivity))];
 },[item]);

 useEffect(()=>{
  if(!playing)return;
  let previous:number|undefined;
  let frame:number;
  function advance(now:number){
   if(previous!==undefined)cursor.current=Math.min(duration,cursor.current+(now-previous)*speed/1000);
   previous=now;
   setPosition(cursor.current);
   if(cursor.current<duration)frame=requestAnimationFrame(advance);
   else setPlaying(false);
  }
  frame=requestAnimationFrame(advance);
  return ()=>cancelAnimationFrame(frame);
 },[playing,speed]);

 function togglePlayback(){
  if(playing){setPlaying(false);return;}
  if(cursor.current>=duration){
   cursor.current=0;
   setPosition(0);
  }
  if(chartWindow.current)chartWindow.current.scrollLeft=chartWindow.current.scrollWidth;
  setPlaying(true);
 }

 const scale=width/windowSeconds;
 const origin=position-windowSeconds;
 const x=(seconds:number)=>left+(seconds-origin)*scale;
 const ticks=Array.from({length:duration/30+1},(_,i)=>i*30)
  .filter(seconds=>seconds>=Math.max(0,origin)&&seconds<=position);
 const visibleWidth=Math.min(width,position*scale);
 const traceLeft=right-visibleWidth;

 return <div className={styles.console}>
  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 pt-4 pb-2 text-sm font-semibold text-white sm:px-7">
   <span className="inline-flex items-center gap-2"><Activity size={18} aria-hidden="true"/> Fetal monitor</span>
   <span>Strip {index+1} of {practiceCases.length} · {item.weeks} weeks</span>
  </div>
  <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_9.5rem] lg:p-6 lg:pt-3">
   <div ref={chartWindow} className={`${styles.screen} min-w-0 overflow-x-auto`} tabIndex={0} role="region" aria-label="Fetal tracing chart. Scroll horizontally on narrow screens.">
    <svg viewBox="0 0 900 388" className="block w-full min-w-[580px]" role="img"
     aria-label="Fetal heart rate on top and uterine activity below, aligned on the same time axis.">
     <defs>
      <pattern id={id+'-grid'} x={x(0) % (scale*5)} width={scale*5} height="12" patternUnits="userSpaceOnUse">
       <path d={`M ${scale*5} 0 H 0 V 12`} fill="none" stroke="#ead0cb" strokeWidth="1"/>
      </pattern>
      <clipPath id={id+'-trace'}><rect x={traceLeft} y="44" width={visibleWidth} height="304"/></clipPath>
     </defs>
     <g fill={`url(#${id}-grid)`}>
      <rect x={left} y="44" width={width} height="180"/>
      <rect x={left} y="258" width={width} height="90"/>
     </g>
     <g fill="#683b45" fontSize="15" fontWeight="600">
      <text x={left} y="28">Fetal heart rate (bpm)</text>
      <text x={left} y="249">Uterine activity (relative units)</text>
      {heartTicks.map(rate=><text key={rate} x="56" y={heartY(rate)+5} textAnchor="end">{rate}</text>)}
      {activityTicks.map(value=><text key={value} x="56" y={activityY(value)+5} textAnchor="end">{value}</text>)}
     </g>
     <g stroke="#cb988f" strokeWidth="1">
      {heartTicks.map(rate=><line key={rate} x1={left} x2={right} y1={heartY(rate)} y2={heartY(rate)}/>)}
      {activityTicks.map(value=><line key={value} x1={left} x2={right} y1={activityY(value)} y2={activityY(value)}/>)}
      {ticks.map(seconds=><path key={seconds} d={`M ${x(seconds)} 44 V 224 M ${x(seconds)} 258 V 348`}/>)}
     </g>
     <g fill="#683b45" fontSize="14" textAnchor="middle">
      {ticks.map(seconds=><text key={seconds} x={x(seconds)} y="370">{displayTime(seconds)}</text>)}
     </g>
     <g clipPath={`url(#${id}-trace)`}>
      <g transform={`translate(${x(0)} 0) scale(${scale} 1)`} fill="none" strokeWidth="2" strokeLinejoin="round">
       <path stroke="#46272c" d={paths[0]} vectorEffect="non-scaling-stroke"/>
       <path stroke="#743c4a" d={paths[1]} vectorEffect="non-scaling-stroke"/>
      </g>
     </g>
    </svg>
   </div>
   <div className={`${styles.controls} flex flex-wrap items-center justify-center gap-3 text-sm lg:flex-col`}>
    <button type="button" className={`${styles.primary} inline-flex size-[4.5rem] shrink-0 flex-col items-center justify-center gap-1 rounded-full text-xs font-bold`}
     onClick={togglePlayback}>
     {playing?<Pause size={19} aria-hidden="true"/>:<Play size={19} aria-hidden="true"/>}
     {playing?'Pause':'Start'}
    </button>
    <div role="group" aria-label="Browse strips" className="flex gap-1">
     <button type="button" aria-label="Previous strip" title="Previous strip" disabled={index===0}
      className={`${styles.secondary} grid size-11 place-items-center rounded-l-xl rounded-r-sm`}
      onClick={()=>onMove(index-1)}>
      <ChevronLeft size={23} aria-hidden="true"/>
     </button>
     <button type="button" aria-label="Skip to next strip" title="Next strip" disabled={index===practiceCases.length-1}
      className={`${styles.secondary} grid size-11 place-items-center rounded-l-sm rounded-r-xl`}
      onClick={()=>onMove(index+1)}>
      <ChevronRight size={23} aria-hidden="true"/>
     </button>
    </div>
    <label className="flex items-center gap-2 text-xs font-semibold">
     Speed
     <select className="min-h-9 rounded-md bg-[#fff9f2] px-2 text-espresso" value={playbackSeconds}
      onChange={event=>onSpeedChange(Number(event.target.value))}>
      {playbackOptions.map(seconds=><option key={seconds} value={seconds}>{seconds}s run</option>)}
     </select>
    </label>
    <p className="whitespace-nowrap text-xs tabular-nums">{displayTime(position)} / {displayTime(duration)}</p>
   </div>
  </div>
 </div>;
}

export function FetalTracingPractice(){
 const [index,setIndex]=useState(0);
 const [playbackSeconds,setPlaybackSeconds]=useState(playbackOptions[0]);
 const [selected,setSelected]=useState<Partial<Record<TracingField,string>>>({});
 const [revealed,setRevealed]=useState(false);
 const [finished,setFinished]=useState(false);
 const heading=useRef<HTMLHeadingElement>(null);
 const feedback=useRef<HTMLHeadingElement>(null);
 const item=practiceCases[index];
 const answers=tracingAnswers(item);

 function move(next:number){
  setSelected({});
  setRevealed(false);
  setFinished(next===practiceCases.length);
  setIndex(next===practiceCases.length?index:next);
  requestAnimationFrame(()=>heading.current?.focus());
 }

 return <section aria-labelledby="tracing-practice-title" className="space-y-5">
  <h2 id="tracing-practice-title" tabIndex={-1} ref={heading} className="text-2xl">
   {finished?'Practice complete':'Interpret the strip'}
  </h2>
  {finished?<div className="surface p-6">
   <p>You’ve reached the end of this practice set.</p>
   <button type="button" className="btn-primary mt-4 inline-flex items-center gap-2" onClick={()=>move(0)}>
    <RotateCcw size={17} aria-hidden="true"/> Practice again
   </button>
  </div>:<>
   <TracingChart key={index} item={item} index={index} onMove={move} playbackSeconds={playbackSeconds} onSpeedChange={setPlaybackSeconds}/>
   {item.context&&<p className="surface p-4">{item.context}</p>}
   <form className="space-y-5" onSubmit={event=>{
    event.preventDefault();
    setRevealed(true);
    requestAnimationFrame(()=>feedback.current?.focus());
   }}>
    <div className="grid gap-x-3 gap-y-4 rounded-xl border border-rose/60 bg-[#f8eee5] px-3 py-4 min-[460px]:grid-cols-2 md:grid-cols-3 2xl:grid-cols-6">
     {tracingFields.map(({key,label,options})=><fieldset className="min-w-0 px-1" key={key}>
      <legend className="mb-2 text-sm font-bold text-mauve">{label}</legend>
      <div className="grid gap-1.5">
       {options.map(option=><label key={option} className="relative">
        <input className="peer sr-only" name={key} type="radio" value={option} required disabled={revealed}
         checked={selected[key]===option} onChange={()=>setSelected(previous=>({...previous,[key]:option}))}/>
        <span className={`flex min-h-10 items-center gap-1 rounded-md border border-rose/65 px-2 py-1.5 text-sm peer-focus-visible:ring-2 peer-focus-visible:ring-mauve peer-focus-visible:ring-offset-2 ${revealed&&answers[key]===option?'bg-[#e2eee3] font-semibold text-[#234b31]':selected[key]===option?'bg-mauve text-white':revealed?'bg-[#fff9f2]':'cursor-pointer bg-[#fff9f2] hover:bg-blush'}`}>
         {revealed&&answers[key]===option&&<><Check size={15} aria-hidden="true"/><span className="sr-only">Correct answer</span></>}{option}
        </span>
       </label>)}
      </div>
      {revealed&&<p className="mt-2 text-sm">{selected[key]===answers[key]?'Correct':`You chose ${selected[key]}`}</p>}
     </fieldset>)}
    </div>
    {revealed?<div className="surface border-rose p-5">
     <h3 tabIndex={-1} ref={feedback} className="text-xl">How to read this strip</h3>
     <p className="mt-2">{item.rationale}</p>
     <button type="button" className="btn-primary mt-4 inline-flex items-center gap-2" onClick={()=>move(index+1)}>
      {index===practiceCases.length-1?'Finish practice':'Next strip'} <ArrowRight size={17} aria-hidden="true"/>
     </button>
    </div>:<div className="flex flex-wrap items-center gap-3">
     <button type="submit" className="btn-primary" disabled={tracingFields.some(({key})=>!selected[key])}>Check interpretation</button>
     <span className="text-sm text-espresso/75">Choose one answer in each group.</span>
    </div>}
   </form>
  </>}
 </section>;
}

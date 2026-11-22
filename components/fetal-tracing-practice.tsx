'use client';

import {useRef,useState} from 'react';
import {Activity,ArrowRight,Check,RotateCcw} from 'lucide-react';
import {practiceCases,tracingAnswers,tracingFields,tracingSamples,type TracingField} from '@/lib/fetal-tracing';

const heartTicks=[60,90,120,150,180,210];
const activityTicks=[0,25,50,75,100];
const x=(seconds:number)=>65+seconds*1.35;
const heartY=(rate:number)=>224-(rate-60)*1.2;
const activityY=(activity:number)=>348-activity*.9;

function TracingChart({item,index}:{item:typeof practiceCases[number];index:number}){
 const samples=tracingSamples(item);
 const path=(value:(sample:typeof samples[number])=>number)=>samples.map((sample,i)=>
  `${i?'L':'M'}${x(sample.seconds).toFixed(2)} ${value(sample).toFixed(2)}`).join(' ');
 return <div className="rounded-3xl border-2 border-[#64343d] bg-mauve p-3 shadow-sm sm:p-5">
  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1 text-sm font-semibold text-white">
   <span className="inline-flex items-center gap-2"><Activity size={18} aria-hidden="true"/> Fetal monitor</span>
   <span>Strip {index+1} of {practiceCases.length} · {item.weeks} weeks</span>
  </div>
  <div className="overflow-x-auto rounded-xl bg-[#fff9f2]" tabIndex={0} role="region" aria-label="Fetal tracing chart. Scroll horizontally on narrow screens.">
   <svg viewBox="0 0 900 388" className="block w-full min-w-[640px]" role="img"
    aria-label="Ten-minute strip with fetal heart rate on top and uterine activity aligned below.">
    <defs>
     <pattern id="tracing-grid" width="13.5" height="12" patternUnits="userSpaceOnUse">
      <path d="M 13.5 0 H 0 V 12" fill="none" stroke="#ead0cb" strokeWidth="1"/>
     </pattern>
    </defs>
    <g fill="url(#tracing-grid)">
     <rect x="65" y="44" width="810" height="180"/>
     <rect x="65" y="258" width="810" height="90"/>
    </g>
    <g fill="#683b45" fontSize="14" fontWeight="600">
     <text x="65" y="28">Fetal heart rate (bpm)</text>
     <text x="65" y="249">Uterine activity (relative units)</text>
     {heartTicks.map(rate=><text key={rate} x="56" y={heartY(rate)+5} textAnchor="end">{rate}</text>)}
     {activityTicks.map(value=><text key={value} x="56" y={activityY(value)+5} textAnchor="end">{value}</text>)}
    </g>
    <g stroke="#cb988f" strokeWidth="1">
     {heartTicks.map(rate=><line key={rate} x1="65" x2="875" y1={heartY(rate)} y2={heartY(rate)}/>)}
     {activityTicks.map(value=><line key={value} x1="65" x2="875" y1={activityY(value)} y2={activityY(value)}/>)}
     {Array.from({length:11},(_,minute)=><path key={minute} d={`M ${x(minute*60)} 44 V 224 M ${x(minute*60)} 258 V 348`}/>)}
    </g>
    <g fill="#683b45" fontSize="13" textAnchor="middle">
     {Array.from({length:11},(_,minute)=><text key={minute} x={x(minute*60)} y="370">{minute} min</text>)}
    </g>
    <g fill="none" strokeWidth="2" strokeLinejoin="round">
     <path stroke="#46272c" d={path(sample=>heartY(sample.heartRate))}/>
     <path stroke="#743c4a" d={path(sample=>activityY(sample.uterineActivity))}/>
    </g>
   </svg>
  </div>
  <p className="mt-2 px-1 text-xs text-white sm:hidden">Swipe across the chart to see the full strip.</p>
 </div>;
}

export function FetalTracingPractice(){
 const [index,setIndex]=useState(0);
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
   <p>You’ve reviewed all {practiceCases.length} practice strips.</p>
   <button type="button" className="btn-primary mt-4 inline-flex items-center gap-2" onClick={()=>move(0)}>
    <RotateCcw size={17} aria-hidden="true"/> Practice again
   </button>
  </div>:<>
   <TracingChart item={item} index={index}/>
   {item.context&&<p className="surface p-4">{item.context}</p>}
   <form className="space-y-5" onSubmit={event=>{
    event.preventDefault();
    setRevealed(true);
    requestAnimationFrame(()=>feedback.current?.focus());
   }}>
    <div className="grid gap-4 min-[460px]:grid-cols-2 xl:grid-cols-3">
     {tracingFields.map(({key,label,options})=><fieldset className="surface min-w-0 px-4 pb-4 pt-2" key={key}>
      <legend className="px-2 text-sm font-bold text-mauve">{label}</legend>
      <div className="flex flex-wrap gap-2">
       {options.map(option=><label key={option} className="relative">
        <input className="peer sr-only" name={key} type="radio" value={option} required disabled={revealed}
         checked={selected[key]===option} onChange={()=>setSelected(previous=>({...previous,[key]:option}))}/>
        <span className={`inline-flex min-h-10 items-center gap-1 rounded-lg border border-rose px-3 py-2 text-sm peer-focus-visible:ring-2 peer-focus-visible:ring-mauve peer-focus-visible:ring-offset-2 ${revealed&&answers[key]===option?'bg-[#e2eee3] font-semibold text-[#234b31]':selected[key]===option?'bg-mauve text-white':revealed?'':'cursor-pointer hover:bg-blush'}`}>
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

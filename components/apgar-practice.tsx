'use client';

import {ApgarWarmer} from './apgar-warmer';
import {useRef,useState} from 'react';
import {ArrowRight,ChevronLeft,ChevronRight,RotateCcw} from 'lucide-react';
import {apgarCases,apgarComponents,apgarPoints} from '@/lib/apgar-practice';

const minutes=[1,5] as const;
const total=(points:readonly number[])=>points.reduce((sum,point)=>sum+point,0);

export function ApgarPractice(){
 const [index,setIndex]=useState(0);
 const [assessment,setAssessment]=useState<0|1>(0);
 const [choices,setChoices]=useState<Partial<Record<number,number>>>({});
 const [checked,setChecked]=useState(false);
 const [stimulus,setStimulus]=useState(0);
 const heading=useRef<HTMLHeadingElement>(null);
 const result=useRef<HTMLHeadingElement>(null);
 const item=apgarCases[index];
 const expected=item?.observations[assessment];

 function move(nextIndex:number,nextAssessment:0|1){
  setIndex(nextIndex);
  setAssessment(nextAssessment);
  setChoices({});
  setChecked(false);
  setStimulus(0);
  requestAnimationFrame(()=>heading.current?.focus());
 }

 if(!item||!expected)return <section className="surface space-y-4 p-6">
  <h2 ref={heading} tabIndex={-1} className="text-2xl">Practice complete</h2>
  <p>You’ve reached the end of this practice set.</p>
  <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={()=>move(0,0)}>
   <RotateCcw size={17} aria-hidden="true"/> Practice again
  </button>
 </section>;

 const time=minutes[assessment];
 const respirationRate=item.respirationRates[assessment];
 const labored=assessment===0&&item.laboredFirstMinute===true;
 return <section aria-labelledby="apgar-case-title" className="space-y-5">
  <div className="overflow-hidden rounded-3xl border-2 border-rose bg-[#fff9f2] shadow-sm">
   <div className="grid items-stretch lg:grid-cols-2">
    <ApgarWarmer key={`${index}-${assessment}`} labored={labored} findings={expected} heartRate={item.heartRates[assessment]} respirationRate={respirationRate} stimulus={stimulus}
     onStimulate={()=>setStimulus(current=>current+1)}/>
    <div className="space-y-3 p-5 sm:p-7">
     <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs font-bold uppercase tracking-widest text-mauve">Case {index+1} of {apgarCases.length}</p>
      <div role="group" aria-label="Browse newborn cases" className="flex gap-2">
       <button type="button" aria-label="Previous case" title="Previous case" disabled={index===0}
        className="grid size-11 place-items-center rounded-full border border-rose text-mauve enabled:hover:bg-blush"
        onClick={()=>move(index-1,0)}>
        <ChevronLeft size={23} aria-hidden="true"/>
       </button>
       <button type="button" aria-label="Skip to next case" title="Next case" disabled={index===apgarCases.length-1}
        className="grid size-11 place-items-center rounded-full border border-rose text-mauve enabled:hover:bg-blush"
        onClick={()=>move(index+1,0)}>
        <ChevronRight size={23} aria-hidden="true"/>
       </button>
      </div>
     </div>
     <h2 id="apgar-case-title" ref={heading} tabIndex={-1} className="text-2xl">{item.title}</h2>
     <p>{item.description}</p>
     <p className="pill inline-block">{time}-minute assessment</p>
     <p className="text-sm">Select 0, 1, or 2 points for each finding. Use the stimulation button to observe the newborn’s reflex response.</p>
    </div>
   </div>
  </div>

  <form className="space-y-4" onSubmit={event=>{
   event.preventDefault();
   setChecked(true);
   requestAnimationFrame(()=>result.current?.focus());
  }}>
   <section className="surface overflow-hidden border-rose" aria-labelledby="apgar-scoring-title">
    <div className="px-4 py-4 sm:px-5">
     <h3 id="apgar-scoring-title" className="text-xl">Apgar scoring</h3>
     <p className="mt-1 text-sm">Choose the criterion that best matches the newborn’s finding in each row.</p>
    </div>
    <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1.15fr)_repeat(3,minmax(0,1fr))] gap-3 bg-mauve px-5 py-3 text-sm font-semibold text-white lg:grid">
     <span>Component &amp; finding</span>
     {apgarPoints.map(points=><span key={points}>{points} {points===1?'point':'points'}</span>)}
    </div>
    {apgarComponents.map(({label,criteria},component)=>{
     const correct=expected[component];
     const selected=choices[component];
     const finding=label==='Grimace'&&!stimulus&&!checked?'Check the response in the warmer'
      :label==='Pulse'?`Heart rate: ${item.heartRates[assessment]} bpm`:criteria[correct];

     return <fieldset key={label} className="min-w-0 border-t border-rose/45 px-4 py-3 sm:px-5" disabled={checked}>
      <legend className="sr-only">{label}</legend>
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1.15fr)_repeat(3,minmax(0,1fr))] lg:gap-3">
       <div className="py-1">
        <p aria-hidden="true" className="font-bold text-mauve">{label}</p>
        <p className="mt-1 text-sm" aria-live={label==='Grimace'?'polite':undefined}>
         {finding}.{label==='Respiration'&&` Respiratory rate: ${respirationRate} breaths/min.`}
         {label==='Respiration'&&labored&&' The newborn has grunting on exhalation and inward pulling beneath the ribs with breaths.'}
        </p>
       </div>
       {apgarPoints.map(points=><label key={points} className="relative min-w-0">
        <input className="peer sr-only" type="radio" name={label} value={points} required checked={selected===points}
         onChange={()=>setChoices(current=>({...current,[component]:points}))}/>
        <span className={`flex h-full min-h-11 flex-wrap content-center items-baseline gap-x-2 gap-y-1 rounded-lg border border-rose/70 px-3 py-2 text-sm peer-focus-visible:ring-2 peer-focus-visible:ring-mauve peer-focus-visible:ring-offset-2 ${checked&&correct===points?'bg-[#e2eee3] font-semibold text-[#234b31]':selected===points?'bg-mauve font-semibold text-white':checked?'bg-[#fff9f2]':'cursor-pointer bg-[#fff9f2] hover:bg-blush'}`}>
         <strong className="lg:sr-only">{points} {points===1?'point':'points'}</strong>
         <span>{criteria[points]}</span>
         {checked&&correct===points&&<span className="w-full text-xs font-bold">Correct match</span>}
        </span>
       </label>)}
       {checked&&<p className="text-sm lg:col-span-4">
        <strong>{correct} {correct===1?'point':'points'}</strong> for {label.toLowerCase()} because the finding matches “{criteria[correct].toLowerCase()}.”
        {selected!==correct&&` You chose ${selected}.`}
       </p>}
      </div>
     </fieldset>;
    })}
   </section>
   {checked?<div className="surface space-y-3 border-rose p-5">
    <h3 ref={result} tabIndex={-1} className="text-xl">{time}-minute Apgar: {total(expected)} out of 10</h3>
    <p>Your total: {total(apgarComponents.map((_,component)=>choices[component]??0))} out of 10. The Apgar score is the sum of all five component scores.</p>
    <button className="btn-primary inline-flex items-center gap-2" type="button"
     onClick={()=>assessment===0?move(index,1):move(index+1,0)}>
     {assessment===0?'Go to 5-minute assessment':index===apgarCases.length-1?'Finish practice':'Next newborn'} <ArrowRight size={17} aria-hidden="true"/>
    </button>
   </div>:<button className="btn-primary" type="submit" disabled={Object.keys(choices).length<apgarComponents.length}>Check Apgar score</button>}
  </form>
 </section>;
}

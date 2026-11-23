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
   <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-5">
    {apgarComponents.map(({label,criteria},component)=><fieldset key={label} className="surface min-w-0 px-4 pb-4 pt-2" disabled={checked}>
     <legend className="px-2 font-bold text-mauve">{label}</legend>
     <p className="mb-3 min-h-10 text-sm" aria-live={label==='Grimace'?'polite':undefined}>{label==='Grimace'&&!stimulus&&!checked?'Check the response in the warmer':label==='Pulse'?`Heart rate: ${item.heartRates[assessment]} bpm`:criteria[expected[component]]}.{label==='Respiration'&&` Respiratory rate: ${respirationRate} breaths/min.`}{label==='Respiration'&&labored&&' The newborn has grunting on exhalation and inward pulling beneath the ribs with breaths.'}</p>
     <div className="flex flex-wrap gap-2">
      {apgarPoints.map(points=><label key={points} className="relative">
       <input className="peer sr-only" type="radio" name={label} value={points} required checked={choices[component]===points}
        onChange={()=>setChoices(current=>({...current,[component]:points}))}/>
       <span className={`grid size-11 place-items-center rounded-lg border border-rose font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-mauve ${checked&&expected[component]===points?'bg-[#e2eee3] text-[#234b31]':choices[component]===points?'bg-mauve text-white':checked?'':'cursor-pointer hover:bg-blush'}`}>{points}</span>
      </label>)}
     </div>
     {checked&&<p className="mt-3 text-sm">Correct score: {expected[component]}{choices[component]===expected[component]?'':` · You chose ${choices[component]}`}{label==='Pulse'&&<span className="mt-1 block">{criteria[expected[component]]}</span>}</p>}
    </fieldset>)}
   </div>
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

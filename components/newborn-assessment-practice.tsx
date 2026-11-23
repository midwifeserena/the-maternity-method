'use client';

import Image from 'next/image';
import {useRef,useState} from 'react';
import {ArrowRight,Check,ChevronLeft,ChevronRight,ScanLine} from 'lucide-react';
import {findingExplanations,newbornCases,newbornStations} from '@/lib/newborn-assessment';
import {NewbornAssessmentDetail} from './newborn-assessment-detail';

const positions=[['45%','27%'],['51%','89%'],['28%','58%'],['49%','49%']];
type Answer={choice:number;checked:boolean};

export function NewbornAssessmentPractice(){
 const [caseIndex,setCaseIndex]=useState(0);
 const [stationIndex,setStationIndex]=useState(0);
 const [responses,setResponses]=useState<Record<string,Answer>>({});
 const detail=useRef<HTMLHeadingElement>(null);
 const feedback=useRef<HTMLHeadingElement>(null);
 const item=newbornCases[caseIndex];
 const station=newbornStations[stationIndex];
 const finding=item.findings[stationIndex];
 const key=caseIndex+'-'+station.id;
 const answer=responses[key];

 function inspect(index:number){
  setStationIndex(index);
  requestAnimationFrame(()=>detail.current?.focus());
 }
 function changeCase(index:number){
  setCaseIndex(index);
  inspect(0);
 }
 function check(){
  if(!answer||answer.checked)return;
  setResponses(previous=>({...previous,[key]:{...answer,checked:true}}));
  requestAnimationFrame(()=>feedback.current?.focus());
 }

 return <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
  <section aria-labelledby="newborn-overview" className="surface overflow-hidden">
   <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
    <div>
     <p className="text-xs font-bold uppercase tracking-widest text-mauve">Case {caseIndex+1} of {newbornCases.length}</p>
     <h2 id="newborn-overview" className="mt-1 text-xl">{item.title}</h2>
    </div>
    <div className="flex gap-2" role="group" aria-label="Browse newborn cases">
     <button type="button" aria-label="Previous case" disabled={caseIndex===0}
      className="grid size-11 place-items-center rounded-full border border-rose text-mauve enabled:hover:bg-blush"
      onClick={()=>changeCase(caseIndex-1)}><ChevronLeft aria-hidden="true" size={22}/></button>
     <button type="button" aria-label="Next case" disabled={caseIndex===newbornCases.length-1}
      className="grid size-11 place-items-center rounded-full border border-rose text-mauve enabled:hover:bg-blush"
      onClick={()=>changeCase(caseIndex+1)}><ChevronRight aria-hidden="true" size={22}/></button>
    </div>
   </div>
   <div className="relative aspect-[3/2] bg-blush">
    <Image src="/apgar-newborn-simulation.webp" alt="Overhead view of a simulated newborn in a warmer" fill
     className="object-contain" sizes="(min-width: 1024px) 45vw, 100vw"/>
    {newbornStations.map(({id,label},index)=><button key={id} type="button" style={{left:positions[index][0],top:positions[index][1]}}
     className={`absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-[#fff9f2] font-bold shadow-md ${index===stationIndex?'bg-mauve text-white':'bg-[#fff9f2] text-mauve hover:bg-blush'}`}
     aria-label={`Inspect ${label}`} aria-pressed={index===stationIndex} onClick={()=>inspect(index)}>
     {index+1}
    </button>)}
   </div>
   <div className="grid gap-2 p-3 min-[410px]:grid-cols-2" role="group" aria-label="Assessment areas">
    {newbornStations.map(({id,label},index)=><button key={id} type="button"
     className={`flex min-h-11 items-center gap-2 rounded-lg border border-rose px-3 py-2 text-left text-sm font-semibold ${index===stationIndex?'bg-mauve text-white':'text-mauve hover:bg-blush'}`}
     aria-pressed={index===stationIndex} onClick={()=>inspect(index)}>
     {responses[caseIndex+'-'+id]?.checked?<Check size={16} aria-hidden="true"/>:<span>{index+1}.</span>} {label}
    </button>)}
   </div>
  </section>
  <section className="surface space-y-4 p-5" aria-labelledby="newborn-detail">
   <h2 className="flex items-center gap-2 text-xl" id="newborn-detail" ref={detail} tabIndex={-1}>
    <ScanLine className="shrink-0 text-mauve" size={21} aria-hidden="true"/> {station.view}
   </h2>
   <NewbornAssessmentDetail station={station.id} finding={finding} label={station.view}/>
   <fieldset disabled={answer?.checked} className="min-w-0">
    <legend className="mb-2 font-bold">{station.question}</legend>
    <div className="grid gap-2">
     {station.options.map((option,index)=><label key={option} className="relative block">
      <input type="radio" className="peer sr-only" name="assessment-finding" checked={answer?.choice===index}
       onChange={()=>setResponses(previous=>({...previous,[key]:{choice:index,checked:false}}))}/>
      <span className={`block rounded-lg border border-rose px-3 py-2 text-sm peer-focus-visible:ring-2 peer-focus-visible:ring-mauve ${answer?.checked&&finding===index?'bg-[#e3eee4] font-semibold text-[#274a35]':answer?.choice===index?'bg-mauve text-white':answer?.checked?'':'cursor-pointer hover:bg-blush'}`}>
       {option}{answer?.checked&&finding===index&&<span className="sr-only">, correct answer</span>}
      </span>
     </label>)}
    </div>
   </fieldset>
   {answer?.checked?<div className="rounded-xl bg-blush/55 p-4">
    <h3 ref={feedback} tabIndex={-1} className="text-lg">{answer.choice===finding?'Correct finding':'Review the finding'}</h3>
    <p className="mt-2 text-sm">{findingExplanations[stationIndex][finding]}</p>
    {stationIndex<newbornStations.length-1&&<button className="btn-outline mt-3 inline-flex items-center gap-2" type="button" onClick={()=>inspect(stationIndex+1)}>
     Next exam area <ArrowRight size={16} aria-hidden="true"/>
    </button>}
   </div>:<button type="button" className="btn-primary" disabled={!answer} onClick={check}>Check finding</button>}
  </section>
 </div>;
}

'use client';

import Image from 'next/image';
import {useRef,useState} from 'react';
import {ArrowRight,Check,ChevronLeft,ChevronRight,ScanLine,ZoomOut} from 'lucide-react';
import {findingExplanations,newbornCases,newbornStations} from '@/lib/newborn-assessment';
import {NewbornAssessmentDetail} from './newborn-assessment-detail';

const positions=[['45%','27%'],['55%','92%'],['28%','57%'],['49%','49%']];
const examActions=['View the upper back','Lift the foot','Open the hand','View the cord cross-section'];
type Answer={choice:number;checked:boolean};

export function NewbornAssessmentPractice(){
 const [caseIndex,setCaseIndex]=useState(0);
 const [stationIndex,setStationIndex]=useState<number|null>(null);
 const [opened,setOpened]=useState(false);
 const [responses,setResponses]=useState<Record<string,Answer>>({});
 const detail=useRef<HTMLHeadingElement>(null);
 const firstStation=useRef<HTMLButtonElement>(null);
 const feedback=useRef<HTMLHeadingElement>(null);
 const item=newbornCases[caseIndex];
 const selectedIndex=stationIndex??0;
 const station=newbornStations[selectedIndex];
 const finding=item.findings[selectedIndex];
 const key=caseIndex+'-'+station.id;
 const answer=responses[key];

 function inspect(index:number,focusDetail=false){
  setStationIndex(index);
  setOpened(false);
  if(focusDetail)requestAnimationFrame(()=>detail.current?.focus());
 }
 function overview(){
  setStationIndex(null);
  setOpened(false);
  requestAnimationFrame(()=>firstStation.current?.focus({preventScroll:true}));
 }
 function changeCase(index:number){
  setCaseIndex(index);
  setStationIndex(null);
  setOpened(false);
 }
 function check(){
  if(!answer||answer.checked)return;
  setResponses(previous=>({...previous,[key]:{...answer,checked:true}}));
  requestAnimationFrame(()=>feedback.current?.focus());
 }

 return <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(270px,1fr)]">
  <section aria-labelledby="newborn-overview" className="surface overflow-hidden border-2 border-rose shadow-sm">
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
   <div className="relative isolate aspect-[3/2] overflow-hidden bg-blush">
    <div className="absolute inset-0 transition-transform duration-500 motion-reduce:transition-none"
     style={stationIndex===null?undefined:{transform:'scale(1.65)',transformOrigin:positions[stationIndex].join(' ')}}>
     <Image src="/apgar-newborn-simulation.webp" alt="Overhead view of a simulated newborn in a warmer" fill
      className="object-contain" sizes="(min-width: 1280px) 60vw, 100vw"/>
    </div>
    {newbornStations.map(({id,label},index)=>stationIndex!==null&&index!==stationIndex?null:<button key={id} type="button" ref={index===0?firstStation:undefined}
     style={{left:positions[index][0],top:index===1?'min(92%, calc(100% - 24px))':positions[index][1]}}
     className={`absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-[#fff9f2] font-bold shadow-md ${index===stationIndex?'bg-mauve text-white':'bg-[#fff9f2] text-mauve hover:bg-blush'}`}
     aria-label={`Inspect ${label}`} aria-pressed={index===stationIndex} onClick={()=>inspect(index,true)}>
     {index+1}
    </button>)}
    {stationIndex!==null&&<button type="button" onClick={overview}
     className="absolute left-2 top-2 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#fff9f2] px-3 text-xs font-bold text-mauve shadow hover:bg-blush">
     <ZoomOut size={17} aria-hidden="true"/> Whole baby
    </button>}
   </div>
   <div className="grid gap-2 bg-[#f9eee7] p-3 min-[410px]:grid-cols-2" role="group" aria-label="Assessment areas">
    {newbornStations.map(({id,label},index)=><button key={id} type="button"
     className={`flex min-h-11 items-center gap-2 rounded-lg border border-rose px-3 py-2 text-left text-sm font-semibold ${index===stationIndex?'bg-mauve text-white':'text-mauve hover:bg-blush'}`}
     aria-pressed={index===stationIndex} onClick={()=>inspect(index,true)}>
     {responses[caseIndex+'-'+id]?.checked?<Check size={16} aria-hidden="true"/>:<span>{index+1}.</span>} {label}
    </button>)}
   </div>
  </section>
  {stationIndex===null?<section className="surface space-y-2 p-5" aria-labelledby="newborn-start">
   <h2 className="flex items-center gap-2 text-xl" id="newborn-start">
    <ScanLine className="shrink-0 text-mauve" size={21} aria-hidden="true"/> Examine the newborn
   </h2>
   <p>Select a point on the baby or choose an exam area below the warmer.</p>
  </section>:<section className="surface space-y-4 p-5" aria-labelledby="newborn-detail">
   <h2 className="flex items-center gap-2 text-xl" id="newborn-detail" ref={detail} tabIndex={-1}>
    <ScanLine className="shrink-0 text-mauve" size={21} aria-hidden="true"/> {station.view}
   </h2>
   {!opened&&!answer?<button className="btn-primary" type="button" onClick={()=>{
    setOpened(true);
    requestAnimationFrame(()=>detail.current?.focus({preventScroll:true}));
   }}>{examActions[stationIndex]}</button>:<>
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
    {stationIndex<newbornStations.length-1&&<button className="btn-outline mt-3 inline-flex items-center gap-2" type="button" onClick={()=>inspect(stationIndex+1,true)}>
     Next exam area <ArrowRight size={16} aria-hidden="true"/>
    </button>}
   </div>:<button type="button" className="btn-primary" disabled={!answer} onClick={check}>Check finding</button>}
   </>}
  </section>}
 </div>;
}

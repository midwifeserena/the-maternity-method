import {useEffect,useRef,useState} from 'react';
import {HeartPulse,Hand,Volume2} from 'lucide-react';
import styles from './apgar-warmer.module.css';
import {ApgarNewbornMotion} from './apgar-newborn-motion';

type Points=0|1|2;
type WarmerProps={
 findings:readonly [Points,Points,Points,Points,Points];
 heartRate:number;
 labored:boolean;
 stimulus:number;
 onStimulate:()=>void;
};

export function ApgarWarmer({findings,heartRate,labored,stimulus,onStimulate}:WarmerProps){
 const [paused,setPaused]=useState(false);
 const [soundError,setSoundError]=useState(false);
 const sound=useRef<HTMLAudioElement>(null);
 useEffect(()=>{
  const audio=sound.current;
  return ()=>audio?.pause();
 },[]);

 async function playSound(){
  const audio=sound.current;
  if(!audio)return;
  setSoundError(false);
  try{
   audio.currentTime=0;
   await audio.play();
  }catch{
   setSoundError(true);
  }
 }
 const [appearance,,response,tone,breathing]=findings;

 return <div className={styles.station} data-paused={paused}>
  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs font-semibold text-white">
   <span>Radiant warmer</span>
   <span className="inline-flex items-center gap-2 rounded-md bg-[#412632] px-2.5 py-1.5">
    <HeartPulse size={17} aria-hidden="true"/> Heart rate {heartRate} bpm
   </span>
  </div>
  <ApgarNewbornMotion appearance={appearance} breathing={breathing} tone={tone}
   response={response} stimulus={stimulus} paused={paused} labored={labored}/>
  <div className="flex flex-wrap items-center gap-3 px-4 py-4">
   <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#fff9f2] px-4 font-semibold text-mauve hover:bg-blush" onClick={onStimulate}>
    <Hand size={17} aria-hidden="true"/> Check response to stimulation
   </button>
   <button type="button" className="min-h-11 px-2 text-sm font-semibold text-white underline underline-offset-4" onClick={()=>setPaused(value=>!value)}>
    {paused?'Resume motion':'Pause motion'}
   </button>
   {labored&&<>
    <audio ref={sound} preload="none" src="/apgar-simulated-grunting.wav"/>
    <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/60 px-4 text-sm font-semibold text-white hover:bg-white/15"
     onClick={()=>void playSound()}>
     <Volume2 size={17} aria-hidden="true"/> Hear simulated breathing
    </button>
   </>}
   {soundError&&<p className="text-sm text-white" role="status">Audio couldn’t play. See the written respiration findings below.</p>}
  </div>
 </div>;
}

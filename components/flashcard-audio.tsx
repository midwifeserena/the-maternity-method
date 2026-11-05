'use client';
import {useEffect,useRef,useState} from 'react';
import {Square,Volume2} from 'lucide-react';

// Keep utterances short: long flashcard explanations can stall some speech engines.
export function speechChunks(text:string){
 const chunks:string[]=[];let current='';
 for(const word of text.trim().split(/\s+/).filter(Boolean)){
  if(current&&current.length+word.length+1>180){chunks.push(current);current=''}
  if(word.length>180){if(current){chunks.push(current);current=''}const chars=Array.from(word);while(chars.length>180)chunks.push(chars.splice(0,180).join(''));current=chars.join('')}
  else current+=(current?' ':'')+word;
 }
 if(current)chunks.push(current);return chunks;
}

export function FlashcardAudio({front,back}:{front:string;back:string}){
 const [supported,setSupported]=useState<boolean|null>(null),[reading,setReading]=useState<'question'|'answer'|null>(null),[error,setError]=useState('');
 const playback=useRef<{token:number;queue:SpeechSynthesisUtterance[];owned:boolean;engine:SpeechSynthesis|null}>({token:0,queue:[],owned:false,engine:null});
 function cancel(){const state=playback.current;state.token++;if(state.owned){state.owned=false;state.engine?.cancel()}state.queue=[]}
 useEffect(()=>{
  const state=playback.current;state.engine=window.speechSynthesis??null;
  setSupported(Boolean(state.engine)&&typeof window.SpeechSynthesisUtterance==='function');
  // Card/filter changes remount this control. Invalidate callbacks before cancelling.
  return()=>{state.token++;if(state.owned){state.owned=false;state.engine?.cancel()}state.queue=[]};
 },[]);
 function stop(){cancel();setReading(null);setError('')}
 function read(){
  if(!supported)return;cancel();setError('');const state=playback.current,token=state.token;
  const parts=[...speechChunks('Question. '+front).map(text=>({text,side:'question' as const})),...speechChunks('Answer. '+back).map(text=>({text,side:'answer' as const}))];
  if(!parts.length)return;
  const synth=state.engine;if(!synth)return;
  try{
   // Clear an interrupted browser queue so a fresh user click starts cleanly.
   synth.cancel();state.owned=true;setReading('question');
   const queue=parts.map((part,index)=>{
    const utterance=new SpeechSynthesisUtterance(part.text);utterance.lang='en-US';
    utterance.onstart=()=>{if(token===state.token)setReading(part.side)};
    utterance.onend=()=>{if(token===state.token&&index===parts.length-1){state.token++;state.owned=false;state.queue=[];setReading(null)}};
    utterance.onerror=()=>{if(token!==state.token)return;cancel();setReading(null);setError('Read aloud could not finish. Try again, or check your browser’s audio settings.')};
    return utterance;
   });
   state.queue=queue;if(synth.paused)synth.resume();
   for(const utterance of queue){if(token!==state.token)break;synth.speak(utterance)}
  }catch{cancel();setReading(null);setError('Read aloud could not start. Try again, or check your browser’s audio settings.')}
 }
 if(supported===null)return null;
 if(!supported)return <p className="text-sm text-espresso/65">Read aloud isn’t available in this browser. Try a browser with text-to-speech support.</p>;
 return <div className="rounded-xl border border-rose/30 bg-cream/60 p-4 space-y-3" aria-label="Flashcard audio">
  <div className="flex flex-wrap gap-3"><button type="button" className="btn-outline disabled:opacity-40" disabled={Boolean(reading)} onClick={read}><Volume2 size={18} aria-hidden="true"/>Read question &amp; answer</button><button type="button" className="btn-outline disabled:opacity-40" disabled={!reading} onClick={stop}><Square size={16} aria-hidden="true"/>Stop reading</button></div>
  <p className="text-sm text-espresso/65" role="status">{reading==='question'?'Reading the question…':reading==='answer'?'Reading the answer…':'Reads the question first, then the answer.'}</p>
  {error&&<p role="alert" className="text-sm text-mauve">{error}</p>}
 </div>;
}

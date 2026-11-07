'use client';
import {useEffect,useRef,useState} from 'react';
import {selectReviewVoice,suggestedFemaleVoice} from '@/lib/audio-review.mjs';
import {speechChunks} from '@/lib/flashcard-study.mjs';
export function useFlashcardSpeech(resetKey:string,{preferFemale=false}:{preferFemale?:boolean}={}){
 const [supported,setSupported]=useState<boolean|null>(null),[reading,setReading]=useState(false),[error,setError]=useState(''),[rate,setRate]=useState(1);
 const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]),[voiceURI,setVoiceURI]=useState('');
 const playback=useRef({token:0,owned:false,engine:null as SpeechSynthesis|null,queue:[] as SpeechSynthesisUtterance[]});
 function cancel(){const state=playback.current;state.token++;if(state.owned){state.owned=false;state.engine?.cancel()}state.queue=[];}
 function stop(){cancel();setReading(false);setError('');}
 useEffect(()=>{
  const state=playback.current;state.token++;if(state.owned){state.owned=false;state.engine?.cancel()}state.queue=[];state.engine=window.speechSynthesis??null;
  setSupported(Boolean(state.engine)&&typeof window.SpeechSynthesisUtterance==='function');setReading(false);setError('');
  return()=>{state.token++;if(state.owned){state.owned=false;state.engine?.cancel()}state.queue=[];};
 },[resetKey]);
 useEffect(()=>{
  if(!preferFemale)return;const engine=window.speechSynthesis;if(!engine)return;let preferred='';try{preferred=localStorage.getItem('tmm:podcast:voice')??''}catch{}
  const update=()=>{const available=engine.getVoices?.()??[];setVoices(available);setVoiceURI(current=>selectReviewVoice(available,current||preferred)?.voiceURI??current);};
  update();engine.addEventListener?.('voiceschanged',update);return()=>engine.removeEventListener?.('voiceschanged',update);
 },[preferFemale]);
 function chooseVoice(uri:string){stop();setVoiceURI(uri);try{localStorage.setItem('tmm:podcast:voice',uri)}catch{}}
 function speak(text:string){
  if(!supported)return;cancel();setError('');const state=playback.current,token=state.token,synth=state.engine;if(!synth)return;
  const parts=speechChunks(text);if(!parts.length)return;
  try{
   synth.cancel();state.owned=true;setReading(true);
   const queue=parts.map((part,index)=>{const utterance=new SpeechSynthesisUtterance(part);const voice=preferFemale?selectReviewVoice(synth.getVoices?.()??voices,voiceURI):null;if(voice)utterance.voice=voice;utterance.lang=voice?.lang??'en-US';utterance.rate=rate;
    utterance.onend=()=>{if(token===state.token&&index===parts.length-1){state.token++;state.owned=false;state.queue=[];setReading(false)}};
    utterance.onerror=()=>{if(token!==state.token)return;cancel();setReading(false);setError('Read aloud could not finish. Please try again or check your browser’s audio settings.');};return utterance;});
   state.queue=queue;if(synth.paused)synth.resume();for(const utterance of queue){if(state.token!==token)break;synth.speak(utterance);}
  }catch{cancel();setReading(false);setError('Read aloud could not start. Please try again or check your browser’s audio settings.');}
 }
 return {supported,reading,error,rate,setRate,speak,stop,voices,voiceURI,chooseVoice,suggestedFemale:preferFemale?suggestedFemaleVoice(voices):null};
}

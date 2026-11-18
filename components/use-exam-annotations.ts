'use client';
import {useEffect,useRef,useState,type RefObject,type MouseEvent} from 'react';
import {mergeTextHighlights,rangeFromTextOffsets,type TextHighlight} from '@/lib/exam-annotations.mjs';

function selectedRange(root:HTMLElement|null){
 const selection=window.getSelection();
 if(!root||!selection||selection.isCollapsed||!selection.rangeCount)return null;
 const range=selection.getRangeAt(0);
 const start=range.startContainer;
 const element=start instanceof Element?start:start.parentElement;
 const region=element?.closest<HTMLElement>('[data-exam-annotation]');
 if(!region||!root.contains(region)||!region.contains(range.endContainer))return null;
 return {range,region};
}

/** CSS Custom Highlights paint text without changing React's DOM or answer state. */
export function useExamAnnotations(root:RefObject<HTMLElement|null>,pageKey:string,viewKey=''){
 const saved=useRef<Record<string,TextHighlight[]>>({}),pending=useRef<ReturnType<typeof selectedRange>>(null);
 const [revision,setRevision]=useState(0),[notice,setNotice]=useState('');
 useEffect(()=>{
  pending.current=null;
  function rememberSelection(){
   const selection=selectedRange(root.current);
   if(selection)pending.current={...selection,range:selection.range.cloneRange()};
   else if(window.getSelection()?.isCollapsed===false)pending.current=null;
  }
  function onPointerDown(event:PointerEvent){
   // Tapping the toolbar can collapse the native selection before click fires.
   if(event.target instanceof Element&&event.target.closest('[data-exam-highlight-selection]'))rememberSelection();
   else pending.current=null;
  }
  document.addEventListener('selectionchange',rememberSelection);
  document.addEventListener('pointerdown',onPointerDown,true);
  return()=>{
   document.removeEventListener('selectionchange',rememberSelection);
   document.removeEventListener('pointerdown',onPointerDown,true);
  };
 },[root,pageKey,viewKey]);
 useEffect(()=>{
  const registry=(CSS as unknown as {highlights?:Map<string,unknown>}).highlights;
  const HighlightClass=(window as unknown as {Highlight?:new(...ranges:Range[])=>unknown}).Highlight;
  if(!registry||!HighlightClass||!root.current)return;
  const ranges:Range[]=[];
  for(const record of saved.current[pageKey]??[]){
   const region=Array.from(root.current.querySelectorAll<HTMLElement>('[data-exam-annotation]')).find(el=>el.dataset.examAnnotation===record.region);
   if(region){const range=rangeFromTextOffsets(region,record.start,record.end);if(range)ranges.push(range);}
  }
  const highlight=new HighlightClass(...ranges);registry.set('tmm-study-highlight',highlight);
  return()=>{if(registry.get('tmm-study-highlight')===highlight)registry.delete('tmm-study-highlight');};
 },[root,pageKey,viewKey,revision]);
 function highlightSelection(){
  const selection=selectedRange(root.current)??pending.current;
  if(!selection||!root.current?.contains(selection.region)){
   setNotice('Select a word or phrase first, then choose Highlight selection.');
   return false;
  }
  const {range,region}=selection;
  if(!region.contains(range.commonAncestorContainer))return false;
  if(!(CSS as unknown as {highlights?:unknown}).highlights){setNotice('Please use an up-to-date browser for text highlighting.');return false;}
  const prefix=range.cloneRange();prefix.selectNodeContents(region);prefix.setEnd(range.startContainer,range.startOffset);
  const start=prefix.toString().length,end=start+range.toString().length;if(start===end)return false;
  saved.current[pageKey]=mergeTextHighlights(saved.current[pageKey]??[],{region:region.dataset.examAnnotation!,start,end});
  pending.current=null;window.getSelection()?.removeAllRanges();setRevision(n=>n+1);setNotice('Text highlighted.');return true;
 }
 function onContextMenu(event:MouseEvent){const target=event.target instanceof Element?event.target.closest('[data-exam-annotation]'):null;if(target&&event.button===2&&(!('pointerType' in event.nativeEvent)||event.nativeEvent.pointerType!=='touch')&&highlightSelection())event.preventDefault();}
 function clearHighlights(){delete saved.current[pageKey];pending.current=null;setRevision(n=>n+1);setNotice('Highlights cleared for this question.');}
 return {highlightSelection,onContextMenu,clearHighlights,notice,revision,exportHighlights:()=>saved.current,restoreHighlights:(value:Record<string,TextHighlight[]>)=>{saved.current=value;setRevision(n=>n+1)}};
}

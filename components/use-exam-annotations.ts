'use client';
import {useEffect,useRef,useState,type RefObject,type MouseEvent} from 'react';
import {mergeTextHighlights,rangeFromTextOffsets,type TextHighlight} from '@/lib/exam-annotations.mjs';

/** CSS Custom Highlights paint text without changing React's DOM or answer state. */
export function useExamAnnotations(root:RefObject<HTMLElement|null>,pageKey:string,viewKey=''){
 const saved=useRef<Record<string,TextHighlight[]>>({}),pending=useRef<Range|null>(null);
 const [revision,setRevision]=useState(0),[notice,setNotice]=useState('');
 useEffect(()=>{pending.current=null;},[pageKey,viewKey]);
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
 function selectedRange(){const selection=window.getSelection();return selection&&!selection.isCollapsed&&selection.rangeCount?selection.getRangeAt(0):null;}
 function rememberSelection(){const range=selectedRange();if(range&&root.current?.contains(range.commonAncestorContainer))pending.current=range.cloneRange();}
 function highlightSelection(){
  const range=selectedRange()??pending.current;if(!range||!root.current?.contains(range.commonAncestorContainer))return false;
  const element=range.startContainer.nodeType===1?range.startContainer as Element:range.startContainer.parentElement;
  const region=element?.closest<HTMLElement>('[data-exam-annotation]');
  if(!region||!root.current.contains(region)||!region.contains(range.endContainer))return false;
  if(!(CSS as unknown as {highlights?:unknown}).highlights){setNotice('Please use an up-to-date browser for text highlighting.');return false;}
  const prefix=range.cloneRange();prefix.selectNodeContents(region);prefix.setEnd(range.startContainer,range.startOffset);
  const start=prefix.toString().length,end=start+range.toString().length;if(start===end)return false;
  saved.current[pageKey]=mergeTextHighlights(saved.current[pageKey]??[],{region:region.dataset.examAnnotation!,start,end});
  pending.current=null;window.getSelection()?.removeAllRanges();setRevision(n=>n+1);setNotice('Text highlighted.');return true;
 }
 function onContextMenu(event:MouseEvent){const target=event.target instanceof Element?event.target.closest('[data-exam-annotation]'):null;if(target&&highlightSelection())event.preventDefault();}
 function clearHighlights(){delete saved.current[pageKey];pending.current=null;setRevision(n=>n+1);setNotice('Highlights cleared for this question.');}
 return {highlightSelection,rememberSelection,onContextMenu,clearHighlights,notice,revision,exportHighlights:()=>saved.current,restoreHighlights:(value:Record<string,TextHighlight[]>)=>{saved.current=value;setRevision(n=>n+1)}};
}

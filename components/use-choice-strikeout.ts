'use client';
import {useRef,type MouseEvent} from 'react';
/** Restore the value before the first click: double-clicking never answers an item. */
export function useChoiceStrikeout<T>(answer:T,onChange:((answer:T)=>void)|undefined,onToggle:((id:string)=>void)|undefined,enabled:boolean){
 const before=useRef<T>(answer);
 return {
  onMouseDown(event:MouseEvent){if(event.detail===1)before.current=answer;},
  onDoubleClick(id:string,event:MouseEvent){if(!enabled||!onToggle)return;event.preventDefault();event.stopPropagation();onChange?.(before.current);onToggle(id);window.getSelection()?.removeAllRanges();}
 };
}

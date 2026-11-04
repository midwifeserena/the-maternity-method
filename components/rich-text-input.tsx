'use client';
import {useRef} from 'react';
import {applyTextFormat} from '@/lib/question-authoring.mjs';
export function RichTextInput({label,value,format,onChange,onFormat,placeholder,disabled=false}:{label:string;value:string;format:string;onChange:(value:string)=>void;onFormat:(format:'plain'|'markdown')=>void;placeholder?:string;disabled?:boolean}){
 const field=useRef<HTMLTextAreaElement>(null);
 function apply(style:string){const element=field.current;if(!element)return;const next=applyTextFormat(value,element.selectionStart,element.selectionEnd,style);onChange(next.text);onFormat('markdown');requestAnimationFrame(()=>{element.focus();element.setSelectionRange(next.start,next.end)})}
 return <div className="studio-field"><label><span>{label}</span></label><div className="studio-format-toolbar" aria-label={label+' formatting'}>{[['bold','Bold'],['italic','Italic'],['bullets','Bullet list'],['numbered','Numbered list']].map(([style,name])=><button key={style} type="button" disabled={disabled} onMouseDown={event=>event.preventDefault()} onClick={()=>apply(style)}>{name}</button>)}<label className="studio-format-toggle"><input type="checkbox" disabled={disabled} checked={format==='markdown'} onChange={event=>onFormat(event.target.checked?'markdown':'plain')}/>Formatted text</label></div><textarea ref={field} aria-label={label} value={value} disabled={disabled} placeholder={placeholder} onChange={event=>onChange(event.target.value)} rows={5}/><span className="studio-help">Select text and choose a format. Check the Preview tab to see the finished question.</span></div>;
}

import {Fragment} from 'react';
/** Safe, deliberately small rich-text vocabulary. HTML and embedded media are
 * always text, never executed. Plain historical content is rendered unchanged. */
export function FormattedText({text,format='plain'}:{text?:string|null;format?:string}){
 if(format!=='markdown')return <>{text??''}</>;
 const inline=(value:string)=>value.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g).map((part,index)=>part.startsWith('**')&&part.endsWith('**')?<strong key={index}>{part.slice(2,-2)}</strong>:part.startsWith('*')&&part.endsWith('*')?<em key={index}>{part.slice(1,-1)}</em>:<Fragment key={index}>{part}</Fragment>);
 return <>{(text??'').split('\n').map((line,index)=>{
  const bullet=/^\s*[-•]\s+/.test(line),numbered=line.match(/^\s*(\d+)\.\s+/),heading=/^#{1,3}\s+/.test(line);
  const value=line.replace(/^\s*[-•]\s+|^\s*\d+\.\s+|^#{1,3}\s+/,'');
  return <span key={index} style={{display:'block',minHeight:'1em',paddingLeft:bullet||numbered?'1em':undefined,fontWeight:heading?700:undefined}}>{bullet?'• ':numbered?numbered[1]+'. ':''}{inline(value)}</span>;
 })}</>;
}

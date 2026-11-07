'use client';
import {useId,useState} from 'react';
import {FormattedText} from './formatted-text';
type CaseContext={case_number:number;item_number:number;item_count:number};
export function ExamCaseChart({context,scenario,format,chart={}}:{context:CaseContext;scenario?:string;format?:string;chart?:Record<string,string>}){
 const [tab,setTab]=useState(''),id=useId(),titles=Object.keys(chart),active=titles.includes(tab)?tab:titles[0];
 return <aside className="exam-case-information" aria-label="Patient information"><h2 className="exam-case-progress">Question {context.item_number} of {context.item_count}</h2><p className="exam-case-number">Case {context.case_number}</p>{scenario&&<p className="exam-clinical-scenario" data-exam-annotation="scenario"><FormattedText text={scenario} format={format}/></p>}{titles.length>0&&<div className="exam-chart"><div className="exam-chart-tabs" role="tablist" aria-label="Clinical chart sections">{titles.map((title,n)=><button type="button" role="tab" id={id+'-tab-'+n} aria-selected={active===title} aria-controls={id+'-panel'} key={title} onClick={()=>setTab(title)}>{title}</button>)}</div><div id={id+'-panel'} role="tabpanel" aria-labelledby={id+'-tab-'+titles.indexOf(active)} className="exam-chart-content" data-exam-annotation={'chart:'+active}>{chart[active]}</div></div>}</aside>;
}

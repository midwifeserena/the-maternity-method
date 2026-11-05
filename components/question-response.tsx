'use client';
import {NgnQuestion} from './ngn-question';import {QuestionMatrix} from './question-matrix';import {ExamImages} from './exam-images';
export function QuestionResponse({question:q,answer,solution,disabled=false,onChange}:{question:any;answer:unknown;solution?:unknown;disabled?:boolean;onChange?:(answer:any)=>void}){
 if(q.ngn_format)return <NgnQuestion question={q} answer={answer} solution={solution} disabled={disabled} onChange={onChange}/>;
 if(q.type==='matrix')return <QuestionMatrix question={q} answer={answer} solution={solution} disabled={disabled} onChange={onChange}/>;
 const revealed=solution!==undefined&&solution!==null,selected=(v:unknown,id:string)=>Array.isArray(v)?v.includes(id):v===id;
 return <fieldset className="ngn-interaction" disabled={disabled||revealed}><legend>{q.type==='sata'?'Select all that apply':'Select one answer'}</legend>{q.options.map((option:any)=>{const chosen=selected(answer,option.id),correct=selected(solution,option.id);return <label key={option.id} className={revealed?(correct?'ngn-right':chosen?'ngn-wrong':''):''}><input type={q.type==='sata'?'checkbox':'radio'} name={'question-'+q.id} checked={chosen} onChange={()=>onChange?.(q.type==='single'?option.id:chosen?(answer as string[]).filter(id=>id!==option.id):[...(Array.isArray(answer)?answer:[]),option.id])}/><span>{option.label}<ExamImages images={option.images}/>{revealed&&<small>{chosen?'Your answer. ':''}{correct?'Correct answer. ':''}</small>}</span></label>})}</fieldset>;
}

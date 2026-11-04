'use client';
import {matrixSelection,changeMatrixSelection} from '@/lib/matrix.mjs';
type MatrixQuestion={id:string;matrix_mode?:'single'|'multiple';options:{id:string;label:string}[];matrix_rows?:{id:string;label:string}[]};
export function QuestionMatrix({question,answer,solution,rowExplanations,disabled=false,onChange,correctLabel='Correct answer'}:{question:MatrixQuestion;answer:unknown;solution?:unknown;rowExplanations?:Record<string,string>;disabled?:boolean;onChange?:(answer:Record<string,string|string[]>)=>void;correctLabel?:string}){
 const multiple=question.matrix_mode==='multiple',revealed=solution!==undefined&&solution!==null;
 return <div className="exam-matrix-scroll" role="region" aria-label="Matrix answer table" tabIndex={0}><p className="exam-matrix-instructions">{multiple?'Select one or more answers in each row.':'Select exactly one answer in each row.'}</p><table className="exam-matrix"><caption className="exam-sr-only">{multiple?'Matrix multiple response':'Matrix multiple choice'}</caption><thead><tr><th scope="col">Clinical finding / action</th>{question.options.map(option=><th scope="col" key={option.id}>{option.label}</th>)}</tr></thead><tbody>{question.matrix_rows?.map(row=>{
  const explanation=rowExplanations?.[row.id];
  return <tr key={row.id}><th scope="row">{row.label}{revealed&&explanation&&<p className="exam-matrix-row-explanation">{explanation}</p>}</th>{question.options.map(option=>{
   const selected=matrixSelection(question,answer,row.id,option.id),correct=revealed&&matrixSelection(question,solution,row.id,option.id),known=revealed&&typeof solution==='object'&&Object.hasOwn(solution as object,row.id);
   return <td key={option.id} className={correct?'exam-matrix-cell-correct':known&&selected?'exam-matrix-cell-incorrect':''}><label className="exam-matrix-choice"><input type={multiple?'checkbox':'radio'} name={question.id+'-'+row.id} checked={selected} disabled={disabled||revealed} aria-label={row.label+': '+option.label} onChange={()=>onChange?.(changeMatrixSelection(question,answer,row.id,option.id))}/><span className="exam-sr-only">{row.label}: {option.label}</span></label>{revealed&&selected&&<span className="exam-matrix-feedback">Your answer</span>}{correct&&<strong className="exam-matrix-feedback">{correctLabel}</strong>}</td>;
  })}</tr>;
 })}</tbody></table></div>;
}

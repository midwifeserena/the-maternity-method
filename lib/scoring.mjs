import {scoreNgn,publicNgnConfig} from './ngn-standalone.mjs';
import {matrixMultipleScore} from './matrix.mjs';
/** Correct answers are applied ONLY server-side. No scoring keys in student question payload. */
export function scoreQuestion(question,answer){
 const ngn=scoreNgn(question,answer);if(ngn)return ngn;
 const key=question.answer_key;
 if(question.type==='single') return {earned:answer===key?1:0,possible:1};
 if(question.type==='sata'){
   const selected=new Set(Array.isArray(answer)?answer:[]),correct=new Set(key);
   const earned=Math.max(0,[...selected].reduce((points,id)=>points+(correct.has(id)?1:-1),0));
   return {earned,possible:correct.size};
 }
 if(question.type==='matrix'&&question.matrix_mode==='multiple')return matrixMultipleScore(question,answer);
 if(question.type==='matrix'){
   const rows=Array.isArray(question.matrix_rows)?question.matrix_rows:[];
   // Matrix multiple-choice: one correct option per row, each row contributes 0/1.
   const earned=rows.reduce((points,row)=>points+(answer?.[row.id]===key[row.id]?1:0),0);
   return {earned,possible:rows.length};
 }
 throw new Error('Unsupported question type');
}
export function publicQuestion(q){
 const {answer_key,rationale,rationale_image_url,rationale_image_alt,rationale_images,nursing_tip,row_explanations,test_taking_tip,answer_explanations,rationale_format,...safe}=q;
 return q.ngn_format?{...safe,ngn_config:publicNgnConfig(q)}:safe;
}

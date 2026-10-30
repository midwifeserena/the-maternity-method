/** Correct answers are applied ONLY server-side. No scoring keys in student question payload. */
export function scoreQuestion(question,answer){
 const key=question.answer_key;
 if(question.type==='single') return {earned:answer===key?1:0,possible:1};
 if(question.type==='sata'){
   const selected=new Set(Array.isArray(answer)?answer:[]),correct=new Set(key);
   const earned=Math.max(0,[...selected].reduce((points,id)=>points+(correct.has(id)?1:-1),0));
   return {earned,possible:correct.size};
 }
 if(question.type==='matrix'){
   const rows=Array.isArray(question.matrix_rows)?question.matrix_rows:[];
   // Matrix multiple-choice: one correct option per row, each row contributes 0/1.
   const earned=rows.reduce((points,row)=>points+(answer?.[row.id]===key[row.id]?1:0),0);
   return {earned,possible:rows.length};
 }
 throw new Error('Unsupported question type');
}
export function publicQuestion(q){
 const {answer_key,rationale,...safe}=q;
 return safe;
}

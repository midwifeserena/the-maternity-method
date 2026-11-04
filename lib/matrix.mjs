/** Matrix multiple-response uses +/- credit per row, floored at zero per row.
 * Existing matrix multiple-choice remains one point per correctly answered row. */
export function matrixRowScores(question,answer){
 const multiple=question.matrix_mode==='multiple',key=question.answer_key??{};
 return (question.matrix_rows??[]).map(row=>{
  if(!multiple)return {id:row.id,earned:answer?.[row.id]===key[row.id]?1:0,possible:1};
  const correct=new Set(Array.isArray(key[row.id])?key[row.id]:[]),selected=new Set(Array.isArray(answer?.[row.id])?answer[row.id]:[]);
  return {id:row.id,earned:Math.max(0,[...selected].reduce((points,id)=>points+(correct.has(id)?1:-1),0)),possible:correct.size};
 });
}
export function matrixMultipleScore(question,answer){
 return matrixRowScores(question,answer).reduce((total,row)=>({earned:total.earned+row.earned,possible:total.possible+row.possible}),{earned:0,possible:0});
}
export function matrixSelection(question,answer,rowId,optionId){
 return question.matrix_mode==='multiple'?Array.isArray(answer?.[rowId])&&answer[rowId].includes(optionId):answer?.[rowId]===optionId;
}
export function changeMatrixSelection(question,answer,rowId,optionId){
 const previous=answer&&typeof answer==='object'&&!Array.isArray(answer)?answer:{};
 if(question.matrix_mode!=='multiple')return {...previous,[rowId]:optionId};
 const selected=Array.isArray(previous[rowId])?previous[rowId]:[];
 return {...previous,[rowId]:selected.includes(optionId)?selected.filter(id=>id!==optionId):[...selected,optionId]};
}

export function normalizeRowExplanations(value){
 return value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).filter(([,text])=>typeof text==='string')):{};
}

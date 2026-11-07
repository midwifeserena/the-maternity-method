import {scoreExamSnapshot} from './case-exam.mjs';
/** Only ancillary self-reported timing/first choices. Never modifies answers or grades. */
export function summarizeExamTelemetry(input,snapshots,answers,durationSeconds){
 if(!input||input.version!==1||typeof input!=='object')return null;
 const changes={correctToIncorrect:0,incorrectToCorrect:0,incorrectToIncorrect:0},timings=[];
 let budget=Math.max(0,Math.min(86400,Math.floor(durationSeconds)));
 for(const row of snapshots){
  const q=row.question_snapshot,first=input.firstAnswers?.[row.question_id],last=answers[row.question_id];
  const elapsed=input.milliseconds?.[row.question_id];
  if(typeof elapsed==='number'&&Number.isFinite(elapsed)&&elapsed>=0){const seconds=Math.min(budget,Math.floor(elapsed/1000));timings.push({question_id:row.question_id,seconds});budget-=seconds;}
  if(q.type!=='single'||q.ngn_format||typeof first!=='string'||typeof last!=='string'||first===last||!q.options?.some(o=>o.id===first)||!q.options.some(o=>o.id===last))continue;
  const initial=scoreExamSnapshot(q,row.solution_snapshot,first),final=scoreExamSnapshot(q,row.solution_snapshot,last);
  const before=initial.earned===initial.possible,after=final.earned===final.possible;
  if(before&&!after)changes.correctToIncorrect++;
  else if(!before&&after)changes.incorrectToCorrect++;
  else if(!before&&!after)changes.incorrectToIncorrect++;
 }
 return {version:1,changes,timings};
}

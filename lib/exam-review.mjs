export function safeReviewImageUrl(value){
 if(typeof value!=='string')return null;
 if(value.startsWith('/')&&!value.startsWith('//'))return value;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null}catch{return null}
}
export function reviewImages(source){
 if(!source||typeof source!=='object')return [];
 const images=[],seen=new Set();
 const add=value=>{
  if(Array.isArray(value)){value.forEach(add);return}
  const url=safeReviewImageUrl(typeof value==='string'?value:value?.url??value?.src??value?.image_url);
  if(!url||seen.has(url))return;
  seen.add(url);images.push({url,alt:typeof value?.alt==='string'?value.alt:typeof value?.caption==='string'?value.caption:''});
 };
 for(const key of ['images','image_urls','image_url','question_images','question_image_url','rationale_images','rationale_image_url','diagram_file'])add(source[key]);
 return images;
}
export function publicSnapshot(question){
 if(!question||typeof question.stem!=='string'||!['single','sata','matrix'].includes(question.type)||!Array.isArray(question.options))return null;
 if(question.options.some(option=>typeof option?.id!=='string'||typeof option?.label!=='string'))return null;
 return {id:question.id,category:question.category,type:question.type,stem:question.stem,
  options:question.options.map(option=>({id:option.id,label:option.label,images:reviewImages(option)})),
  matrix_rows:Array.isArray(question.matrix_rows)?question.matrix_rows:[],chart:question.chart??{},images:reviewImages(question)};
}
export function hasSavedResponse(value){
 if(value===null||value===undefined)return false;
 if(typeof value==='string')return Boolean(value.trim());
 if(Array.isArray(value))return value.some(hasSavedResponse);
 if(typeof value==='object')return Object.values(value).some(hasSavedResponse);
 return true;
}
export function responseStatus(row){
 if(!row||!Number.isFinite(row.earned)||!Number.isFinite(row.possible)||row.possible<=0||row.earned<0||row.earned>row.possible)return 'unavailable';
 if(!hasSavedResponse(row.response))return 'unanswered';
 if(row.earned===row.possible)return 'correct';
 return row.earned>0?'partial':'incorrect';
}
export function summarizeAttempt(attempt,responses){
 const count=Number.isInteger(attempt.question_count)&&attempt.question_count>=0?attempt.question_count:null;
 const statuses=responses.map(responseStatus),known=responses.length>0&&!statuses.includes('unavailable');
 const stage=['start','submission'].includes(attempt.snapshot_stage)?attempt.snapshot_stage:null;
 return {id:attempt.id,name:attempt.exam_name?.trim()||(attempt.mode==='study'?'Study session':'Timed session'),mode:attempt.mode,
  completedAt:attempt.completed_at,earned:attempt.earned,possible:attempt.possible,
  percentage:attempt.possible>0?Math.round(attempt.earned/attempt.possible*100):null,
  questionCount:count,recordedCount:responses.length,
  correctCount:known?statuses.filter(status=>status==='correct').length:null,
  incorrectCount:known?statuses.filter(status=>['incorrect','partial','unanswered'].includes(status)).length:null,
  unansweredCount:known?statuses.filter(status=>status==='unanswered').length:null,
  partialCount:known?statuses.filter(status=>status==='partial').length:null,
  countsScope:count!==null&&count===responses.length&&known?'complete':'recorded',snapshotStage:stage,
  reviewAvailability:stage&&count===responses.length?'archived':responses.length?'limited':'none'};
}
export function buildExamReview(attempt,responses,snapshots,currentQuestions=[],currentSolutions=[]){
 const summary=summarizeAttempt(attempt,responses),warnings=[];
 const byQuestion=new Map(responses.map(row=>[row.question_id,row]));
 let items;
 if(snapshots.length){
  items=[...snapshots].sort((a,b)=>a.position-b.position).map(snapshot=>{
   const row=byQuestion.get(snapshot.question_id),solution=snapshot.solution_snapshot;
   return {id:snapshot.question_id,position:snapshot.position,contentSource:'archived',selectionUnavailable:false,question:publicSnapshot(snapshot.question_snapshot),
    responseRecorded:Boolean(row),response:row?.response??null,earned:row?.earned??null,possible:row?.possible??null,status:responseStatus(row),
    correctAnswer:solution?.answer_key??null,rationale:typeof solution?.rationale==='string'?solution.rationale:null,rationaleImages:reviewImages(solution)};
  });
  if(items.some(item=>!item.responseRecorded))warnings.push('Some saved response records are missing. Missing responses are marked unavailable, not treated as unanswered.');
  if(items.some(item=>!item.question||item.correctAnswer===null||!item.rationale))warnings.push('Some archived question or solution details are incomplete. Available saved scores are shown without reconstructing missing content.');
  if(Number.isInteger(attempt.question_count)&&snapshots.length!==attempt.question_count)warnings.push('The archived question count does not match the recorded session total.');
 }else{
  const questions=new Map(currentQuestions.map(question=>[question.id,question]));
  const solutions=new Map(currentSolutions.map(solution=>[solution.question_id,solution]));
  items=[...responses].sort((a,b)=>String(a.id).localeCompare(String(b.id))).map(row=>{
   const question=publicSnapshot(questions.get(row.question_id)),solution=solutions.get(row.question_id);
   return {id:row.question_id,position:null,contentSource:question?'current':'unavailable',
    question,responseRecorded:true,response:row.response,earned:row.earned,possible:row.possible,status:responseStatus(row),
    correctAnswer:question?solution?.answer_key??null:null,rationale:question&&typeof solution?.rationale==='string'?solution.rationale:null,
    rationaleImages:question?reviewImages(solution):[],selectionUnavailable:question?!responseFitsQuestion(question,row.response):false};
  });
  if(items.some(item=>item.contentSource==='current')){
   warnings.push('This exam did not save question versions. Showing current question-bank content, which may have changed since the exam. Your saved answers, results and score are unchanged.');
   if(items.some(item=>item.question&&(item.correctAnswer===null||item.rationale===null)))warnings.push('Some current answers or rationales are unavailable. Available question content and your saved results are still shown.');
  }else warnings.push(responses.length?'The questions for this older exam are no longer available in the question bank. Your saved answers and score are still shown.':'This session has a saved overall score, but no question-level response records are available.');
  if(items.some(item=>!item.question)&&items.some(item=>item.question))warnings.push('Some questions are no longer available. Their saved answers and points are shown without reconstructing missing content.');
  if(responses.length)warnings.push('Original question order was not saved. Questions are shown in a consistent review order.');
 }
 if(attempt.snapshot_stage==='submission')warnings.push('This exam version was archived when it was submitted. Changes made while an older test client was open cannot be verified against the version originally displayed.');
 return {attempt:summary,items,warnings};
}

// A changed bank item may no longer contain the original answer identifiers.
// Preserve and display those identifiers rather than guessing their new labels.
function responseFitsQuestion(question,response){
 if(!hasSavedResponse(response))return true;
 const options=new Set(question.options.map(option=>option.id));
 if(question.type==='single')return typeof response==='string'&&options.has(response);
 if(question.type==='sata')return Array.isArray(response)&&response.every(id=>options.has(id));
 if(!response||typeof response!=='object'||Array.isArray(response))return false;
 const rows=new Set(question.matrix_rows.map(row=>row.id));
 return Object.entries(response).every(([row,id])=>rows.has(row)&&(!hasSavedResponse(id)||options.has(id)));
}

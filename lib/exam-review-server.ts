import {randomUUID} from 'node:crypto';
import {validExamSelection,completeExamCases,caseItemDocument} from '@/lib/case-exam.mjs';
import {resolveMediaRecords} from '@/lib/question-media-server';
import {admin} from '@/lib/supabase/admin';
import {createClient} from '@/lib/supabase/server';
import {buildExamReview,summarizeAttempt,publicSnapshot} from '@/lib/exam-review.mjs';

export const validExamId=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const missingReviewFunction=(error:{code?:string}|null)=>Boolean(error&&['PGRST202','42883'].includes(error.code??''));
export const missingReviewTable=(error:{code?:string}|null)=>Boolean(error&&['PGRST205','42P01'].includes(error.code??''));
export type UserDatabase=Awaited<ReturnType<typeof createClient>>;

export async function startReviewAttempt(db:UserDatabase,ids:string[],mode:'study'|'test',stage:'start'|'submission'='start'){
 const {data,error}=await db.rpc('start_exam_review_attempt',{p_question_ids:ids,p_mode:mode,p_exam_name:mode==='study'?'Study practice test':'Timed practice exam',p_snapshot_stage:stage});
 if(error)return {data:null,error};
 const questions=(await resolveMediaRecords(data.questions as unknown[])).map(publicSnapshot);
 if(questions.some(question=>!question))return {data:null,error:{code:'INVALID_SNAPSHOT',message:'Invalid archived question'}};
 return {data:{attemptId:data.attemptId as string,questions},error:null};
}
export async function ownAttempt(db:UserDatabase,userId:string,attemptId:string){
 return db.from('exam_attempts').select('*').eq('id',attemptId).eq('user_id',userId).maybeSingle();
}
export async function frozenItems(attemptId:string){
 return admin().from('exam_review_items').select('*').eq('attempt_id',attemptId).order('position');
}
export async function savedResponses(db:UserDatabase,userId:string,attemptIds:string[]){
 const rows:{id:string;attempt_id:string;question_id:string;response:unknown;earned:number;possible:number}[]=[];
 if(!attemptIds.length)return {data:rows,error:null};
 for(const table of ['exam_responses','exam_case_responses']){
  for(let start=0;;start+=500){
   const {data,error}=await db.from(table).select('id,attempt_id,question_id,response,earned,possible')
    .eq('user_id',userId).in('attempt_id',attemptIds).order('attempt_id').order('id').range(start,start+499);
   if(error){if(table==='exam_case_responses'&&missingReviewTable(error))break;return {data:[],error};}
   rows.push(...(data??[]));if((data??[]).length<500)break;
  }
 }
 return {data:rows,error:null};
}
export async function completedReview(db:UserDatabase,userId:string,id:string){
 const attempt=await ownAttempt(db,userId,id);
 if(attempt.error)return {data:null,error:attempt.error,status:500};
 if(!attempt.data||!attempt.data.completed_at)return {data:null,error:null,status:404};
 const responses=await savedResponses(db,userId,[id]);if(responses.error)return {data:null,error:responses.error,status:500};
 const snapshots=await db.from('exam_review_items').select('question_id,position,question_snapshot,solution_snapshot').eq('attempt_id',id).order('position');
 if(snapshots.error&&!missingReviewTable(snapshots.error))return {data:null,error:snapshots.error,status:500};
 const archived=snapshots.data??[];
 // A completed, owned response is the only authority for retrieving current
 // bank material. Never use client-supplied IDs or replace an archived version.
 const currentQuestions:unknown[]=[],currentSolutions:unknown[]=[];
 if(!archived.length&&responses.data.length){
  const ids=[...new Set(responses.data.map(row=>row.question_id))];
  for(let start=0;start<ids.length;start+=200){
   const batch=ids.slice(start,start+200),service=admin();
   const [questions,solutions]=await Promise.all([
    service.from('questions').select('*').in('id',batch),
    service.from('question_solutions').select('*').in('question_id',batch)
   ]);
   if(questions.error||solutions.error)return {data:null,error:questions.error??solutions.error,status:500};
   currentQuestions.push(...(questions.data??[]));currentSolutions.push(...(solutions.data??[]));
  }
 }
 return {data:buildExamReview(attempt.data,responses.data,await resolveMediaRecords(archived),await resolveMediaRecords(currentQuestions),await resolveMediaRecords(currentSolutions)),error:null,status:200};
}
export {summarizeAttempt};

export async function mixedExamReady(){
 try{const {data,error}=await admin().rpc('mixed_exam_session_version');return !error&&data===1;}catch{return false;}
}
export async function startCaseExam(db:UserDatabase,userId:string,ids:string[],caseIds:string[],mode:'study'|'test'){
 if(!validExamSelection(ids,caseIds,mode)||!caseIds.length)return {data:null,error:{code:'INVALID_SELECTION'}};
 if(!await mixedExamReady())return {data:null,error:{code:'MIXED_SETUP_REQUIRED'}};
 try{
  const service=admin();
  const [bank,solutions,cases,items]=await Promise.all([
   ids.length?db.from('questions').select('*').eq('published',true).in('id',ids):Promise.resolve({data:[],error:null}),
   ids.length?service.from('question_solutions').select('*').in('question_id',ids):Promise.resolve({data:[],error:null}),
   db.from('ngn_cases').select('id,case_number,topic,intro,tabs').eq('published',true).in('id',caseIds),
   service.from('ngn_items').select('*').in('case_id',caseIds).order('item_number')
  ]);
  if(bank.error||solutions.error||cases.error||items.error||bank.data?.length!==ids.length||solutions.data?.length!==ids.length||cases.data?.length!==caseIds.length||items.data?.some(i=>!i.published)||completeExamCases(cases.data??[],items.data??[]).length!==caseIds.length)throw Error('Selected content unavailable');
  const {data:answers,error:answerError}=await service.from('ngn_answers').select('*').in('item_id',items.data!.map(i=>i.id));
  if(answerError||answers?.length!==items.data!.length)throw Error('Case keys unavailable');
  const entries:any[]=[],used=new Set(ids);
  for(const id of ids){const q=bank.data!.find(q=>q.id===id)!,solution=solutions.data!.find(s=>s.question_id===id)!;const visible=publicSnapshot(q);if(!visible)throw Error('Invalid standalone item');entries.push({question_id:id,source_kind:'question',source_id:id,case_id:null,question_snapshot:visible,solution_snapshot:solution});}
  for(const caseId of caseIds){const record=cases.data!.find(c=>c.id===caseId)!;const group=items.data!.filter(i=>i.case_id===caseId).sort((a,b)=>a.item_number-b.item_number);
   for(const item of group){let snapshotId=randomUUID();while(used.has(snapshotId))snapshotId=randomUUID();used.add(snapshotId);const document=caseItemDocument(record,item,answers!.find(a=>a.item_id===item.id)!,snapshotId);entries.push({question_id:snapshotId,source_kind:'ngn_case',source_id:item.id,case_id:caseId,question_snapshot:document.question,solution_snapshot:document.solution});}
  }
  const {data,error}=await service.rpc('start_mixed_exam_attempt',{p_user_id:userId,p_mode:mode,p_items:entries,p_exam_name:ids.length?'Combined practice exam':'NGN case-study exam'});
  if(error)return {data:null,error};
  const questions=(await resolveMediaRecords(data.questions as unknown[])).map(publicSnapshot);
  if(questions.some(q=>!q)||questions.length!==entries.length)throw Error('Incomplete session');
  return {data:{attemptId:data.attemptId as string,questions},error:null};
 }catch{return {data:null,error:{code:'CASE_UNAVAILABLE'}};}
}

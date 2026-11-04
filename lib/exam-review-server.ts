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
 const questions=(data.questions as unknown[]).map(publicSnapshot);
 if(questions.some(question=>!question))return {data:null,error:{code:'INVALID_SNAPSHOT',message:'Invalid archived question'}};
 return {data:{attemptId:data.attemptId as string,questions},error:null};
}
export async function ownAttempt(db:UserDatabase,userId:string,attemptId:string){
 return db.from('exam_attempts').select('*').eq('id',attemptId).eq('user_id',userId).maybeSingle();
}
export async function frozenItems(attemptId:string){
 return admin().from('exam_review_items').select('question_id,position,question_snapshot,solution_snapshot').eq('attempt_id',attemptId).order('position');
}
export async function savedResponses(db:UserDatabase,userId:string,attemptIds:string[]){
 const rows:{id:string;attempt_id:string;question_id:string;response:unknown;earned:number;possible:number}[]=[];
 if(!attemptIds.length)return {data:rows,error:null};
 for(let start=0;;start+=500){
  const {data,error}=await db.from('exam_responses').select('id,attempt_id,question_id,response,earned,possible')
   .eq('user_id',userId).in('attempt_id',attemptIds).order('attempt_id').order('id').range(start,start+499);
  if(error)return {data:[],error};
  rows.push(...(data??[]));if((data??[]).length<500)break;
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
 return {data:buildExamReview(attempt.data,responses.data,archived,currentQuestions,currentSolutions),error:null,status:200};
}
export {summarizeAttempt};

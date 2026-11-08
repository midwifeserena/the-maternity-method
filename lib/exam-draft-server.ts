import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {admin} from '@/lib/supabase/admin';
import {validExamId,ownAttempt,frozenItems,missingReviewTable,missingReviewFunction} from './exam-review-server';
import {validateExamDraft} from './exam-draft.mjs';
import {publicSnapshot} from './exam-review.mjs';
import {resolveMediaRecords,educationFeedback} from './question-media-server';
import {scoreExamSnapshot} from './case-exam.mjs';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function examDraftRequest(request:Request,id:string){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)return reply({error:'Unauthorized'},401);
 if(!validExamId(id))return reply({error:'Invalid exam'},400);
 const owned=await ownAttempt(db,user.id,id);if(owned.error)return reply({error:'Could not verify this exam.'},500);if(!owned.data)return reply({error:'Exam not found'},404);if(owned.data.completed_at)return reply({error:'This exam has already been submitted. Open Review Exam instead.'},409);
 const frozen=await frozenItems(id);if(frozen.error||!frozen.data?.length||frozen.data.length!==owned.data.question_count)return reply({error:'This older exam has no complete saved questions and cannot be resumed.'},409);
 if(request.method==='GET'){
  const {data,error}=await db.from('exam_drafts').select('state,revision,updated_at').eq('attempt_id',id).eq('user_id',user.id).maybeSingle();
  if(error)return reply({error:missingReviewTable(error)?'Save and resume needs the exam-draft database setup.':'Could not load saved progress.'},503);if(!data)return reply({error:'No saved progress was found for this exam.'},404);
  let state;try{state=validateExamDraft(data.state,frozen.data.map(i=>({id:i.question_id})))}catch{return reply({error:'Saved progress is unavailable. Your original record has not been changed.'},409)}
  const feedback:Record<string,unknown>={};
  if(owned.data.mode==='study')for(const item of frozen.data){if(!state.checked.includes(item.question_id)||item.source_kind==='ngn_case'||item.question_snapshot.case_context)continue;const solution=item.solution_snapshot;feedback[item.question_id]={...scoreExamSnapshot(item.question_snapshot,solution,state.answers[item.question_id]),rationale:solution.rationale,answer_key:solution.answer_key,...await educationFeedback(solution)};}
  const questions=(await resolveMediaRecords(frozen.data.map(i=>i.question_snapshot))).map(publicSnapshot);
  if(questions.some(q=>!q))return reply({error:'Saved questions are unavailable.'},409);
  return reply({attemptId:id,mode:owned.data.mode,questions,state,feedback,revision:data.revision,reviewSnapshotAvailable:true});
 }
 const body=await request.json().catch(()=>null);if(!Number.isSafeInteger(body?.revision)||body.revision<0)return reply({error:'Invalid progress revision'},400);
 let state;try{state=validateExamDraft(body.state,frozen.data.map(i=>({id:i.question_id})))}catch{return reply({error:'Invalid exam progress. Nothing was changed.'},400)}
 state.checked=owned.data.mode==='study'?state.checked.filter((id:string)=>{const item=frozen.data!.find(i=>i.question_id===id);return item?.source_kind!=='ngn_case'&&!item?.question_snapshot.case_context}):[];
 const {data,error}=await admin().rpc('save_exam_draft',{p_attempt_id:id,p_user_id:user.id,p_revision:body.revision,p_state:state});
 if(error)return reply({error:missingReviewFunction(error)?'Save and resume needs the exam-draft database setup.':error.code==='40001'?'This exam changed in another window. Reopen the saved exam before continuing.':error.code==='55000'?'This exam has already been submitted.':'Could not save progress. Keep this window open and try again.'},missingReviewFunction(error)?503:error.code==='40001'||error.code==='55000'?409:500);
 return reply(data);
}

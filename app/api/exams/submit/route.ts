import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {admin} from '@/lib/supabase/admin';
import {scoreQuestion} from '@/lib/scoring.mjs';
import {validExamId,ownAttempt,frozenItems,startReviewAttempt,missingReviewFunction} from '@/lib/exam-review-server';

export async function POST(request:NextRequest){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const body=await request.json().catch(()=>null);const ids=body?.questionIds;
 if(!Array.isArray(ids)||!ids.length||ids.length>50||ids.some(id=>!validExamId(id))||new Set(ids).size!==ids.length||!['study','test'].includes(body.mode)||typeof body.answers!=='object'||body.answers===null||Array.isArray(body.answers)||(body.attemptId!=null&&!validExamId(body.attemptId)))return NextResponse.json({error:'Invalid exam payload'},{status:400});
 const duration=Math.max(0,Math.min(86400,Math.trunc(Number(body.durationSeconds)||0)));
 let attemptId:string|null=body.attemptId??null;
 // Older clients can still submit. If snapshots are enabled, capture a clearly
 // labelled submission-time version rather than claiming to know their start version.
 if(!attemptId){
  const started=await startReviewAttempt(db,ids,body.mode,'submission');
  if(started.data)attemptId=started.data.attemptId;
  else if(!missingReviewFunction(started.error))return NextResponse.json({error:'One or more questions or solutions are unavailable.'},{status:400});
 }
 if(attemptId){
  const owned=await ownAttempt(db,user.id,attemptId);
  if(owned.error)return NextResponse.json({error:'Could not verify this exam.'},{status:500});
  if(!owned.data)return NextResponse.json({error:'Exam not found'},{status:404});
  if(owned.data.completed_at)return NextResponse.json({attemptId:owned.data.id,earned:owned.data.earned,possible:owned.data.possible},{headers:{'Cache-Control':'no-store'}});
  if(owned.data.mode!==body.mode)return NextResponse.json({error:'Exam mode does not match the saved session.'},{status:400});
  const snapshots=await frozenItems(attemptId);
  if(snapshots.error||snapshots.data?.length!==ids.length||snapshots.data.some(row=>!ids.includes(row.question_id)))return NextResponse.json({error:'The archived exam is incomplete. Your test has not been submitted.'},{status:409});
  let entries;
  try{entries=snapshots.data.map(row=>({question_id:row.question_id,response:body.answers[row.question_id]??null,...scoreQuestion({...row.question_snapshot,answer_key:row.solution_snapshot.answer_key},body.answers[row.question_id])}))}
  catch{return NextResponse.json({error:'The saved answer keys could not be scored. Your test has not been submitted.'},{status:500})}
  const {data,error}=await admin().rpc('complete_exam_review_attempt',{p_attempt_id:attemptId,p_user_id:user.id,p_responses:entries,p_duration_seconds:duration});
  if(error)return NextResponse.json({error:'Could not save the complete exam. Your answers are still available; please retry.'},{status:500});
  return NextResponse.json({...data,reviewSnapshotAvailable:true},{headers:{'Cache-Control':'no-store'}});
 }
 // Migration not installed: preserve the existing submission behavior and history.
 const {data:questions,error}=await db.from('questions').select('*').eq('published',true).in('id',ids);
 if(error||!questions||questions.length!==ids.length)return NextResponse.json({error:'One or more questions unavailable'},{status:400});
 const {data:solutions,error:solutionError}=await admin().from('question_solutions').select('question_id,answer_key').in('question_id',ids);
 if(solutionError||!solutions||solutions.length!==ids.length)return NextResponse.json({error:'Solutions unavailable'},{status:500});
 const keys=new Map(solutions.map(solution=>[solution.question_id,solution.answer_key]));
 const entries=questions.map(question=>({question_id:question.id,response:body.answers[question.id]??null,...scoreQuestion({...question,answer_key:keys.get(question.id)},body.answers[question.id])}));
 const earned=entries.reduce((total,entry)=>total+entry.earned,0),possible=entries.reduce((total,entry)=>total+entry.possible,0);
 const {data:attempt,error:insertError}=await admin().from('exam_attempts').insert({user_id:user.id,mode:body.mode,earned,possible,duration_seconds:duration,completed_at:new Date().toISOString()}).select('id').single();
 if(insertError||!attempt)return NextResponse.json({error:'Failed to save exam'},{status:500});
 const {error:answersError}=await admin().from('exam_responses').insert(entries.map(entry=>({...entry,attempt_id:attempt.id,user_id:user.id})));
 if(answersError)return NextResponse.json({error:'Exam saved, but response details failed to save'},{status:500});
 return NextResponse.json({attemptId:attempt.id,earned,possible,reviewSnapshotAvailable:false},{headers:{'Cache-Control':'no-store'}});
}

import {educationFeedback} from '@/lib/question-media-server';
import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {admin} from '@/lib/supabase/admin';
import {scoreQuestion} from '@/lib/scoring.mjs';
import {validExamId,ownAttempt,frozenItems} from '@/lib/exam-review-server';

export async function POST(request:NextRequest){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const body=await request.json().catch(()=>null);
 if(!body||!validExamId(body.questionId)||(body.attemptId!=null&&!validExamId(body.attemptId)))return NextResponse.json({error:'Invalid question'},{status:400});
 if(body.attemptId){
  const owned=await ownAttempt(db,user.id,body.attemptId);
  if(owned.error)return NextResponse.json({error:'Could not verify this session.'},{status:500});
  if(!owned.data)return NextResponse.json({error:'Exam not found'},{status:404});
  if(owned.data.mode!=='study')return NextResponse.json({error:'Timed exam feedback is available after submission.'},{status:403});
  if(owned.data.completed_at)return NextResponse.json({error:'This test has already been submitted.'},{status:400});
  const snapshots=await frozenItems(body.attemptId),item=snapshots.data?.find(row=>row.question_id===body.questionId);
  if(snapshots.error||!item)return NextResponse.json({error:'Saved question unavailable'},{status:404});
  const solution=item.solution_snapshot;
  return NextResponse.json({...scoreQuestion({...item.question_snapshot,answer_key:solution.answer_key},body.answer),rationale:solution.rationale,answer_key:solution.answer_key,...await educationFeedback(solution)},{headers:{'Cache-Control':'no-store'}});
 }
 const {data:question,error}=await db.from('questions').select('*').eq('id',body.questionId).eq('published',true).single();
 if(error||!question)return NextResponse.json({error:'Question not found'},{status:404});
 const {data:solution}=await admin().from('question_solutions').select('*').eq('question_id',question.id).single();
 if(!solution)return NextResponse.json({error:'Solution unavailable'},{status:500});
 return NextResponse.json({...scoreQuestion({...question,answer_key:solution.answer_key},body.answer),rationale:solution.rationale,answer_key:solution.answer_key,...await educationFeedback(solution)},{headers:{'Cache-Control':'no-store'}});
}

import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {admin} from '@/lib/supabase/admin';
import {loadLearningAnalyticsWithAttempts} from '@/lib/learning-analytics-server';
import {validExamId} from '@/lib/exam-review-server';

const headers={'Cache-Control':'private, no-store'};

export async function GET(){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:'Sign in to view past performance.'},{status:401,headers});
 const {data,error}=await db.from('past_question_bank_performance')
  .select('id,reset_at,summary').eq('user_id',user.id).order('reset_at',{ascending:false});
 if(error)return NextResponse.json({error:'Past performance is unavailable.'},{status:500,headers});
 return NextResponse.json({snapshots:data},{headers});
}

export async function POST(request:Request){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:'Sign in to reset your progress.'},{status:401,headers});
 const body=await request.json().catch(()=>null);
 if(body?.confirmed!==true||typeof body.resetId!=='string'||!validExamId(body.resetId)){
  return NextResponse.json({error:'Confirm the reset to continue.'},{status:400,headers});
 }
 try{
  const {data:existing,error:lookupError}=await db.from('past_question_bank_performance')
   .select('id').eq('user_id',user.id).eq('id',body.resetId).maybeSingle();
  if(lookupError)throw lookupError;
  if(existing)return NextResponse.json({reset:true},{headers});

  const {analytics,attempts}=await loadLearningAnalyticsWithAttempts(db,user.id);
  const {points,questionScore,usage,tests}=analytics;
  const {data,error}=await admin().rpc('reset_question_bank_progress',{
   p_user_id:user.id,p_reset_id:body.resetId,
   p_attempts:Object.fromEntries(attempts.map(attempt=>[attempt.id,attempt.completed_at])),
   p_summary:{points,questionScore,usage,tests},
  });
  if(error?.code==='40001')return NextResponse.json({
   error:'Your exam history changed. Close this warning and confirm the reset again.',
  },{status:409,headers});
  if(error)throw error;
  return NextResponse.json({reset:data===true},{headers});
 }catch{
  return NextResponse.json({error:'Could not verify the reset. Try again from this warning.'},{status:500,headers});
 }
}

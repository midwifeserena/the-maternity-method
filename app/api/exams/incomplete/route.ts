import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {missingReviewTable} from '@/lib/exam-review-server';
export async function GET(){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const {data,error}=await db.from('exam_drafts').select('attempt_id,updated_at,revision,state,exam_attempts!inner(id,user_id,mode,exam_name,question_count,completed_at)').eq('user_id',user.id).is('exam_attempts.completed_at',null).order('updated_at',{ascending:false}).limit(100);
 if(error)return NextResponse.json({error:missingReviewTable(error)?'Save and resume needs the exam-draft database setup.':'Could not load incomplete exams.'},{status:503});
 return NextResponse.json({attempts:(data??[]).map((draft:any)=>({id:draft.attempt_id,name:draft.exam_attempts.exam_name||'Practice exam',mode:draft.exam_attempts.mode,questionCount:draft.exam_attempts.question_count,updatedAt:draft.updated_at,position:(draft.state?.index??0)+1}))},{headers:{'Cache-Control':'no-store'}});
}

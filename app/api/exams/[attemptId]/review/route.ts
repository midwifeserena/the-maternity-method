import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {completedReview,validExamId} from '@/lib/exam-review-server';

export async function GET(_request:NextRequest,{params}:{params:Promise<{attemptId:string}>}){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const {attemptId}=await params;if(!validExamId(attemptId))return NextResponse.json({error:'Exam not found'},{status:404});
 const result=await completedReview(db,user.id,attemptId);
 if(result.status===404)return NextResponse.json({error:'Exam not found'},{status:404});
 if(result.error)return NextResponse.json({error:'Could not load the saved exam. Please try again.'},{status:500});
 return NextResponse.json(result.data,{headers:{'Cache-Control':'no-store'}});
}

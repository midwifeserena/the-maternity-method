import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {mixedExamReady} from '@/lib/exam-review-server';
export async function GET(){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 return NextResponse.json({caseExams:await mixedExamReady()},{headers:{'Cache-Control':'no-store'}});
}

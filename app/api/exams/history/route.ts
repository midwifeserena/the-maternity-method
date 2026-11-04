import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {savedResponses,summarizeAttempt} from '@/lib/exam-review-server';

export async function GET(request:NextRequest){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const offset=Number(request.nextUrl.searchParams.get('offset')??0);
 if(!Number.isSafeInteger(offset)||offset<0)return NextResponse.json({error:'Invalid page'},{status:400});
 const {data,error}=await db.from('exam_attempts').select('*').eq('user_id',user.id).not('completed_at','is',null).order('completed_at',{ascending:false}).order('id').range(offset,offset+20);
 if(error)return NextResponse.json({error:'Could not load previous tests.'},{status:500});
 const page=(data??[]).slice(0,20),responses=await savedResponses(db,user.id,page.map(attempt=>attempt.id));
 if(responses.error)return NextResponse.json({error:'Could not load saved response information.'},{status:500});
 const grouped=new Map<string,typeof responses.data>();
 for(const row of responses.data){const list=grouped.get(row.attempt_id)??[];list.push(row);grouped.set(row.attempt_id,list)}
 return NextResponse.json({attempts:page.map(attempt=>summarizeAttempt(attempt,grouped.get(attempt.id)??[])),hasMore:(data?.length??0)>20,nextOffset:offset+page.length},{headers:{'Cache-Control':'no-store'}});
}
